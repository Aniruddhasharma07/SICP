import { SolutionService } from '../src/modules/solution/solution.service';
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
import { NotFoundError } from '../src/utils/errors';

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
    enqueueEmbeddingGeneration: jest.fn().mockResolvedValue({ jobId: 'job-emb-1' }),
  },
}));

describe('SolutionMemoryService - Lifecycle, Synthesis & Publishing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
      typeof cb === 'function' ? cb(prisma) : Promise.all(cb)
    );
  });

  it('generates a complete draft SolutionMemory from a completed project with outcome verification', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      title: 'Solar Water De-fluoridation Unit',
      description: 'Decentralized electrodialysis reversal unit powered by rooftop solar photovoltaic array.',
      status: ProjectStatus.COMPLETED,
      challenge: {
        id: 'chal-1',
        title: 'Fluoride in groundwater drinking wells',
        description: 'Excessive fluoride causing skeletal fluorosis in village primary school and nearby community.',
        category: 'WATER_SUPPLY',
        district: 'Nalgonda',
        state: 'Telangana',
        latitude: 17.0575,
        longitude: 79.2684,
        impact: {
          problemType: 'WATER_SUPPLY',
          inputs: { rootCause: 'Deep aquifer geological fluoride dissolution' },
        },
      },
      proposals: [
        {
          technicalApproach: 'Electrodialysis Reversal (EDR) with automated polarity reversal to prevent membrane scaling.',
          expectedImpact: 'Reduce fluoride concentration from 5.4 mg/L to <1.0 mg/L for 2,400 daily users.',
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
          observedSummary: 'Fluoride level stabilized at 0.8 mg/L. Verified by district health laboratory.',
          limitations: 'High initial membrane cost and requires periodic electrode inspection.',
        },
      ],
    });

    (prisma.solutionMemory.findFirst as jest.Mock).mockResolvedValue(null);

    (prisma.solutionMemory.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'mem-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const result = await SolutionService.generateDraftFromProject({
      projectId: 'proj-1',
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-draft-1',
    });

    expect(result.id).toBe('mem-1');
    expect(result.title).toBe('Solution: Solar Water De-fluoridation Unit');
    expect(result.challengeCategory).toBe('WATER_SUPPLY');
    expect(result.outcomeStatus).toBe(MemoryOutcomeStatus.SUCCESSFUL);
    expect(result.evidenceLevel).toBe(EvidenceLevel.VERIFIED);
    expect(result.reusabilityClass).toBe(ReusabilityClass.HIGHLY_REUSABLE);
    expect(result.status).toBe(SolutionMemoryStatus.DRAFT);
    expect(result.whatWorked).toContain('stabilized at 0.8 mg/L');
    expect(result.limitations).toContain('membrane cost');
  });

  it('throws NotFoundError if project does not exist when drafting memory', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      SolutionService.generateDraftFromProject({
        projectId: 'proj-missing',
        actorId: 'fac-1',
        actorRole: UserRole.FACULTY,
        requestId: 'req-draft-2',
      })
    ).rejects.toThrow(NotFoundError);
  });

  it('updates SolutionMemory and creates audit log when failure lessons are documented', async () => {
    (prisma.solutionMemory.findUnique as jest.Mock).mockResolvedValue({
      id: 'mem-1',
      title: 'Solar Water De-fluoridation Unit',
      summary: 'Electrodialysis Reversal Unit',
      challengeCategory: 'WATER_SUPPLY',
      problemSummary: 'Excessive fluoride',
      rootCause: 'Geological dissolution',
      rootCauseSummary: 'Geological dissolution',
      technicalApproach: 'EDR unit',
      solutionSummary: 'EDR unit',
      implementationSummary: 'EDR unit',
      impactSummary: 'Safe water',
      lessonsLearned: 'Standard maintenance',
      whatWorked: 'High recovery',
      whatFailed: null,
      futureWarnings: null,
      limitations: null,
      reusabilityScore: 85,
      reusabilityClass: ReusabilityClass.HIGHLY_REUSABLE,
      evidenceLevel: EvidenceLevel.VERIFIED,
      outcomeStatus: MemoryOutcomeStatus.SUCCESSFUL,
      status: SolutionMemoryStatus.DRAFT,
      tags: ['WATER_SUPPLY'],
    });

    (prisma.solutionMemory.update as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'mem-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const result = await SolutionService.updateSolutionMemory({
      id: 'mem-1',
      dto: {
        whatFailed: 'Heavy sand siltation choked the inlet pre-filter during monsoon season.',
        futureWarnings: 'Mandatory dual sand and disc pre-filter required before EDR membrane stack.',
      },
      actorId: 'officer-1',
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-update-fail',
    });

    expect(result.whatFailed).toContain('siltation choked the inlet');
    expect(result.futureWarnings).toContain('Mandatory dual sand and disc pre-filter');
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('reviews and transitions SolutionMemory to PUBLISHED', async () => {
    (prisma.solutionMemory.findUnique as jest.Mock).mockResolvedValue({
      id: 'mem-1',
      status: SolutionMemoryStatus.UNDER_REVIEW,
      reviewNotes: null,
    });

    (prisma.solutionMemory.update as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'mem-1',
        title: 'Solar Water De-fluoridation Unit',
        summary: 'Electrodialysis Reversal Unit',
        challengeCategory: 'WATER_SUPPLY',
        problemSummary: 'Fluoride',
        rootCause: 'Geological',
        technicalApproach: 'EDR',
        lessonsLearned: 'Good results',
        reusabilityClass: ReusabilityClass.HIGHLY_REUSABLE,
        evidenceLevel: EvidenceLevel.VERIFIED,
        outcomeStatus: MemoryOutcomeStatus.SUCCESSFUL,
        status: data.status,
        reviewNotes: data.reviewNotes,
        reviewedById: data.reviewedById,
        lastReviewedAt: data.lastReviewedAt,
        tags: ['WATER_SUPPLY'],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const result = await SolutionService.reviewSolutionMemory({
      id: 'mem-1',
      dto: {
        status: SolutionMemoryStatus.PUBLISHED,
        reviewNotes: 'Verified against district water laboratory chemical analysis. Approved for statewide institutional replication.',
      },
      actorId: 'gov-officer-1',
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-pub-1',
    });

    expect(result.status).toBe(SolutionMemoryStatus.PUBLISHED);
    expect(result.reviewNotes).toContain('Approved for statewide institutional replication');
  });

  it('enforces RBAC visibility: Citizen cannot access unpublished DRAFT solution memories', async () => {
    (prisma.solutionMemory.findUnique as jest.Mock).mockResolvedValue({
      id: 'mem-draft-1',
      status: SolutionMemoryStatus.DRAFT,
      title: 'Unreviewed Draft Solution',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      SolutionService.getSolutionMemory('mem-draft-1', UserRole.CITIZEN)
    ).rejects.toThrow(NotFoundError);
  });
});
