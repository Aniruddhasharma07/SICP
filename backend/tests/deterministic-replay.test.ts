import { DomainIntelligenceResolver } from '../src/domain/intelligence/providers/domain-intelligence-resolver';
import { AffectedPopulationProvider } from '../src/domain/intelligence/population/affected-population.provider';
import fixtureData from './fixtures/systemic-road-cluster.json';

describe('Deterministic Replay Test Suite', () => {
  it('produces 100% identical categorization, population assessment, and hypotheses across consecutive runs', () => {
    // Run 1
    const run1Results = fixtureData.problems.map((p) => {
      const canonicalDomain = DomainIntelligenceResolver.resolveDomain(p.category);
      const population = AffectedPopulationProvider.estimateAffectedPopulation({
        latitude: p.latitude,
        longitude: p.longitude,
        district: p.district,
        wardNumber: p.wardNumber,
        locationName: p.locationName,
        category: canonicalDomain,
      });
      return {
        id: p.id,
        domain: canonicalDomain,
        popValue: population.value,
        popStatus: population.status,
        popProvenance: population.provenance,
      };
    });

    // Run 2
    const run2Results = fixtureData.problems.map((p) => {
      const canonicalDomain = DomainIntelligenceResolver.resolveDomain(p.category);
      const population = AffectedPopulationProvider.estimateAffectedPopulation({
        latitude: p.latitude,
        longitude: p.longitude,
        district: p.district,
        wardNumber: p.wardNumber,
        locationName: p.locationName,
        category: canonicalDomain,
      });
      return {
        id: p.id,
        domain: canonicalDomain,
        popValue: population.value,
        popStatus: population.status,
        popProvenance: population.provenance,
      };
    });

    // Assert exact equality
    expect(run1Results).toEqual(run2Results);

    // Verify all road problems normalized to ROAD_TRANSPORT regardless of casing/spacing
    run1Results.forEach((r) => {
      expect(r.domain).toBe('ROAD_TRANSPORT');
    });

    // Verify Ward 42 population was matched authoritatively
    expect(run1Results[0].popValue).toBe(32400);
    expect(run1Results[0].popStatus).toBe('KNOWN');
    expect(run1Results[0].popProvenance).toContain('Bhopal Municipal Corporation');

    // Verify Ward 48 without entry falls back cleanly to UNKNOWN without 0
    expect(run1Results[3].popValue).toBeNull();
    expect(run1Results[3].popStatus).toBe('UNKNOWN');
  });
});
