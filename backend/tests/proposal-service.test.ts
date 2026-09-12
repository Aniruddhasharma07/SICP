import { ProposalService } from '../src/modules/proposal/proposal.service';
import { ProposalStatus, ChallengeStatus, UserRole } from '@sicp/shared';
import { prisma } from '../src/database/prisma';
import { ValidationError, NotFoundError } from '../src/utils/errors';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    project: { findUnique: jest.fn() },
    projectProposal: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    proposalReview: { create: jest.fn() },
    challenge: { findUnique: jest.fn(), update: jest.fn() },
    challengeTimeline: { create: jest.fn() },
    user: { findMany: jest.fn() },
    auditLog: { create: jest.fn() },
    notification: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe('ProposalService - Versioning & State Machine Reviews', () => {
  it('creates immutable version increment (V1 to V2)', async () => {
    const mockTx = {
      project: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'proj-1',
          challengeId: 'chal-1',
          proposals: [{ id: 'prop-v1', version: 1 }],
        }),
      },
      projectProposal: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'prop-v2', ...data })),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx));

    const proposal = await ProposalService.createProposal({
      projectId: 'proj-1',
      problemUnderstanding: 'High contamination levels',
      rootCauseHypothesis: 'Industrial discharge into canal',
      technicalApproach: 'Electrochemical coagulation & membrane filtration',
      expectedImpact: 'Pure drinking water for 5000 villagers',
      risksAndMitigations: 'Membrane fouling managed with backwash cycle',
      sustainabilityPlan: 'Village council maintenance fee',
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-prop-1',
    });

    expect(proposal.version).toBe(2);
    expect(proposal.status).toBe(ProposalStatus.DRAFT);
  });

  it('submitting proposal advances challenge to SOLUTION_PROPOSED', async () => {
    const mockTx = {
      projectProposal: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'prop-v1',
          version: 1,
          status: ProposalStatus.DRAFT,
          project: { id: 'proj-1', challengeId: 'chal-1', title: 'Water Pilot' },
        }),
        update: jest.fn().mockResolvedValue({
          id: 'prop-v1',
          status: ProposalStatus.SUBMITTED,
          submittedAt: new Date(),
        }),
      },
      challenge: {
        findUnique: jest.fn().mockResolvedValue({ id: 'chal-1', status: ChallengeStatus.IN_RESEARCH }),
        update: jest.fn().mockResolvedValue({ id: 'chal-1', status: ChallengeStatus.SOLUTION_PROPOSED }),
      },
      challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'officer-1' }]) },
      notification: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx));

    const submitted = await ProposalService.submitProposal({
      proposalId: 'prop-v1',
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-sub-1',
    });

    expect(submitted.status).toBe(ProposalStatus.SUBMITTED);
    expect(mockTx.challenge.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ChallengeStatus.SOLUTION_PROPOSED }),
      })
    );
  });

  it('reviewing proposal with REVISION_REQUESTED transitions challenge back to IN_RESEARCH', async () => {
    const mockTx = {
      projectProposal: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'prop-v1',
          version: 1,
          status: ProposalStatus.SUBMITTED,
          authorId: 'fac-1',
          project: { id: 'proj-1', challengeId: 'chal-1', title: 'Water Pilot' },
        }),
        update: jest.fn().mockResolvedValue({
          id: 'prop-v1',
          status: ProposalStatus.REVISION_REQUESTED,
          reviewComments: 'Need more detail on operational costs',
        }),
      },
      proposalReview: {
        create: jest.fn().mockResolvedValue({ id: 'rev-1' }),
      },
      challenge: {
        findUnique: jest.fn().mockResolvedValue({ id: 'chal-1', status: ChallengeStatus.SOLUTION_PROPOSED }),
        update: jest.fn().mockResolvedValue({ id: 'chal-1', status: ChallengeStatus.IN_RESEARCH }),
      },
      challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
      notification: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx));

    const result = await ProposalService.reviewProposal({
      proposalId: 'prop-v1',
      decision: 'REVISION_REQUESTED',
      comments: 'Need more detail on operational costs',
      requiredChanges: ['Breakdown of annual consumable membrane cost', 'Power requirement specs'],
      actorId: 'officer-1',
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-rev-1',
    });

    expect(result.proposal.status).toBe(ProposalStatus.REVISION_REQUESTED);
    expect(mockTx.challenge.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ChallengeStatus.IN_RESEARCH }),
      })
    );
  });
});
