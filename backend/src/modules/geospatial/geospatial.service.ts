import { prisma } from '../../database/prisma';
import { SeverityLevel, ChallengeStatus, ReverseGeocodeResultDto } from '@sicp/shared';

export interface GeoFilterInput {
  category?: string;
  severity?: string;
  status?: string;
  district?: string;
  state?: string;
  limit?: number;
}

export interface GeoPoint {
  id: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  latitude: number;
  longitude: number;
  district?: string | null;
  state?: string | null;
  affectedPopulation?: number | null;
  isSystemic: boolean;
}

export interface GeoCluster {
  district: string;
  state: string;
  challengeCount: number;
  systemicCount: number;
  totalAffectedPopulation: number;
  topCategory: string;
  severityBreakdown: Record<string, number>;
  representativeCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

export class GeospatialService {
  public static async getPoints(filters: GeoFilterInput): Promise<{ points: GeoPoint[]; total: number }> {
    const where: any = {
      deletedAt: null,
      latitude: { not: null },
      longitude: { not: null },
    };

    if (filters.category) {
      where.category = { contains: filters.category, mode: 'insensitive' };
    }
    if (filters.severity && Object.values(SeverityLevel).includes(filters.severity as SeverityLevel)) {
      where.severity = filters.severity as SeverityLevel;
    }
    if (filters.status && Object.values(ChallengeStatus).includes(filters.status as ChallengeStatus)) {
      where.status = filters.status as ChallengeStatus;
    }
    if (filters.district) {
      where.district = { contains: filters.district, mode: 'insensitive' };
    }
    if (filters.state) {
      where.state = { contains: filters.state, mode: 'insensitive' };
    }

    const limit = Math.min(Number(filters.limit) || 200, 500);

    const challenges = await prisma.challenge.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        category: true,
        severity: true,
        status: true,
        latitude: true,
        longitude: true,
        district: true,
        state: true,
        affectedPopulation: true,
        isSystemic: true,
      },
    });

    const points: GeoPoint[] = challenges
      .filter((c) => c.latitude !== null && c.longitude !== null)
      .map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        severity: c.severity,
        status: c.status,
        latitude: c.latitude as number,
        longitude: c.longitude as number,
        district: c.district,
        state: c.state,
        affectedPopulation: c.affectedPopulation,
        isSystemic: c.isSystemic,
      }));

    return {
      points,
      total: points.length,
    };
  }

  public static async getClusters(filters: GeoFilterInput): Promise<{ clusters: GeoCluster[]; totalDistricts: number }> {
    const where: any = {
      deletedAt: null,
      district: { not: null },
    };

    if (filters.category) {
      where.category = { contains: filters.category, mode: 'insensitive' };
    }
    if (filters.severity && Object.values(SeverityLevel).includes(filters.severity as SeverityLevel)) {
      where.severity = filters.severity as SeverityLevel;
    }
    if (filters.status && Object.values(ChallengeStatus).includes(filters.status as ChallengeStatus)) {
      where.status = filters.status as ChallengeStatus;
    }
    if (filters.district) {
      where.district = { contains: filters.district, mode: 'insensitive' };
    }
    if (filters.state) {
      where.state = { contains: filters.state, mode: 'insensitive' };
    }

    const challenges = await prisma.challenge.findMany({
      where,
      select: {
        district: true,
        state: true,
        category: true,
        severity: true,
        affectedPopulation: true,
        isSystemic: true,
        latitude: true,
        longitude: true,
      },
    });

    const clusterMap = new Map<string, {
      district: string;
      state: string;
      challengeCount: number;
      systemicCount: number;
      totalAffectedPopulation: number;
      categoryCounts: Map<string, number>;
      severityCounts: Record<string, number>;
      latitudes: number[];
      longitudes: number[];
    }>();

    for (const c of challenges) {
      const districtKey = `${c.district?.trim().toLowerCase()}_${c.state?.trim().toLowerCase() || ''}`;
      let cluster = clusterMap.get(districtKey);
      if (!cluster) {
        cluster = {
          district: c.district || 'Unknown',
          state: c.state || 'Unknown',
          challengeCount: 0,
          systemicCount: 0,
          totalAffectedPopulation: 0,
          categoryCounts: new Map<string, number>(),
          severityCounts: {},
          latitudes: [],
          longitudes: [],
        };
        clusterMap.set(districtKey, cluster);
      }

      cluster.challengeCount += 1;
      if (c.isSystemic) cluster.systemicCount += 1;
      if (c.affectedPopulation) cluster.totalAffectedPopulation += c.affectedPopulation;

      cluster.severityCounts[c.severity] = (cluster.severityCounts[c.severity] || 0) + 1;
      cluster.categoryCounts.set(c.category, (cluster.categoryCounts.get(c.category) || 0) + 1);

      if (c.latitude !== null && c.longitude !== null) {
        cluster.latitudes.push(c.latitude);
        cluster.longitudes.push(c.longitude);
      }
    }

    const clusters: GeoCluster[] = Array.from(clusterMap.values()).map((cl) => {
      let topCategory = 'Civic Infrastructure';
      let maxCategoryCount = 0;
      for (const [cat, cnt] of cl.categoryCounts.entries()) {
        if (cnt > maxCategoryCount) {
          maxCategoryCount = cnt;
          topCategory = cat;
        }
      }

      let representativeCoordinates: { latitude: number; longitude: number } | undefined;
      if (cl.latitudes.length > 0) {
        const avgLat = cl.latitudes.reduce((a, b) => a + b, 0) / cl.latitudes.length;
        const avgLng = cl.longitudes.reduce((a, b) => a + b, 0) / cl.longitudes.length;
        representativeCoordinates = { latitude: avgLat, longitude: avgLng };
      }

      return {
        district: cl.district,
        state: cl.state,
        challengeCount: cl.challengeCount,
        systemicCount: cl.systemicCount,
        totalAffectedPopulation: cl.totalAffectedPopulation,
        topCategory,
        severityBreakdown: cl.severityCounts,
        representativeCoordinates,
      };
    });

    clusters.sort((a, b) => b.challengeCount - a.challengeCount);

    return {
      clusters,
      totalDistricts: clusters.length,
    };
  }

  /**
   * Reverse-geocodes latitude and longitude coordinates into administrative boundary info (district, state, locality)
   * using OpenStreetMap Nominatim with graceful fallback and strict timeout.
   */
  public static async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResultDto> {
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
      throw new Error('Valid numerical latitude and longitude are required');
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error('Latitude must be between -90 and 90, and longitude between -180 and 180');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SICP-Civic-Platform/1.0 (civic-support@sicp.gov.in)',
          'Accept': 'application/json',
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          latitude,
          longitude,
          district: null,
          state: null,
          locality: null,
          postcode: null,
          formattedAddress: null,
          resolved: false,
          message: `Reverse geocoding service returned status ${response.status}. Coordinates preserved.`,
        };
      }

      const data = (await response.json()) as any;
      const addr = data?.address || {};

      const district = addr.state_district || addr.district || addr.county || addr.city || addr.town || null;
      const state = addr.state || null;
      const locality = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city_district || addr.hamlet || null;
      const postcode = addr.postcode || null;
      const formattedAddress = data?.display_name || null;

      const cleanedDistrict = district ? district.replace(/\s+District$/i, '').trim() : null;
      const cleanedState = state ? state.trim() : null;

      return {
        latitude,
        longitude,
        district: cleanedDistrict,
        state: cleanedState,
        locality: locality ? locality.trim() : null,
        postcode: postcode ? postcode.trim() : null,
        formattedAddress,
        resolved: Boolean(cleanedDistrict || cleanedState),
        message: cleanedDistrict || cleanedState ? undefined : 'No administrative boundary resolved for coordinates. Coordinates preserved.',
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort = (err as Error)?.name === 'AbortError' || (err as Error)?.message?.includes('aborted');
      return {
        latitude,
        longitude,
        district: null,
        state: null,
        locality: null,
        postcode: null,
        formattedAddress: null,
        resolved: false,
        message: isAbort
          ? 'Reverse geocoding lookup timed out (3.5s). Coordinates preserved.'
          : `Reverse geocoding lookup unavailable (${(err as Error)?.message || 'network error'}). Coordinates preserved.`,
      };
    }
  }
}
