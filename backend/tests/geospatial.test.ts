import { GeospatialService } from '../src/modules/geospatial/geospatial.service';
import { SeverityLevel, ChallengeStatus } from '@sicp/shared';
import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    challenge: {
      findMany: jest.fn(),
    },
  },
}));

describe('GeospatialService - Coordinate Points & District Hotspots', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retrieves geocoded challenge points with coordinates', async () => {
    (prisma.challenge.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'c-geo-1',
        title: 'Water logging at junction',
        category: 'Drainage',
        severity: SeverityLevel.MODERATE,
        status: ChallengeStatus.APPROVED,
        latitude: 18.5204,
        longitude: 73.8567,
        district: 'Pune',
        state: 'Maharashtra',
        affectedPopulation: 4500,
        isSystemic: false,
      },
      {
        id: 'c-geo-2',
        title: 'Arsenic contamination',
        category: 'Water',
        severity: SeverityLevel.CATASTROPHIC,
        status: ChallengeStatus.IN_RESEARCH,
        latitude: 25.5941,
        longitude: 85.1376,
        district: 'Patna',
        state: 'Bihar',
        affectedPopulation: 35000,
        isSystemic: true,
      },
    ]);

    const res = await GeospatialService.getPoints({ category: 'Water' });

    expect(res.total).toBe(2);
    expect(res.points[0].latitude).toBe(18.5204);
    expect(res.points[1].isSystemic).toBe(true);
  });

  it('aggregates district clusters with affected population and severity breakdowns', async () => {
    (prisma.challenge.findMany as jest.Mock).mockResolvedValue([
      {
        district: 'Nagaur',
        state: 'Rajasthan',
        category: 'Water',
        severity: 'SEVERE',
        affectedPopulation: 12000,
        isSystemic: true,
        latitude: 27.2,
        longitude: 73.7,
      },
      {
        district: 'Nagaur',
        state: 'Rajasthan',
        category: 'Water',
        severity: 'CATASTROPHIC',
        affectedPopulation: 18000,
        isSystemic: true,
        latitude: 27.25,
        longitude: 73.75,
      },
      {
        district: 'Pune',
        state: 'Maharashtra',
        category: 'Transport',
        severity: 'MODERATE',
        affectedPopulation: 5000,
        isSystemic: false,
        latitude: 18.5,
        longitude: 73.8,
      },
    ]);

    const res = await GeospatialService.getClusters({});

    expect(res.totalDistricts).toBe(2);
    const nagaurCluster = res.clusters.find((c) => c.district === 'Nagaur');
    expect(nagaurCluster).toBeDefined();
    expect(nagaurCluster?.challengeCount).toBe(2);
    expect(nagaurCluster?.systemicCount).toBe(2);
    expect(nagaurCluster?.totalAffectedPopulation).toBe(30000);
    expect(nagaurCluster?.topCategory).toBe('Water');
    expect(nagaurCluster?.representativeCoordinates).toBeDefined();
  });

  describe('reverseGeocode', () => {
    it('successfully extracts district, state and locality from geocoder response', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          display_name: 'Shivajinagar, Pune, Maharashtra, 411005, India',
          address: {
            state_district: 'Pune District',
            state: 'Maharashtra',
            suburb: 'Shivajinagar',
            postcode: '411005',
          },
        }),
      };

      const globalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue(mockResponse as any);

      try {
        const result = await GeospatialService.reverseGeocode(18.5204, 73.8567);
        expect(result.resolved).toBe(true);
        expect(result.district).toBe('Pune');
        expect(result.state).toBe('Maharashtra');
        expect(result.locality).toBe('Shivajinagar');
        expect(result.postcode).toBe('411005');
        expect(result.formattedAddress).toContain('Shivajinagar');
      } finally {
        global.fetch = globalFetch;
      }
    });

    it('gracefully degrades when geocoding network request fails', async () => {
      const globalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network connection timeout'));

      try {
        const result = await GeospatialService.reverseGeocode(18.5204, 73.8567);
        expect(result.resolved).toBe(false);
        expect(result.latitude).toBe(18.5204);
        expect(result.longitude).toBe(73.8567);
        expect(result.district).toBeNull();
        expect(result.message).toContain('Reverse geocoding lookup unavailable');
      } finally {
        global.fetch = globalFetch;
      }
    });

    it('throws error for invalid latitude and longitude values', async () => {
      await expect(GeospatialService.reverseGeocode(999, 73.8567)).rejects.toThrow(
        'Latitude must be between -90 and 90, and longitude between -180 and 180'
      );
      await expect(GeospatialService.reverseGeocode(NaN, 73.8567)).rejects.toThrow(
        'Valid numerical latitude and longitude are required'
      );
    });
  });
});
