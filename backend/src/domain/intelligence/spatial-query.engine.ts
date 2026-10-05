import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { logger } from '../../utils/logger';

export interface DomainSpatialPolicy {
  immediateRadiusMeters: number;
  maxBoundaryMeters: number;
}

export const DOMAIN_SPATIAL_POLICIES: Record<string, DomainSpatialPolicy> = {
  // Sanitation & Drainage
  SANITATION: { immediateRadiusMeters: 100, maxBoundaryMeters: 800 },
  DRAINAGE: { immediateRadiusMeters: 100, maxBoundaryMeters: 800 },
  DRAINAGE_BLOCKAGE: { immediateRadiusMeters: 100, maxBoundaryMeters: 800 },
  SEWAGE: { immediateRadiusMeters: 100, maxBoundaryMeters: 800 },
  'SANITATION & DRAINAGE': { immediateRadiusMeters: 100, maxBoundaryMeters: 800 },

  // Roads & Transport
  ROADS: { immediateRadiusMeters: 50, maxBoundaryMeters: 300 },
  ROAD_TRANSPORT: { immediateRadiusMeters: 50, maxBoundaryMeters: 300 },
  ROAD_POTHOLE: { immediateRadiusMeters: 50, maxBoundaryMeters: 200 },
  ROADS_INFRASTRUCTURE: { immediateRadiusMeters: 50, maxBoundaryMeters: 300 },
  TRANSPORT: { immediateRadiusMeters: 100, maxBoundaryMeters: 1000 },
  STREETLIGHT: { immediateRadiusMeters: 25, maxBoundaryMeters: 75 },
  LIGHTING: { immediateRadiusMeters: 25, maxBoundaryMeters: 75 },

  // Water Supply
  WATER: { immediateRadiusMeters: 500, maxBoundaryMeters: 3000 },
  WATER_SUPPLY: { immediateRadiusMeters: 500, maxBoundaryMeters: 3000 },

  // Electricity & Power
  ELECTRICITY: { immediateRadiusMeters: 800, maxBoundaryMeters: 4000 },
  ELECTRICITY_NETWORK: { immediateRadiusMeters: 1000, maxBoundaryMeters: 5000 },
  POWER: { immediateRadiusMeters: 800, maxBoundaryMeters: 4000 },

  // Education
  EDUCATION: { immediateRadiusMeters: 200, maxBoundaryMeters: 1500 },
  'EDUCATION & SCHOOLS': { immediateRadiusMeters: 200, maxBoundaryMeters: 1500 },

  // Agriculture
  AGRICULTURE: { immediateRadiusMeters: 500, maxBoundaryMeters: 3000 },
  IRRIGATION: { immediateRadiusMeters: 2000, maxBoundaryMeters: 15000 },

  // Flood & Environment
  FLOOD_ENVIRONMENTAL: { immediateRadiusMeters: 300, maxBoundaryMeters: 2000 },
  ENVIRONMENT: { immediateRadiusMeters: 300, maxBoundaryMeters: 2000 },

  // Healthcare
  HEALTHCARE: { immediateRadiusMeters: 200, maxBoundaryMeters: 1500 },
  'HEALTHCARE & PUBLIC HEALTH': { immediateRadiusMeters: 200, maxBoundaryMeters: 1500 },

  // Generic civic default
  GENERIC: { immediateRadiusMeters: 200, maxBoundaryMeters: 1500 },
};

export interface FindNearbyProblemsOptions {
  latitude: number;
  longitude: number;
  category?: string;
  radiusMeters?: number;
  excludeProblemId?: string;
  limit?: number;
}

export interface NearbyProblemResult {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  groupId?: string | null;
  createdAt: Date;
  distanceMeters: number;
}

export class SpatialQueryEngine {
  private static postGisAvailable: boolean | null = null;

  /**
   * Resolve spatial configuration based on category
   */
  public static getPolicy(category?: string | null): DomainSpatialPolicy {
    if (!category) return DOMAIN_SPATIAL_POLICIES.GENERIC;
    const normalized = category.trim().toUpperCase().replace(/[\s-]+/g, '_');

    if (DOMAIN_SPATIAL_POLICIES[normalized]) {
      return DOMAIN_SPATIAL_POLICIES[normalized];
    }

    for (const [key, policy] of Object.entries(DOMAIN_SPATIAL_POLICIES)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return policy;
      }
    }

    return DOMAIN_SPATIAL_POLICIES.GENERIC;
  }

  /**
   * Pure in-memory Haversine formula returning geodesic distance in meters.
   * Coordinate parameters are strictly (lat1, lon1, lat2, lon2).
   */
  public static calculateDistanceMeters(
    lat1?: number | null,
    lon1?: number | null,
    lat2?: number | null,
    lon2?: number | null
  ): number | null {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
      return null;
    }

    if (lat1 === lat2 && lon1 === lon2) {
      return 0;
    }

    const R = 6371000; // Mean Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
    return Math.round(R * c * 10) / 10;
  }

  /**
   * Checks whether PostGIS extension is installed in the database.
   */
  public static async isPostGisAvailable(): Promise<boolean> {
    if (this.postGisAvailable !== null) {
      return this.postGisAvailable;
    }

    try {
      if (typeof (prisma as any).$queryRaw !== 'function') {
        this.postGisAvailable = false;
        return false;
      }
      const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1 FROM pg_extension WHERE extname = 'postgis'
        ) AS "exists";
      `;
      this.postGisAvailable = Boolean(result[0]?.exists);
    } catch {
      this.postGisAvailable = false;
    }

    return this.postGisAvailable;
  }

  /**
   * Reset cached PostGIS availability (primarily for test mock reset).
   */
  public static resetPostGisCache(): void {
    this.postGisAvailable = null;
  }

  /**
   * Find nearby problems using real PostGIS ST_DWithin if available,
   * or exact PostgreSQL geodesic SQL fallback with bounding box pre-filter.
   */
  public static async findNearbyProblems(
    options: FindNearbyProblemsOptions
  ): Promise<NearbyProblemResult[]> {
    const { latitude, longitude, category, excludeProblemId, limit = 20 } = options;

    // Validate coordinates
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return [];
    }

    const policy = this.getPolicy(category);
    const searchRadiusMeters = options.radiusMeters ?? policy.maxBoundaryMeters;

    const hasPostGis = await this.isPostGisAvailable();

    const excludeClause = excludeProblemId ? Prisma.sql`AND p.id != ${excludeProblemId}` : Prisma.empty;

    if (hasPostGis) {
      try {
        // PostGIS coordinates are (longitude, latitude)
        const rows = await prisma.$queryRaw<any[]>`
          SELECT p.id, p.code, p.title, p.description, p.category, p.latitude, p.longitude, p."groupId", p."createdAt",
                 ST_Distance(
                   ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
                   ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
                 ) AS "distanceMeters"
          FROM "Problem" p
          WHERE p.latitude IS NOT NULL
            AND p.longitude IS NOT NULL
            ${excludeClause}
            AND ST_DWithin(
              ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
              ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
              ${searchRadiusMeters}
            )
          ORDER BY "distanceMeters" ASC
          LIMIT ${limit};
        `;

        return (rows || []).map((r) => ({
          id: r.id,
          code: r.code,
          title: r.title,
          description: r.description,
          category: r.category,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          groupId: r.groupId ?? null,
          createdAt: new Date(r.createdAt),
          distanceMeters: Math.round(Number(r.distanceMeters) * 10) / 10,
        }));
      } catch (err) {
        logger.warn('PostGIS query failed, falling back to PostgreSQL geodesic SQL', {
          error: (err as Error).message,
        });
      }
    }

    // Provider 2: Exact PostgreSQL Geodesic SQL with bounding-box index filtering
    try {
      // 1 deg latitude ≈ 111,320m
      const latDelta = (searchRadiusMeters * 1.1) / 111320;
      const cosLat = Math.cos((latitude * Math.PI) / 180);
      const lonDelta = (searchRadiusMeters * 1.1) / (111320 * Math.max(0.01, Math.abs(cosLat)));

      const minLat = latitude - latDelta;
      const maxLat = latitude + latDelta;
      const minLon = longitude - lonDelta;
      const maxLon = longitude + lonDelta;

      if (typeof (prisma as any).$queryRaw === 'function') {
        const rows = await prisma.$queryRaw<any[]>`
          SELECT p.id, p.code, p.title, p.description, p.category, p.latitude, p.longitude, p."groupId", p."createdAt",
                 ROUND((6371000 * acos(
                   LEAST(1.0, GREATEST(-1.0,
                     cos(radians(${latitude})) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(${longitude})) +
                     sin(radians(${latitude})) * sin(radians(p.latitude))
                   ))
                 ))::numeric, 1)::float AS "distanceMeters"
          FROM "Problem" p
          WHERE p.latitude IS NOT NULL
            AND p.longitude IS NOT NULL
            AND p.latitude BETWEEN ${minLat} AND ${maxLat}
            AND p.longitude BETWEEN ${minLon} AND ${maxLon}
            ${excludeClause}
            AND (6371000 * acos(
                   LEAST(1.0, GREATEST(-1.0,
                     cos(radians(${latitude})) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(${longitude})) +
                     sin(radians(${latitude})) * sin(radians(p.latitude))
                   ))
                 )) <= ${searchRadiusMeters}
          ORDER BY "distanceMeters" ASC
          LIMIT ${limit};
        `;

        return rows.map((r) => ({
          id: r.id,
          code: r.code,
          title: r.title,
          description: r.description,
          category: r.category,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          groupId: r.groupId ?? null,
          createdAt: new Date(r.createdAt),
          distanceMeters: Math.round(Number(r.distanceMeters) * 10) / 10,
        }));
      }
    } catch (err) {
      logger.warn('PostgreSQL geodesic SQL failed, attempting in-memory candidate scan', {
        error: (err as Error).message,
      });
    }

    // In-memory fallback (when running inside Jest unit tests with mock prisma.problem.findMany)
    try {
      const candidates = await prisma.problem.findMany({
        where: {
          latitude: { not: null },
          longitude: { not: null },
          ...(excludeProblemId ? { id: { not: excludeProblemId } } : {}),
        },
        take: 100,
      });

      const matched: NearbyProblemResult[] = [];
      for (const cand of candidates) {
        if (cand.latitude == null || cand.longitude == null) continue;
        const dist = this.calculateDistanceMeters(latitude, longitude, cand.latitude, cand.longitude);
        if (dist !== null && dist <= searchRadiusMeters) {
          matched.push({
            id: cand.id,
            code: cand.code,
            title: cand.title,
            description: cand.description,
            category: cand.category,
            latitude: cand.latitude,
            longitude: cand.longitude,
            groupId: cand.groupId ?? null,
            createdAt: cand.createdAt,
            distanceMeters: dist,
          });
        }
      }

      return matched
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        .slice(0, limit);
    } catch {
      return [];
    }
  }
}
