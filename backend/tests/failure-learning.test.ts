import { SolutionService } from '../src/modules/solution/solution.service';
import { SolutionRetrievalEngine } from '../src/domain/intelligence/solution-retrieval.engine';
import {
  SolutionMemoryStatus,
  ReusabilityClass,
  EvidenceLevel,
  MemoryOutcomeStatus,
  UserRole,
} from '@sicp/shared';
import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    solutionMemory: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

describe('FailureLearning - Institutional Failure Lessons & Operational Warnings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records failure lessons, adjusts reusability score, and generates audit log', async () => {
    (prisma.solutionMemory.findUnique as jest.Mock).mockResolvedValue({
      id: 'mem-solar-1',
      title: 'Rural Microgrid Inverter Hub',
      summary: 'Centralized inverter cluster for mini-grid',
      challengeCategory: 'ENERGY',
      problemSummary: 'Unreliable power supply',
      rootCause: 'Grid transmission deficiency',
      technicalApproach: 'Hybrid solar battery system with 10kVA central inverter',
      lessonsLearned: 'Standard operation',
      whatWorked: 'Daytime solar power generation',
      whatFailed: null,
      futureWarnings: null,
      limitations: null,
      reusabilityScore: 85,
      reusabilityClass: ReusabilityClass.HIGHLY_REUSABLE,
      evidenceLevel: EvidenceLevel.VERIFIED,
      outcomeStatus: MemoryOutcomeStatus.SUCCESSFUL,
      status: SolutionMemoryStatus.PUBLISHED,
      tags: ['ENERGY'],
    });

    (prisma.solutionMemory.update as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'mem-solar-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const updated = await SolutionService.updateSolutionMemory({
      id: 'mem-solar-1',
      dto: {
        whatFailed: 'Inverter capacitors overheated due to lack of dust seals during summer heatwaves exceeding 46°C.',
        futureWarnings: 'Mandatory IP55 dust sealing and auxiliary heat extraction fan required in desert climate deployments.',
        limitations: 'Ambient temperature must not exceed 45°C without active cooling.',
      },
      actorId: 'fac-expert-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-fail-lesson-1',
    });

    expect(updated.whatFailed).toContain('overheated due to lack of dust seals');
    expect(updated.futureWarnings).toContain('Mandatory IP55 dust sealing');
    // Audit log recorded for failure lesson
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('surfaces historical failure warning in challenge retrieval', async () => {
    (prisma.solutionMemory.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'mem-solar-1',
        title: 'Rural Microgrid Inverter Hub',
        summary: 'Centralized inverter cluster for mini-grid',
        challengeCategory: 'ENERGY',
        problemType: 'ELECTRICITY_NETWORK',
        problemSummary: 'Frequent blackout and voltage fluctuations in desert border outpost',
        rootCause: 'Extreme ambient heat and dust storm grid breakdown',
        technicalApproach: 'Hybrid solar battery system with 10kVA central inverter',
        outcomeStatus: MemoryOutcomeStatus.PARTIALLY_EFFECTIVE,
        evidenceLevel: EvidenceLevel.VERIFIED,
        reusabilityClass: ReusabilityClass.CONDITIONALLY_REUSABLE,
        reusabilityScore: 65,
        status: SolutionMemoryStatus.PUBLISHED,
        whatWorked: 'Maintained 8 hours of critical lighting',
        whatFailed: 'Capacitors overheated due to lack of dust seals',
        futureWarnings: 'Mandatory IP55 dust sealing and auxiliary heat extraction fan required',
        limitations: 'Temperature ceiling 45°C',
        tags: ['ENERGY', 'solar'],
        challenge: { district: 'Jaisalmer', state: 'Rajasthan' },
        project: { id: 'proj-1', title: 'Desert Solar' },
      },
    ]);

    const results = await SolutionRetrievalEngine.retrieveRelevantSolutions({
      title: 'Power outage and solar equipment heating in desert village',
      description: 'Dust and heat causing power equipment breakdown in desert community.',
      category: 'ENERGY',
      problemType: 'ELECTRICITY_NETWORK',
      rootCause: 'Desert dust and extreme heat',
      district: 'Jaisalmer',
      state: 'Rajasthan',
    });

    expect(results).toHaveLength(1);
    expect(results[0].historicalWarning).toBe(
      'Mandatory IP55 dust sealing and auxiliary heat extraction fan required'
    );
  });
});
