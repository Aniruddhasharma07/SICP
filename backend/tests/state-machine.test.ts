import { ChallengeStatus, UserRole } from '@sicp/shared';
import { findValidTransitionRule, CHALLENGE_TRANSITIONS } from '../src/domain/state-machine/challenge.transitions';
import { StateMachineEngine } from '../src/domain/state-machine/state-machine.engine';
import { prisma } from '../src/database/prisma';
import {
  InvalidStateTransitionError,
  ForbiddenError,
  ValidationError,
  ResourceVersionConflictError,
  NotFoundError,
} from '../src/utils/errors';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

describe('State Machine Engine & Challenge Transitions', () => {
  describe('Transition Rules Table', () => {
    it('defines valid path: DRAFT -> SUBMITTED', () => {
      const rule = findValidTransitionRule(ChallengeStatus.DRAFT, ChallengeStatus.SUBMITTED);
      expect(rule).toBeDefined();
      expect(rule?.allowedRoles).toContain(UserRole.CITIZEN);
      expect(rule?.requiresReason).toBe(false);
    });

    it('defines valid path: SUBMITTED -> UNDER_GOV_REVIEW', () => {
      const rule = findValidTransitionRule(ChallengeStatus.SUBMITTED, ChallengeStatus.UNDER_GOV_REVIEW);
      expect(rule).toBeDefined();
      expect(rule?.allowedRoles).toContain(UserRole.GOVERNMENT_OFFICER);
    });

    it('defines valid path: UNDER_GOV_REVIEW -> NEEDS_MORE_INFO (requires reason)', () => {
      const rule = findValidTransitionRule(ChallengeStatus.UNDER_GOV_REVIEW, ChallengeStatus.NEEDS_MORE_INFO);
      expect(rule).toBeDefined();
      expect(rule?.requiresReason).toBe(true);
    });

    it('defines valid path: UNDER_GOV_REVIEW -> APPROVED', () => {
      const rule = findValidTransitionRule(ChallengeStatus.UNDER_GOV_REVIEW, ChallengeStatus.APPROVED);
      expect(rule).toBeDefined();
      expect(rule?.allowedRoles).toContain(UserRole.GOVERNMENT_OFFICER);
    });

    it('defines valid path: UNDER_GOV_REVIEW -> REJECTED (requires reason)', () => {
      const rule = findValidTransitionRule(ChallengeStatus.UNDER_GOV_REVIEW, ChallengeStatus.REJECTED);
      expect(rule).toBeDefined();
      expect(rule?.requiresReason).toBe(true);
    });

    it('rejects invalid jump: DRAFT -> APPROVED', () => {
      const rule = findValidTransitionRule(ChallengeStatus.DRAFT, ChallengeStatus.APPROVED);
      expect(rule).toBeUndefined();
    });

    it('rejects invalid jump: DRAFT -> REJECTED', () => {
      const rule = findValidTransitionRule(ChallengeStatus.DRAFT, ChallengeStatus.REJECTED);
      expect(rule).toBeUndefined();
    });

    it('rejects backwards jump: APPROVED -> SUBMITTED', () => {
      const rule = findValidTransitionRule(ChallengeStatus.APPROVED, ChallengeStatus.SUBMITTED);
      expect(rule).toBeUndefined();
    });
  });

  describe('StateMachineEngine Execution & Guardrails', () => {
    let mockTx: any;

    beforeEach(() => {
      jest.clearAllMocks();
      mockTx = {
        challenge: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        challengeTimeline: {
          create: jest.fn(),
        },
        auditLog: {
          create: jest.fn(),
        },
        notification: {
          create: jest.fn(),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        return await cb(mockTx);
      });
    });

    it('throws NotFoundError if challenge does not exist', async () => {
      mockTx.challenge.findUnique.mockResolvedValue(null);

      await expect(
        StateMachineEngine.transitionChallenge({
          challengeId: 'non-existent-id',
          toStatus: ChallengeStatus.SUBMITTED,
          actorId: 'citizen-1',
          actorRole: UserRole.CITIZEN,
          requestId: 'req-1',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('throws InvalidStateTransitionError if transition rule does not exist', async () => {
      mockTx.challenge.findUnique.mockResolvedValue({
        id: 'c-1',
        status: ChallengeStatus.DRAFT,
        version: 1,
      });

      await expect(
        StateMachineEngine.transitionChallenge({
          challengeId: 'c-1',
          toStatus: ChallengeStatus.APPROVED, // Illegal jump from DRAFT!
          actorId: 'officer-1',
          actorRole: UserRole.GOVERNMENT_OFFICER,
          requestId: 'req-2',
        })
      ).rejects.toThrow(InvalidStateTransitionError);
    });

    it('throws ForbiddenError if actor role is not permitted for the transition', async () => {
      mockTx.challenge.findUnique.mockResolvedValue({
        id: 'c-2',
        status: ChallengeStatus.UNDER_GOV_REVIEW,
        version: 2,
      });

      // Citizen tries to approve!
      await expect(
        StateMachineEngine.transitionChallenge({
          challengeId: 'c-2',
          toStatus: ChallengeStatus.APPROVED,
          actorId: 'citizen-1',
          actorRole: UserRole.CITIZEN,
          requestId: 'req-3',
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws ValidationError if reason is required but omitted', async () => {
      mockTx.challenge.findUnique.mockResolvedValue({
        id: 'c-3',
        status: ChallengeStatus.UNDER_GOV_REVIEW,
        version: 2,
      });

      // Rejection requires reason
      await expect(
        StateMachineEngine.transitionChallenge({
          challengeId: 'c-3',
          toStatus: ChallengeStatus.REJECTED,
          actorId: 'officer-1',
          actorRole: UserRole.GOVERNMENT_OFFICER,
          reason: '', // empty reason
          requestId: 'req-4',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ResourceVersionConflictError when expectedVersion does not match current version', async () => {
      mockTx.challenge.findUnique.mockResolvedValue({
        id: 'c-4',
        status: ChallengeStatus.UNDER_GOV_REVIEW,
        version: 5, // currently version 5
      });

      // Officer had stale version 4 in UI
      await expect(
        StateMachineEngine.transitionChallenge({
          challengeId: 'c-4',
          toStatus: ChallengeStatus.APPROVED,
          actorId: 'officer-1',
          actorRole: UserRole.GOVERNMENT_OFFICER,
          expectedVersion: 4, // stale!
          requestId: 'req-5',
        })
      ).rejects.toThrow(ResourceVersionConflictError);
    });

    it('successfully executes atomic transition, timeline, audit, and increments version', async () => {
      mockTx.challenge.findUnique.mockResolvedValue({
        id: 'c-5',
        title: 'Road subsidence in sector 8',
        status: ChallengeStatus.SUBMITTED,
        submitterId: 'citizen-99',
        version: 2,
      });

      mockTx.challenge.update.mockResolvedValue({
        id: 'c-5',
        status: ChallengeStatus.UNDER_GOV_REVIEW,
        version: 3,
      });

      mockTx.challengeTimeline.create.mockResolvedValue({ id: 'time-1' });
      mockTx.auditLog.create.mockResolvedValue({ id: 'audit-1' });
      mockTx.notification.create.mockResolvedValue({ id: 'notif-1' });

      const result = await StateMachineEngine.transitionChallenge({
        challengeId: 'c-5',
        toStatus: ChallengeStatus.UNDER_GOV_REVIEW,
        actorId: 'officer-10',
        actorRole: UserRole.GOVERNMENT_OFFICER,
        expectedVersion: 2,
        reason: 'Claimed by municipal engineering officer',
        requestId: 'req-6',
        ipAddress: '127.0.0.1',
      });

      expect(mockTx.challenge.update).toHaveBeenCalledWith({
        where: { id: 'c-5', version: 2 },
        data: {
          status: ChallengeStatus.UNDER_GOV_REVIEW,
          version: { increment: 1 },
        },
      });

      expect(mockTx.challengeTimeline.create).toHaveBeenCalledWith({
        data: {
          challengeId: 'c-5',
          fromStatus: ChallengeStatus.SUBMITTED,
          toStatus: ChallengeStatus.UNDER_GOV_REVIEW,
          actorId: 'officer-10',
          reason: 'Claimed by municipal engineering officer',
        },
      });

      expect(mockTx.auditLog.create).toHaveBeenCalled();
      expect(mockTx.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          recipientId: 'citizen-99',
          title: expect.stringContaining('UNDER_GOV_REVIEW'),
        }),
      });

      expect(result.challenge.version).toBe(3);
    });
  });
});