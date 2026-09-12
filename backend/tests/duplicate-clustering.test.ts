import { DuplicateClusteringService } from '../src/domain/intelligence/duplicate-clustering.service';
import { RelationshipType } from '@sicp/shared';

describe('DuplicateClusteringService - Spatial & Semantic Reasoning', () => {
  it('accurately calculates Haversine distance in kilometers', () => {
    // Connaught Place to India Gate in New Delhi (~2.4 km)
    const dist = DuplicateClusteringService.calculateDistanceKm(28.6315, 77.2167, 28.6129, 77.2295);
    expect(dist).not.toBeNull();
    expect(dist!).toBeGreaterThan(1.8);
    expect(dist!).toBeLessThan(3.0);
  });

  it('rejects merging challenges across different states regardless of similarity', () => {
    const candidate = DuplicateClusteringService.evaluateRelationship(
      {
        title: 'Broken water pipeline leaking clean water',
        description: 'Major drinking water pipeline broken on main road',
        category: 'Water',
        district: 'Varanasi',
        state: 'Uttar Pradesh',
        latitude: 25.3176,
        longitude: 82.9739,
      },
      {
        id: 'chal-karnataka-1',
        title: 'Broken water pipeline leaking clean water',
        description: 'Major drinking water pipeline broken on main road',
        category: 'Water',
        district: 'Bengaluru Urban',
        state: 'Karnataka',
        latitude: 12.9716,
        longitude: 77.5946,
      }
    );

    expect(candidate.recommendedRelation).toBe(RelationshipType.SAME_ROOT_CAUSE);
    expect(candidate.overallScore).toBeLessThanOrEqual(0.25);
    expect(candidate.reasoning).toContain('Different states');
  });

  it('identifies immediate geographic proximity (<0.5km) as strong duplicate candidate', () => {
    const candidate = DuplicateClusteringService.evaluateRelationship(
      {
        title: 'Contaminated tap water with black sediments in Sector 4',
        description: 'Residents falling ill due to polluted tap water since Monday',
        category: 'Water',
        district: 'Gurugram',
        state: 'Haryana',
        latitude: 28.4595,
        longitude: 77.0266,
      },
      {
        id: 'chal-gurugram-2',
        title: 'Black dirty drinking water in Sector 4 houses',
        description: 'Tap water is dark and dirty causing illness in neighborhood',
        category: 'Water',
        district: 'Gurugram',
        state: 'Haryana',
        latitude: 28.4601, // ~100 meters away
        longitude: 77.0270,
      }
    );

    expect(candidate.recommendedRelation).toBe(RelationshipType.DUPLICATE);
    expect(candidate.overallScore).toBeGreaterThanOrEqual(0.85);
    expect(candidate.reasoning).toContain('proximity');
  });

  it('identifies same district cluster as systemic child candidate', () => {
    const candidate = DuplicateClusteringService.evaluateRelationship(
      {
        title: 'Sewage overflow near government school',
        description: 'Drain blockage causing severe sewage overflow on primary road',
        category: 'Sanitation',
        district: 'Patna',
        state: 'Bihar',
        latitude: 25.5941,
        longitude: 85.1376,
      },
      {
        id: 'chal-patna-2',
        title: 'Drainage blockage causing flooding in market',
        description: 'Sewage overflowing into commercial market street',
        category: 'Sanitation',
        district: 'Patna',
        state: 'Bihar',
        latitude: 25.6020, // ~1.5 km away in same district
        longitude: 85.1420,
      }
    );

    expect(candidate.recommendedRelation).toBe(RelationshipType.SYSTEMIC_CHILD);
    expect(candidate.overallScore).toBeGreaterThanOrEqual(0.60);
  });
});
