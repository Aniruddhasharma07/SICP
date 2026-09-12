import { SolutionService } from '../src/modules/solution/solution.service';
import { SolutionRetrievalEngine } from '../src/domain/intelligence/solution-retrieval.engine';
import { KnowledgeAssistantEngine } from '../src/domain/intelligence/knowledge-assistant.engine';
import {
  SolutionMemoryStatus,
  ReusabilityClass,
  EvidenceLevel,
  MemoryOutcomeStatus,
  UserRole,
  ProjectStatus,
  OutcomeVerificationStatus,
} from '@sicp/shared';
import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
    },
    solutionMemory: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (cb: any) => (typeof cb === 'function' ? cb(prisma) : Promise.all(cb))),
  },
}));

jest.mock('../src/jobs/queue.manager', () => ({
  QueueManager: {
    enqueueEmbeddingGeneration: jest.fn().mockResolvedValue({ jobId: 'job-1' }),
  },
}));

describe('Phase 6 E2E - Full Closed-Loop Institutional Learning & Knowledge Retrieval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
      typeof cb === 'function' ? cb(prisma) : Promise.all(cb)
    );
  });

  it('executes complete end-to-end flow: project completion -> memory synthesis -> review/publish -> recommendation -> assistant', async () => {
    // 1. Synthesize Draft Memory from Deployed Project with Verified Outcome
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-water-1',
      title: 'Solar Multi-Stage Fluoride Remediation Unit',
      description: 'Solar powered electrodialysis reversal unit for rural community drinking water.',
      status: ProjectStatus.COMPLETED,
      challenge: {
        id: 'chal-nalgonda-1',
        title: 'Endemic skeletal fluorosis in village groundwater',
        description: 'Fluoride level exceeding 4.8 mg/L leading to severe bone deformities in children.',
        category: 'WATER_SUPPLY',
        district: 'Nalgonda',
        state: 'Telangana',
        latitude: 17.0500,
        longitude: 79.2600,
        impact: {
          problemType: 'WATER_SUPPLY',
          inputs: { rootCause: 'Granitic aquifer fluoride leaching' },
        },
      },
      proposals: [
        {
          technicalApproach: 'Automated polarity-reversal electrodialysis with solar battery backup and sand pre-filtration.',
          expectedImpact: 'Safe drinking water complying with WHO <1.0 mg/L standard for 3,000 residents.',
        },
      ],
      deployments: [
        {
          failureRootCause: null,
          blockerReason: null,
        },
      ],
      outcomeVerifications: [
        {
          status: OutcomeVerificationStatus.VERIFIED,
          observedSummary: 'Stabilized fluoride to 0.7 mg/L across 6-month continuous field audit.',
          limitations: 'High raw water turbidity during monsoon requires frequent sediment pre-strainer backwashing.',
        },
      ],
    });

    (prisma.solutionMemory.findFirst as jest.Mock).mockResolvedValue(null);

    let memoryRecord: any = null;
    (prisma.solutionMemory.create as jest.Mock).mockImplementation(({ data }) => {
      memoryRecord = {
        id: 'mem-nalgonda-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return Promise.resolve(memoryRecord);
    });

    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const draft = await SolutionService.generateDraftFromProject({
      projectId: 'proj-water-1',
      actorId: 'fac-lead-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-e2e-1',
    });

    expect(draft.id).toBe('mem-nalgonda-1');
    expect(draft.status).toBe(SolutionMemoryStatus.DRAFT);
    expect(draft.reusabilityClass).toBe(ReusabilityClass.HIGHLY_REUSABLE);

    // 2. Government Review & Publishing
    (prisma.solutionMemory.findUnique as jest.Mock).mockResolvedValue(memoryRecord);
    (prisma.solutionMemory.update as jest.Mock).mockImplementation(({ data }) => {
      memoryRecord = { ...memoryRecord, ...data, updatedAt: new Date() };
      return Promise.resolve(memoryRecord);
    });

    const published = await SolutionService.reviewSolutionMemory({
      id: 'mem-nalgonda-1',
      dto: {
        status: SolutionMemoryStatus.PUBLISHED,
        reviewNotes: 'Verified against district chemical lab tests. Approved for institutional solution catalog.',
        futureWarnings: 'Ensure dual disc pre-filters are installed if turbidity exceeds 50 NTU.',
      },
      actorId: 'gov-officer-1',
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-e2e-2',
    });

    expect(published.status).toBe(SolutionMemoryStatus.PUBLISHED);
    expect(published.futureWarnings).toContain('dual disc pre-filters');

    // 3. Historical Knowledge Match for a New Incoming Challenge in Neighboring District
    (prisma.solutionMemory.findMany as jest.Mock).mockResolvedValue([memoryRecord]);

    const recommendations = await SolutionRetrievalEngine.retrieveRelevantSolutions({
      title: 'High fluoride concentration in community drinking well',
      description: 'Excess fluoride in groundwater affecting school children in neighboring taluka.',
      category: 'WATER_SUPPLY',
      problemType: 'WATER_SUPPLY',
      rootCause: 'Granitic aquifer fluoride leaching',
      latitude: 17.1500, // ~15 km away
      longitude: 79.3500,
      district: 'Nalgonda',
      state: 'Telangana',
    });

    expect(recommendations).toHaveLength(1);
    const rec = recommendations[0];
    expect(rec.memoryId).toBe('mem-nalgonda-1');
    expect(rec.relevanceScore).toBeGreaterThanOrEqual(0.65);
    expect(rec.historicalWarning).toContain('dual disc pre-filters');
    expect(rec.matchBreakdown.geographicContext).toBeGreaterThanOrEqual(0.85);

    // 4. Grounded Knowledge Assistant Query
    const assistantResponse = await KnowledgeAssistantEngine.askAssistant(
      {
        query: 'What solutions exist for fluoride leaching in rural Telangana drinking wells?',
      },
      UserRole.CITIZEN
    );

    expect(assistantResponse.evidenceQuality).toBe('HIGH_CONFIDENCE');
    expect(assistantResponse.citations).toHaveLength(1);
    expect(assistantResponse.citations[0].recordId).toBe('mem-nalgonda-1');
    expect(assistantResponse.historicalWarnings.some(w => w.includes('dual disc pre-filters'))).toBe(true);
  });
});
