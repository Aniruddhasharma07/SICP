import { DomainIntelligenceProviderFactory } from '../src/domain/intelligence/providers/domain-intelligence.factory';
import { RoadIntelligenceProvider } from '../src/domain/intelligence/providers/road-intelligence.provider';
import { WaterIntelligenceProvider } from '../src/domain/intelligence/providers/water-intelligence.provider';
import { ElectricityIntelligenceProvider } from '../src/domain/intelligence/providers/electricity-intelligence.provider';
import { GenericIntelligenceProvider } from '../src/domain/intelligence/providers/generic-intelligence.provider';
import { resolveProblemTab, VALID_PROBLEM_TABS } from '@sicp/shared';

describe('Domain-Aware Intelligence Routing & Protection', () => {
  it('correctly maps road and transport issues to RoadIntelligenceProvider', () => {
    const provider1 = DomainIntelligenceProviderFactory.getProvider('ROADS_TRANSPORT');
    const provider2 = DomainIntelligenceProviderFactory.getProvider('Severe Pothole on Bypass');
    expect(provider1).toBeInstanceOf(RoadIntelligenceProvider);
    expect(provider2).toBeInstanceOf(RoadIntelligenceProvider);
  });

  it('correctly maps water and contamination issues to WaterIntelligenceProvider', () => {
    const provider1 = DomainIntelligenceProviderFactory.getProvider('WATER_SUPPLY');
    const provider2 = DomainIntelligenceProviderFactory.getProvider('Pipeline leakage with contaminated odor');
    expect(provider1).toBeInstanceOf(WaterIntelligenceProvider);
    expect(provider2).toBeInstanceOf(WaterIntelligenceProvider);
  });

  it('correctly maps electrical issues to ElectricityIntelligenceProvider', () => {
    const provider1 = DomainIntelligenceProviderFactory.getProvider('PUBLIC_LIGHTING_ENERGY');
    const provider2 = DomainIntelligenceProviderFactory.getProvider('Transformer spark and street light outage');
    expect(provider1).toBeInstanceOf(ElectricityIntelligenceProvider);
    expect(provider2).toBeInstanceOf(ElectricityIntelligenceProvider);
  });

  it('falls back to GenericIntelligenceProvider for unknown or unclassified sectors', () => {
    const provider = DomainIntelligenceProviderFactory.getProvider('NOISE_POLLUTION');
    expect(provider).toBeInstanceOf(GenericIntelligenceProvider);
  });

  it('guarantees Road Intelligence never contains water or hydraulic failure causes', async () => {
    const roadProvider = new RoadIntelligenceProvider();
    const challenge = {
      id: 'test-road-chal-1',
      title: 'Pothole on Ring Road',
      description: 'Major asphalt crater damaged during heavy monsoon rains.',
      category: 'ROADS_TRANSPORT',
      district: 'Mathura',
      state: 'Uttar Pradesh',
      severity: 'MODERATE',
      createdAt: new Date(),
    };

    const analysis = await roadProvider.analyze(challenge);
    expect(analysis.category).toBe('Road & Transport');
    expect(analysis.domain).toBe('ROAD_TRANSPORT');

    // Verify possible causes are road-grounded, not water
    const allTitles = analysis.possibleCauses.map((c) => c.title.toLowerCase()).join(' ');
    const allDescs = analysis.possibleCauses.map((c) => c.description.toLowerCase()).join(' ');
    const combined = `${allTitles} ${allDescs}`;

    expect(combined).not.toContain('hydraulic');
    expect(combined).not.toContain('pipe');
    expect(combined).not.toContain('pump');
    expect(combined).not.toContain('valve');
    expect(combined).not.toContain('feeder leakage');
    expect(combined).toContain('asphalt');
    expect(combined).toContain('sub-base');

    // Status invariant: Requires field verification
    for (const cause of analysis.possibleCauses) {
      expect(cause.status).toBe('Requires field verification');
    }
  });

  it('returns UNAVAILABLE topology honestly when municipal GIS records do not exist', async () => {
    const roadProvider = new RoadIntelligenceProvider();
    const techData = await roadProvider.getTechnicalData({
      id: 'test-road-chal-2',
      category: 'ROADS_TRANSPORT',
      district: 'NonExistentDistrict',
    });

    expect(techData.topology.status).toBe('UNAVAILABLE');
    expect(techData.topology.nodes).toHaveLength(0);
    expect(techData.lcaExplanation).toContain('Shared upstream corridor dependency analysis');
  });

  it('guarantees Water Intelligence returns hydraulic hypotheses with proper verification status', async () => {
    const waterProvider = new WaterIntelligenceProvider();
    const challenge = {
      id: 'test-water-real-1',
      title: 'Low water pressure in Ward 5',
      description: 'Water barely trickles from taps during morning supply cycle.',
      category: 'WATER',
      district: 'Jaipur',
      state: 'Rajasthan',
      severity: 'MODERATE',
      createdAt: new Date(),
    };

    const analysis = await waterProvider.analyze(challenge);
    expect(analysis.category).toBe('Water & Sanitation');
    expect(analysis.domain).toBe('WATER_SUPPLY');

    const titles = analysis.possibleCauses.map((c) => c.title);
    expect(titles).toContain('Feeder line pressure loss or localized seal failure');

    for (const cause of analysis.possibleCauses) {
      expect(cause.status).toBe('Requires field verification');
    }
  });

  it('guarantees Water Intelligence never contains road, asphalt, or pavement failure causes (two-way leak prevention)', async () => {
    const waterProvider = new WaterIntelligenceProvider();
    const challenge = {
      id: 'test-water-real-2',
      title: 'Water pipe leakage causing puddle',
      description: 'Underground main line leak bubbling up to surface.',
      category: 'WATER_SUPPLY',
      district: 'Jaipur',
      state: 'Rajasthan',
      severity: 'MODERATE',
      createdAt: new Date(),
    };

    const analysis = await waterProvider.analyze(challenge);
    expect(analysis.category).toBe('Water & Sanitation');
    expect(analysis.domain).toBe('WATER_SUPPLY');

    const allTitles = analysis.possibleCauses.map((c) => c.title.toLowerCase()).join(' ');
    const allDescs = analysis.possibleCauses.map((c) => c.description.toLowerCase()).join(' ');
    const combined = `${allTitles} ${allDescs}`;

    expect(combined).not.toContain('asphalt');
    expect(combined).not.toContain('pothole');
    expect(combined).not.toContain('bituminous');
    expect(combined).not.toContain('sub-base');
    expect(combined).not.toContain('wearing course');
    expect(combined).toContain('pressure');
    expect(combined).toContain('pipe');
  });

  describe('Canonical Domain Resolution & Normalization', () => {
    const { DomainIntelligenceResolver } = require('../src/domain/intelligence/providers/domain-intelligence-resolver');

    it('resolves legacy and informal road strings to ROAD_TRANSPORT', () => {
      expect(DomainIntelligenceResolver.resolveDomain('Roads & Transport')).toBe('ROAD_TRANSPORT');
      expect(DomainIntelligenceResolver.resolveDomain('ROADS')).toBe('ROAD_TRANSPORT');
      expect(DomainIntelligenceResolver.resolveDomain('ROADS_INFRASTRUCTURE')).toBe('ROAD_TRANSPORT');
      expect(DomainIntelligenceResolver.resolveDomain('ROADS_TRANSPORT')).toBe('ROAD_TRANSPORT');
      expect(DomainIntelligenceResolver.resolveDomain('NH Highway')).toBe('ROAD_TRANSPORT');
      expect(DomainIntelligenceResolver.resolveDomain('NH Highway Pothole')).toBe('ROAD_TRANSPORT');
      expect(DomainIntelligenceResolver.resolveDomain('Damaged asphalt pavement on Ring Road')).toBe('ROAD_TRANSPORT');
      expect(DomainIntelligenceResolver.resolveDomain('Bridge expansion joint failure')).toBe('ROAD_TRANSPORT');
    });

    it('resolves water and pipeline strings to WATER_SUPPLY', () => {
      expect(DomainIntelligenceResolver.resolveDomain('Water')).toBe('WATER_SUPPLY');
      expect(DomainIntelligenceResolver.resolveDomain('Water Supply')).toBe('WATER_SUPPLY');
      expect(DomainIntelligenceResolver.resolveDomain('WATER_SUPPLY')).toBe('WATER_SUPPLY');
      expect(DomainIntelligenceResolver.resolveDomain('WATER_SANITATION')).toBe('WATER_SUPPLY');
      expect(DomainIntelligenceResolver.resolveDomain('Water Sanitation')).toBe('WATER_SUPPLY');
      expect(DomainIntelligenceResolver.resolveDomain('Jal pipeline')).toBe('WATER_SUPPLY');
      expect(DomainIntelligenceResolver.resolveDomain('Drinking water contamination odor')).toBe('WATER_SUPPLY');
      expect(DomainIntelligenceResolver.resolveDomain('Hydraulic pressure drop')).toBe('WATER_SUPPLY');
    });

    it('resolves electrical and power strings to ELECTRICITY', () => {
      expect(DomainIntelligenceResolver.resolveDomain('Electric Power')).toBe('ELECTRICITY');
      expect(DomainIntelligenceResolver.resolveDomain('POWER_GRID')).toBe('ELECTRICITY');
      expect(DomainIntelligenceResolver.resolveDomain('Electricity')).toBe('ELECTRICITY');
      expect(DomainIntelligenceResolver.resolveDomain('Transformer spark and blackout')).toBe('ELECTRICITY');
      expect(DomainIntelligenceResolver.resolveDomain('DISCOM power grid failure')).toBe('ELECTRICITY');
      expect(DomainIntelligenceResolver.resolveDomain('Substation high voltage wire snap')).toBe('ELECTRICITY');
    });

    it('resolves drainage and sewer strings to SANITATION', () => {
      expect(DomainIntelligenceResolver.resolveDomain('Sanitation')).toBe('SANITATION');
      expect(DomainIntelligenceResolver.resolveDomain('Open sewer drainage overflow')).toBe('SANITATION');
      expect(DomainIntelligenceResolver.resolveDomain('Blocked culvert sewage backflow')).toBe('SANITATION');
    });

    it('falls back to GENERIC for unmapped strings', () => {
      expect(DomainIntelligenceResolver.resolveDomain('Unknown category')).toBe('GENERIC');
      expect(DomainIntelligenceResolver.resolveDomain('Civic issue')).toBe('GENERIC');
      expect(DomainIntelligenceResolver.resolveDomain(null)).toBe('GENERIC');
      expect(DomainIntelligenceResolver.resolveDomain(undefined)).toBe('GENERIC');
      expect(DomainIntelligenceResolver.resolveDomain('')).toBe('GENERIC');
    });
  });

  describe('Tab State Routing & URL Synchronization (resolveProblemTab)', () => {
    it('defaults to ground-truth when query param is absent, null or empty', () => {
      expect(resolveProblemTab(undefined)).toBe('ground-truth');
      expect(resolveProblemTab(null)).toBe('ground-truth');
      expect(resolveProblemTab('')).toBe('ground-truth');
    });

    it('resolves valid tab query parameters to their canonical ProblemTabId', () => {
      expect(resolveProblemTab('ground-truth')).toBe('ground-truth');
      expect(resolveProblemTab('investigation')).toBe('investigation');
      expect(resolveProblemTab('solution-memory')).toBe('solution-memory');
      expect(resolveProblemTab('collaboration')).toBe('collaboration');
      expect(resolveProblemTab('governance')).toBe('governance');
    });

    it('falls back cleanly to ground-truth for invalid or malicious tab values', () => {
      expect(resolveProblemTab('random')).toBe('ground-truth');
      expect(resolveProblemTab('xyz')).toBe('ground-truth');
      expect(resolveProblemTab('../malicious')).toBe('ground-truth');
      expect(resolveProblemTab('INVESTIGATION')).toBe('ground-truth');
    });

    it('exposes exactly 5 valid problem tabs in VALID_PROBLEM_TABS', () => {
      expect(VALID_PROBLEM_TABS).toEqual([
        'ground-truth',
        'investigation',
        'solution-memory',
        'collaboration',
        'governance',
      ]);
    });
  });
});

