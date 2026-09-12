import { OutcomeService } from '../src/modules/outcome/outcome.service';
import {
  OutcomeVerificationStatus,
  ProjectStatus,
  ChallengeStatus,
  OutcomeType,
  CitizenProblemStatus,
  UserRole,
} from '@sicp/shared';
import { prisma } from '../src/database/prisma';
import { ConflictError, ValidationError } from '../src/utils/errors';
import { RecurrenceDetectionEngine } from '../src/domain/intelligence/recurrence-detection.engine';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    project: { findUnique: jest.fn(), update: jest.fn() },
    challenge: { update: jest.fn() },
    challengeTimeline: { create: jest.fn() },
    citizenVerification: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    projectOutcomeVerification: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    innovationOutcome: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: { findMany: jest.fn() },
    auditLog: { create: jest.fn() },
    notification: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('../src/domain/intelligence/recurrence-detection.engine', () => ({
  RecurrenceDetectionEngine: {
    detectRecurrence: jest.fn().mockResolvedValue({ isRecurrence: false }),
  },
}));

describe('OutcomeService - Citizen Feedback, Official Verification & Innovation Tracking', () => {
  it('submits citizen feedback and prevents duplicate submissions', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      challengeId: 'chal-1',
      title: 'Water Filtration Unit',
      status: ProjectStatus.DEPLOYMENT,
      challenge: { category: 'WATER_SUPPLY', title: 'Water Crisis' },
    });

    // First submission: no duplicate
    (prisma.citizenVerification.findFirst as jest.Mock).mockResolvedValue(null);

    const mockTx = {
      citizenVerification: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'cit-ver-1',
            ...data,
            citizen: { fullName: 'Priya Sharma' },
            createdAt: new Date(),
          })
        ),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(mockTx));

    const feedback = await OutcomeService.submitCitizenFeedback({
      projectId: 'proj-1',
      dto: {
        rating: 5,
        comments: 'Water is clean, odorless, and available throughout the day now!',
        verifiedImprovement: true,
        problemStatus: CitizenProblemStatus.YES,
        effectivenessRating: 5,
        improvementRating: 5,
      },
      citizenId: 'cit-1',
      actorRole: UserRole.CITIZEN,
      requestId: 'req-feedback-1',
    });

    expect(feedback.rating).toBe(5);
    expect(feedback.problemStatus).toBe(CitizenProblemStatus.YES);

    // Second submission by same citizen: must reject with ConflictError
    (prisma.citizenVerification.findFirst as jest.Mock).mockResolvedValue({ id: 'cit-ver-1' });

    await expect(
      OutcomeService.submitCitizenFeedback({
        projectId: 'proj-1',
        dto: {
          rating: 4,
          comments: 'Duplicate attempt',
          verifiedImprovement: true,
          problemStatus: CitizenProblemStatus.YES,
        },
        citizenId: 'cit-1',
        actorRole: UserRole.CITIZEN,
        requestId: 'req-feedback-dup',
      })
    ).rejects.toThrow(ConflictError);
  });

  it('triggers recurrence detection when citizen reports problem persists', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      challengeId: 'chal-1',
      title: 'Water Filtration Unit',
      status: ProjectStatus.DEPLOYMENT,
      challenge: { id: 'chal-1', category: 'WATER_SUPPLY', title: 'Water Crisis', latitude: 25.3, longitude: 82.9 },
    });
    (prisma.citizenVerification.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'gov-1' }]);
    (prisma.notification.create as jest.Mock).mockResolvedValue({});

    const mockTx = {
      citizenVerification: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'cit-ver-2',
            ...data,
            citizen: { fullName: 'Sunil Verma' },
            createdAt: new Date(),
          })
        ),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(mockTx));

    await OutcomeService.submitCitizenFeedback({
      projectId: 'proj-1',
      dto: {
        rating: 1,
        comments: 'Filtration unit broken after 2 weeks; muddy water coming again.',
        verifiedImprovement: false,
        problemStatus: CitizenProblemStatus.NO,
        isRecurrenceReported: true,
      },
      citizenId: 'cit-2',
      actorRole: UserRole.CITIZEN,
      requestId: 'req-feedback-recur',
    });

    expect(RecurrenceDetectionEngine.detectRecurrence).toHaveBeenCalledWith(
      expect.objectContaining({
        challengeId: 'chal-1',
        category: 'WATER_SUPPLY',
      })
    );
  });

  it('conducts official outcome verification and marks Challenge RESOLVED on VERIFIED', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      challengeId: 'chal-1',
      title: 'Water Filtration Unit',
      status: ProjectStatus.DEPLOYMENT,
      challenge: { id: 'chal-1', title: 'Water Crisis' },
    });

    const mockTx = {
      projectOutcomeVerification: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'ver-1',
            ...data,
            reviewer: { fullName: 'District Magistrate Office' },
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
      project: { update: jest.fn().mockResolvedValue({}) },
      challenge: { update: jest.fn().mockResolvedValue({}) },
      challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(mockTx));

    const verification = await OutcomeService.verifyOutcome({
      projectId: 'proj-1',
      dto: {
        status: OutcomeVerificationStatus.VERIFIED,
        baselineSummary: '2 hours clean water daily',
        targetSummary: '8 hours clean water daily',
        observedSummary: 'Achieved 8.2 hours daily average across 10 distribution points',
        calculatedImpact: { totalBeneficiaries: 14800, turbidityReductionPct: 98 },
        citizenFeedbackSummary: { positiveSentimentPct: 94, totalResponses: 42 },
      },
      actorId: 'gov-1',
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-outcome-verify',
    });

    expect(verification.status).toBe(OutcomeVerificationStatus.VERIFIED);
    expect(verification.verifiedAt).toBeDefined();
    expect(mockTx.project.update).toHaveBeenCalledWith({
      where: { id: 'proj-1' },
      data: { status: ProjectStatus.COMPLETED },
    });
    expect(mockTx.challenge.update).toHaveBeenCalledWith({
      where: { id: 'chal-1' },
      data: { status: ChallengeStatus.RESOLVED },
    });
  });

  it('records patent and innovation outcomes', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      challengeId: 'chal-1',
      title: 'Water Filtration Unit',
    });

    const mockTx = {
      innovationOutcome: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'inn-1',
            ...data,
            registeredAt: new Date(),
          })
        ),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(mockTx));

    const outcome = await OutcomeService.recordInnovationOutcome({
      projectId: 'proj-1',
      dto: {
        outcomeType: OutcomeType.PATENT_FILED,
        title: 'Low-Voltage Solar-Driven Coagulation Reactor',
        description: 'Patent application filed with Indian Patent Office',
        referenceIdentifier: 'IN202611098452',
        verifiedBeneficiaries: 15000,
        measurableImpactSummary: '98% turbidity removal with < 15W total power consumption',
        responsibleOrg: 'IIT BHU Innovation Foundation',
      },
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-patent-1',
    });

    expect(outcome.outcomeType).toBe(OutcomeType.PATENT_FILED);
    expect(outcome.referenceIdentifier).toBe('IN202611098452');
  });
});
