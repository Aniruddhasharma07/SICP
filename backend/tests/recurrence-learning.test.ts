import { RecurrenceDetectionEngine } from '../src/domain/intelligence/recurrence-detection.engine';
import { ProjectStatus, MemoryOutcomeStatus, AuditAction, UserRole } from '@sicp/shared';
import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    project: { findMany: jest.fn() },
    solutionMemory: { findFirst: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

describe('RecurrenceLearning - Feedback Loop into Solution Memory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates SolutionMemory status to REQUIRES_REVIEW when recurrence is detected', async () => {
    const deploymentDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago

    (prisma.project.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'proj-historical-water',
        challengeId: 'chal-old-water',
        status: ProjectStatus.COMPLETED,
        updatedAt: deploymentDate,
        challenge: {
          id: 'chal-old-water',
          title: 'Fluoride contamination in drinking borewell',
          description: 'High fluoride levels in primary aquifer',
          category: 'WATER_SUPPLY',
          latitude: 17.0500,
          longitude: 79.2600,
          district: 'Nalgonda',
          state: 'Telangana',
        },
        deployments: [{ status: 'DEPLOYED' }],
      },
    ]);

    (prisma.solutionMemory.findFirst as jest.Mock).mockResolvedValue({
      id: 'mem-water-rec',
      projectId: 'proj-historical-water',
      outcomeStatus: MemoryOutcomeStatus.SUCCESSFUL,
      lessonsLearned: 'Activated alumina column worked initially.',
    });

    (prisma.solutionMemory.update as jest.Mock).mockResolvedValue({});
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const recurrenceResult = await RecurrenceDetectionEngine.detectRecurrence({
      challengeId: 'chal-new-water',
      category: 'WATER_SUPPLY',
      title: 'Fluoride contamination resurfacing in community borewell',
      description: 'High fluoride levels re-emerged in community drinking supply',
      latitude: 17.0502, // <0.05 km
      longitude: 79.2601,
      district: 'Nalgonda',
      state: 'Telangana',
      actorId: 'gov-officer-1',
      requestId: 'req-rec-eval-1',
    });

    expect(recurrenceResult.isRecurrence).toBe(true);
    expect(recurrenceResult.classification).toBe('RECURRENCE');

    // Verify SolutionMemory was updated to REQUIRES_REVIEW
    expect(prisma.solutionMemory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'mem-water-rec' },
        data: expect.objectContaining({
          outcomeStatus: MemoryOutcomeStatus.REQUIRES_REVIEW,
        }),
      })
    );

    // Verify audit log
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: AuditAction.RECURRENCE_DETECTED,
        }),
      })
    );
  });
});
