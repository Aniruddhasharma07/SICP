import { SolutionRetrievalEngine } from '../src/domain/intelligence/solution-retrieval.engine';
import {
  ReusabilityClass,
  EvidenceLevel,
  MemoryOutcomeStatus,
  SolutionMemoryStatus,
  UserRole,
} from '@sicp/shared';
import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    solutionMemory: {
      findMany: jest.fn(),
    },
  },
}));

describe('SolutionRetrievalEngine - Explainable 5-Factor Hybrid Scoring & Comparison', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates explainable 5-factor hybrid score with breakdown for high relevance match', async () => {
    (prisma.solutionMemory.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'mem-water-1',
        title: 'Community Gravity-Fed Ultrafiltration System',
        summary: 'Decentralized multi-stage membrane filtration for mountain surface runoff.',
        challengeCategory: 'WATER_SUPPLY',
        problemType: 'WATER_SUPPLY',
        problemSummary: 'High turbidity and bacterial contamination during monsoon surface water intake',
        rootCause: 'Monsoon silt runoff and bacterial pathogens in unpaved catchment basin',
        technicalApproach: 'Gravity-fed hollow-fiber ultrafiltration module with automatic hydraulic backwash',
        outcomeStatus: MemoryOutcomeStatus.SUCCESSFUL,
        evidenceLevel: EvidenceLevel.VERIFIED,
        reusabilityClass: ReusabilityClass.HIGHLY_REUSABLE,
        reusabilityScore: 90,
        status: SolutionMemoryStatus.PUBLISHED,
        whatWorked: 'Achieved 99.9% coliform removal and operates entirely without electrical grid connection.',
        whatFailed: 'Sediment pre-strainer required bi-weekly flushing to maintain design flux.',
        futureWarnings: 'Install dual sedimentation chambers when influent raw NTU exceeds 150.',
        constraints: 'Minimum 5 meter hydraulic head required; non-freezing climate',
        tags: ['WATER_SUPPLY', 'filtration', 'gravity'],
        locationContext: {
          latitude: 30.3165,
          longitude: 78.0322,
          district: 'Dehradun',
          state: 'Uttarakhand',
        },
        challenge: {
          latitude: 30.3165,
          longitude: 78.0322,
          district: 'Dehradun',
          state: 'Uttarakhand',
        },
        project: { id: 'proj-uf-1', title: 'Mountain Water Project' },
      },
    ]);

    const results = await SolutionRetrievalEngine.retrieveRelevantSolutions({
      title: 'Monsoon turbidity in mountain surface water intake',
      description: 'Mountain stream has high silt runoff and bacterial pathogens contaminating village pipeline.',
      category: 'WATER_SUPPLY',
      problemType: 'WATER_SUPPLY',
      rootCause: 'Monsoon silt runoff and bacterial pathogens',
      latitude: 30.3200,
      longitude: 78.0350,
      district: 'Dehradun',
      state: 'Uttarakhand',
      tags: ['WATER_SUPPLY', 'filtration'],
    });

    expect(results).toHaveLength(1);
    const match = results[0];
    expect(match.memoryId).toBe('mem-water-1');
    expect(match.relevanceScore).toBeGreaterThanOrEqual(0.68);

    // Verify Explainability Breakdown
    expect(match.matchBreakdown).toBeDefined();
    expect(match.matchBreakdown.problemSimilarity).toBeGreaterThanOrEqual(0.35);
    expect(match.matchBreakdown.rootCauseAlignment).toBeGreaterThan(0.5);
    expect(match.matchBreakdown.geographicContext).toBeGreaterThanOrEqual(0.9);
    expect(match.matchBreakdown.verifiedEvidence).toBeGreaterThanOrEqual(0.9);
    expect(match.matchBreakdown.implementationCompatibility).toBe(1.0);

    // Verify Warning & Explanation
    expect(match.explanation).toContain('geographic radius');
    expect(match.historicalWarning).toContain('Install dual sedimentation chambers');
    expect(match.recommendedPrerequisites).toBeDefined();
  });

  it('correctly categorizes ReusabilityClass based on outcome, evidence and limitations', () => {
    // High success with verified evidence
    const high = SolutionRetrievalEngine.calculateReusabilityScore({
      outcomeStatus: MemoryOutcomeStatus.SUCCESSFUL,
      evidenceLevel: EvidenceLevel.VERIFIED,
      whatFailed: null,
      limitations: null,
    });
    expect(high).toBeGreaterThanOrEqual(80);
    expect(SolutionRetrievalEngine.mapScoreToReusabilityClass(high, MemoryOutcomeStatus.SUCCESSFUL)).toBe(
      ReusabilityClass.HIGHLY_REUSABLE
    );

    // Partial success with estimated evidence and limitations correctly requires adaptation
    const medium = SolutionRetrievalEngine.calculateReusabilityScore({
      outcomeStatus: MemoryOutcomeStatus.PARTIALLY_EFFECTIVE,
      evidenceLevel: EvidenceLevel.ESTIMATED,
      whatFailed: 'Frequent motor burnout due to rural voltage fluctuations',
      limitations: 'Restricted to villages with 3-phase grid power',
    });
    expect(medium).toBeLessThan(70);
    expect(SolutionRetrievalEngine.mapScoreToReusabilityClass(medium, MemoryOutcomeStatus.PARTIALLY_EFFECTIVE)).toBe(
      ReusabilityClass.REQUIRES_ADAPTATION
    );

    // Failed outcome
    const low = SolutionRetrievalEngine.calculateReusabilityScore({
      outcomeStatus: MemoryOutcomeStatus.FAILED,
      evidenceLevel: EvidenceLevel.VERIFIED,
    });
    expect(low).toBeLessThan(40);
    expect(SolutionRetrievalEngine.mapScoreToReusabilityClass(low, MemoryOutcomeStatus.FAILED)).toBe(
      ReusabilityClass.NOT_RECOMMENDED
    );
  });

  it('compares solutions side-by-side across all 5 key dimensions', async () => {
    (prisma.solutionMemory.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'sol-1',
        title: 'Gravity Ultrafiltration',
        challengeCategory: 'WATER_SUPPLY',
        problemType: 'WATER_SUPPLY',
        problemSummary: 'High turbidity mountain stream',
        rootCause: 'Monsoon mud runoff',
        technicalApproach: 'Hollow-fiber ultrafiltration module',
        outcomeStatus: MemoryOutcomeStatus.SUCCESSFUL,
        evidenceLevel: EvidenceLevel.VERIFIED,
        reusabilityClass: ReusabilityClass.HIGHLY_REUSABLE,
        whatWorked: 'High flow without electricity',
        whatFailed: 'Pre-filters clog',
        limitations: 'Needs 5m head',
        futureWarnings: 'Clean pre-filters weekly',
        project: { title: 'Project 1' },
      },
      {
        id: 'sol-2',
        title: 'Chlorination Dispenser',
        challengeCategory: 'WATER_SUPPLY',
        problemType: 'WATER_SUPPLY',
        problemSummary: 'Microbial contamination in pipeline',
        rootCause: 'Pathogens in open reservoir',
        technicalApproach: 'Venturi automatic inline liquid chlorination',
        outcomeStatus: MemoryOutcomeStatus.PARTIALLY_EFFECTIVE,
        evidenceLevel: EvidenceLevel.OFFICIAL,
        reusabilityClass: ReusabilityClass.CONDITIONALLY_REUSABLE,
        whatWorked: 'Effective disinfection',
        whatFailed: 'Community disliked chlorine taste',
        limitations: 'Requires consistent chemical supply',
        futureWarnings: 'Calibrate dose carefully',
        project: { title: 'Project 2' },
      },
    ]);

    const comparison = await SolutionRetrievalEngine.compareSolutions(['sol-1', 'sol-2']);

    expect(comparison.solutions).toHaveLength(2);
    expect(comparison.comparisonDimensions.problemAndRootCause['sol-1']).toContain('Monsoon mud runoff');
    expect(comparison.comparisonDimensions.technologyAndApproach['sol-2']).toContain('liquid chlorination');
    expect(comparison.comparisonDimensions.outcomesAndImpact['sol-1']).toContain('SUCCESSFUL');
    expect(comparison.comparisonDimensions.limitationsAndFailureModes['sol-2']).toContain('chlorine taste');
    expect(comparison.comparisonDimensions.reusabilityAndAdoption['sol-1']).toContain('HIGHLY_REUSABLE');
  });
});
