import { SpatialQueryEngine, DOMAIN_SPATIAL_POLICIES } from '../src/domain/intelligence/spatial-query.engine';
import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    problem: {
      findMany: jest.fn(),
    },
  },
}));

describe('SpatialQueryEngine Unit & Integration Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SpatialQueryEngine.resetPostGisCache();
  });

  describe('Domain Spatial Policies & Thresholds', () => {
    it('returns correct policy for SANITATION domain', () => {
      const policy = SpatialQueryEngine.getPolicy('Sanitation & Drainage');
      expect(policy.immediateRadiusMeters).toBe(100);
      expect(policy.maxBoundaryMeters).toBe(800);
    });

    it('returns correct policy for ROADS domain', () => {
      const policy = SpatialQueryEngine.getPolicy('Roads & Transport');
      expect(policy.immediateRadiusMeters).toBe(50);
      expect(policy.maxBoundaryMeters).toBe(300);
    });

    it('returns correct policy for WATER domain', () => {
      const policy = SpatialQueryEngine.getPolicy('Water Supply');
      expect(policy.immediateRadiusMeters).toBe(500);
      expect(policy.maxBoundaryMeters).toBe(3000);
    });

    it('returns correct policy for ELECTRICITY domain', () => {
      const policy = SpatialQueryEngine.getPolicy('Electricity Network');
      expect(policy.immediateRadiusMeters).toBe(1000);
      expect(policy.maxBoundaryMeters).toBe(5000);
    });

    it('falls back to GENERIC policy for unmapped or null category', () => {
      const defaultPolicy = SpatialQueryEngine.getPolicy(null);
      expect(defaultPolicy.immediateRadiusMeters).toBe(DOMAIN_SPATIAL_POLICIES.GENERIC.immediateRadiusMeters);
      expect(defaultPolicy.maxBoundaryMeters).toBe(DOMAIN_SPATIAL_POLICIES.GENERIC.maxBoundaryMeters);
    });
  });

  describe('Pure In-Memory Geodesic Distance (Haversine)', () => {
    it('computes 0 meters for identical coordinates', () => {
      const dist = SpatialQueryEngine.calculateDistanceMeters(27.7925414, 77.4367904, 27.7925414, 77.4367904);
      expect(dist).toBe(0);
    });

    it('returns null if any coordinate is missing or null', () => {
      expect(SpatialQueryEngine.calculateDistanceMeters(null, 77.43, 27.79, 77.43)).toBeNull();
      expect(SpatialQueryEngine.calculateDistanceMeters(27.79, null, 27.79, 77.43)).toBeNull();
      expect(SpatialQueryEngine.calculateDistanceMeters(27.79, 77.43, undefined, 77.43)).toBeNull();
      expect(SpatialQueryEngine.calculateDistanceMeters(27.79, 77.43, 27.79, undefined)).toBeNull();
    });

    it('correctly calculates immediate proximity (<10m) between Mathura sanitation problems', () => {
      // Mathura Problem 1: 27.7925414, 77.4367904
      // Mathura Problem 2 nearby: 27.7926000, 77.4368500
      const dist = SpatialQueryEngine.calculateDistanceMeters(27.7925414, 77.4367904, 27.7926, 77.43685);
      expect(dist).toBeDefined();
      expect(dist!).toBeGreaterThan(5);
      expect(dist!).toBeLessThan(15); // ~8.8m
    });

    it('correctly calculates distant problem in same district (~26km) as exceeding boundary', () => {
      // Mathura Problem 1: 27.7925414, 77.4367904
      // Mathura Problem distant: 27.60397, 77.59871
      const dist = SpatialQueryEngine.calculateDistanceMeters(27.7925414, 77.4367904, 27.60397, 77.59871);
      expect(dist).toBeDefined();
      expect(dist!).toBeGreaterThan(25000); // > 25 km
    });

    it('is strictly commutative: dist(A, B) === dist(B, A)', () => {
      const d1 = SpatialQueryEngine.calculateDistanceMeters(28.6139, 77.209, 19.076, 72.8777); // Delhi -> Mumbai
      const d2 = SpatialQueryEngine.calculateDistanceMeters(19.076, 72.8777, 28.6139, 77.209); // Mumbai -> Delhi
      expect(d1).toBe(d2);
      expect(d1).toBeGreaterThan(1100000); // ~1148 km
      expect(d1).toBeLessThan(1200000);
    });
  });

  describe('findNearbyProblems Query Generation & Validation', () => {
    it('returns empty array for invalid coordinate boundaries', async () => {
      // Latitude > 90
      const invalidLat = await SpatialQueryEngine.findNearbyProblems({
        latitude: 95.0,
        longitude: 77.43,
      });
      expect(invalidLat).toEqual([]);

      // Longitude < -180
      const invalidLon = await SpatialQueryEngine.findNearbyProblems({
        latitude: 27.79,
        longitude: -195.0,
      });
      expect(invalidLon).toEqual([]);

      // NaN
      const nanCoord = await SpatialQueryEngine.findNearbyProblems({
        latitude: NaN,
        longitude: 77.43,
      });
      expect(nanCoord).toEqual([]);
    });

    it('queries PostGIS ST_DWithin with (longitude, latitude) point construction when PostGIS is available', async () => {
      // Mock PostGIS existence
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([{ exists: true }]) // isPostGisAvailable
        .mockResolvedValueOnce([
          {
            id: 'prob-p1',
            code: 'PRB-2026-4776',
            title: 'drainage issue in my locality',
            description: 'Water accumulation',
            category: 'Sanitation & Drainage',
            latitude: 27.7925414,
            longitude: 77.4367904,
            groupId: 'grp-1',
            createdAt: new Date(),
            distanceMeters: 8.5,
          },
        ]);

      const results = await SpatialQueryEngine.findNearbyProblems({
        latitude: 27.7926,
        longitude: 77.43685,
        category: 'Sanitation & Drainage',
      });

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('prob-p1');
      expect(results[0].distanceMeters).toBe(8.5);
    });

    it('falls back to PostgreSQL Geodesic SQL formula when PostGIS is not available', async () => {
      // Mock PostGIS absent
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([{ exists: false }]) // isPostGisAvailable returns false
        .mockResolvedValueOnce([
          {
            id: 'prob-p2',
            code: 'PRB-2026-9857',
            title: 'gutter overflow',
            description: 'Drain overflow on street',
            category: 'Sanitation & Drainage',
            latitude: 27.7925414,
            longitude: 77.4367904,
            groupId: 'grp-1',
            createdAt: new Date(),
            distanceMeters: 8.5,
          },
        ]);

      const results = await SpatialQueryEngine.findNearbyProblems({
        latitude: 27.7926,
        longitude: 77.43685,
        category: 'Sanitation & Drainage',
      });

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('prob-p2');
      expect(results[0].distanceMeters).toBe(8.5);
    });
  });
});
