import { SolutionService } from '../src/modules/solution/solution.service';
import {
  SolutionMemoryStatus,
  ReusabilityClass,
  EvidenceLevel,
  MemoryOutcomeStatus,
  ProjectStatus,
  OutcomeVerificationStatus,
} from '@sicp/shared';
import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    solutionMemory: {
      findMany: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    innovationOutcome: {
      findMany: jest.fn(),
    },
  },
}));

describe('InstitutionalLearning - Analytics & University Learning Profiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates platform-wide knowledge analytics across domains, outcomes and reusability classes', async () => {
    (prisma.solutionMemory.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'mem-1',
        title: 'Solar Water Unit',
        challengeCategory: 'WATER_SUPPLY',
        outcomeStatus: MemoryOutcomeStatus.SUCCESSFUL,
        reusabilityClass: ReusabilityClass.HIGHLY_REUSABLE,
        evidenceLevel: EvidenceLevel.VERIFIED,
        status: SolutionMemoryStatus.PUBLISHED,
        viewCount: 42,
        reuseCount: 5,
        whatFailed: 'Heavy sand siltation choked filter during monsoon',
        rootCause: 'Geological fluoride dissolution',
      },
      {
        id: 'mem-2',
        title: 'Microgrid Inverter Hub',
        challengeCategory: 'ENERGY',
        outcomeStatus: MemoryOutcomeStatus.PARTIALLY_EFFECTIVE,
        reusabilityClass: ReusabilityClass.CONDITIONALLY_REUSABLE,
        evidenceLevel: EvidenceLevel.OFFICIAL,
        status: SolutionMemoryStatus.PUBLISHED,
        viewCount: 19,
        reuseCount: 2,
        whatFailed: 'Inverter capacitors overheated due to lack of dust seals',
        rootCause: 'Desert dust and extreme heat',
      },
    ]);

    const analytics = await SolutionService.getKnowledgeAnalytics();

    expect(analytics.totalMemories).toBe(2);
    expect(analytics.publishedMemories).toBe(2);
    expect(analytics.memoriesByDomain['WATER_SUPPLY']).toBe(1);
    expect(analytics.memoriesByDomain['ENERGY']).toBe(1);
    expect(analytics.memoriesByOutcome.successful).toBe(1);
    expect(analytics.memoriesByOutcome.partiallyEffective).toBe(1);
    expect(analytics.memoriesByReusability[ReusabilityClass.HIGHLY_REUSABLE]).toBe(1);
    expect(analytics.topReusableInterventions).toHaveLength(2);
    expect(analytics.commonFailureCauses.length).toBeGreaterThan(0);
    expect(analytics.commonRootCauses.length).toBeGreaterThan(0);
  });

  it('compiles honest institutional learning profile for a university with sample size disclosure', async () => {
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
      id: 'univ-iit-delhi',
      name: 'IIT Delhi Civic Technologies Lab',
      type: 'UNIVERSITY',
      ledProjects: [
        {
          id: 'proj-1',
          status: ProjectStatus.COMPLETED,
          challenge: { category: 'WATER_SUPPLY' },
          outcomeVerifications: [{ status: OutcomeVerificationStatus.VERIFIED }],
        },
        {
          id: 'proj-2',
          status: ProjectStatus.COMPLETED,
          challenge: { category: 'URBAN_INFRASTRUCTURE' },
          outcomeVerifications: [{ status: OutcomeVerificationStatus.VERIFIED_WITH_LIMITATIONS }],
        },
      ],
    });

    (prisma.solutionMemory.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'mem-1',
        title: 'Water Unit',
        outcomeStatus: MemoryOutcomeStatus.SUCCESSFUL,
        reusabilityClass: ReusabilityClass.HIGHLY_REUSABLE,
        createdAt: new Date(),
      },
    ]);

    (prisma.innovationOutcome.findMany as jest.Mock).mockResolvedValue([
      { outcomeType: 'PATENT_FILED' },
      { outcomeType: 'STARTUP' },
    ]);

    const profile = await SolutionService.getInstitutionalLearning('univ-iit-delhi');

    expect(profile.organizationName).toBe('IIT Delhi Civic Technologies Lab');
    expect(profile.totalProjects).toBe(2);
    expect(profile.completedProjects).toBe(2);
    expect(profile.sampleSizeDisclosure).toContain('2 assigned institutional initiatives');
    expect(profile.successfulOutcomes).toBe(1);
    expect(profile.partialOutcomes).toBe(1);
    expect(profile.patentsCount).toBe(1);
    expect(profile.startupsCount).toBe(1);
    expect(profile.domainExpertise).toContain('WATER_SUPPLY');
    expect(profile.domainExpertise).toContain('URBAN_INFRASTRUCTURE');
  });
});
