import { RecurrenceDetectionEngine } from '../src/domain/intelligence/recurrence-detection.engine';
import { ProjectStatus, MemoryOutcomeStatus } from '@sicp/shared';
import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    project: { findMany: jest.fn() },
    solutionMemory: { findFirst: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

describe('RecurrenceDetectionEngine - Post-Deployment Problem Monitoring & Solution Memory', () => {
  it('detects IMPLEMENTATION_FAILURE when problem reappears within 30 days of deployment', async () => {
    const recentDeploymentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

    (prisma.project.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'proj-historical-1',
        challengeId: 'chal-old-1',
        status: ProjectStatus.COMPLETED,
        updatedAt: recentDeploymentDate,
        challenge: {
          id: 'chal-old-1',
          title: 'Arsenic and turbidity in groundwater',
          description: 'High turbidity and chemical contamination in village handpump',
          category: 'WATER_SUPPLY',
          latitude: 25.3176,
          longitude: 82.9739,
          district: 'Varanasi',
        },
        deployments: [{ status: 'DEPLOYED' }],
      },
    ]);

    (prisma.solutionMemory.findFirst as jest.Mock).mockResolvedValue({
      id: 'mem-1',
      projectId: 'proj-historical-1',
      outcomeStatus: MemoryOutcomeStatus.SUCCESS,
      lessonsLearned: 'Standard electrochemical treatment works well',
    });
    (prisma.solutionMemory.update as jest.Mock).mockResolvedValue({});
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const result = await RecurrenceDetectionEngine.detectRecurrence({
      challengeId: 'chal-new-1',
      category: 'WATER_SUPPLY',
      title: 'Groundwater turbidity in village handpump',
      description: 'Chemical contamination and arsenic turbidity in village',
      latitude: 25.3180, // ~0.05 km away
      longitude: 82.9745,
      district: 'Varanasi',
      state: 'Uttar Pradesh',
      actorId: 'cit-1',
      requestId: 'req-rec-1',
    });

    expect(result.isRecurrence).toBe(true);
    expect(result.classification).toBe('IMPLEMENTATION_FAILURE');
    expect(result.confidenceScore).toBeGreaterThan(0.7);
    expect(prisma.solutionMemory.update).toHaveBeenCalledWith({
      where: { id: 'mem-1' },
      data: expect.objectContaining({
        outcomeStatus: MemoryOutcomeStatus.REQUIRES_REVIEW,
      }),
    });
  });

  it('detects RECURRENCE when problem re-emerges after sustained operational period (>30 days)', async () => {
    const sustainedDeploymentDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000); // 180 days ago

    (prisma.project.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'proj-historical-2',
        challengeId: 'chal-old-2',
        status: ProjectStatus.COMPLETED,
        updatedAt: sustainedDeploymentDate,
        challenge: {
          id: 'chal-old-2',
          title: 'Drainage blockage causing street flooding',
          description: 'Monsoon drainage overflow in Market square',
          category: 'SANITATION_SERVICE',
          latitude: 26.8467,
          longitude: 80.9462,
          district: 'Lucknow',
        },
        deployments: [{ status: 'DEPLOYED' }],
      },
    ]);

    (prisma.solutionMemory.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await RecurrenceDetectionEngine.detectRecurrence({
      challengeId: 'chal-new-2',
      category: 'SANITATION_SERVICE',
      title: 'Drainage blockage and street flooding',
      description: 'Drainage overflow and silt blockage near Market square',
      latitude: 26.8470,
      longitude: 80.9465,
      district: 'Lucknow',
      state: 'Uttar Pradesh',
    });

    expect(result.isRecurrence).toBe(true);
    expect(result.classification).toBe('RECURRENCE');
    expect(result.actionRequired).toContain('sustainability assessment');
  });

  it('returns INSUFFICIENT_EVIDENCE when problem is in a distant location or unaligned category', async () => {
    (prisma.project.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'proj-historical-3',
        challengeId: 'chal-old-3',
        status: ProjectStatus.COMPLETED,
        updatedAt: new Date(),
        challenge: {
          id: 'chal-old-3',
          title: 'Solar streetlights along highway',
          description: 'Installing solar lights',
          category: 'ELECTRICITY_NETWORK',
          latitude: 28.6139,
          longitude: 77.209,
          district: 'Delhi',
        },
        deployments: [],
      },
    ]);

    const result = await RecurrenceDetectionEngine.detectRecurrence({
      challengeId: 'chal-new-3',
      category: 'ELECTRICITY_NETWORK',
      title: 'Transformer overload in residential sector',
      description: 'Substation transformer fuse blown in rural village',
      latitude: 25.3176, // ~800 km away
      longitude: 82.9739,
      district: 'Varanasi',
    });

    expect(result.isRecurrence).toBe(false);
    expect(result.classification).toBe('INSUFFICIENT_EVIDENCE');
  });
});
