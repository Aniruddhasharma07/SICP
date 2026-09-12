import { ChallengeStatus, UserRole, AuditAction } from '@sicp/shared';
import { prisma } from '../../database/prisma';
import { findValidTransitionRule } from './challenge.transitions';
import {
  InvalidStateTransitionError,
  ForbiddenError,
  ValidationError,
  ResourceVersionConflictError,
  NotFoundError,
} from '../../utils/errors';
import { logger } from '../../utils/logger';

export interface ExecuteChallengeTransitionParams {
  challengeId: string;
  toStatus: ChallengeStatus;
  actorId: string;
  actorRole: UserRole;
  expectedVersion?: number;
  reason?: string;
  requestId: string;
  ipAddress?: string;
}

export class StateMachineEngine {
  public static async transitionChallenge(params: ExecuteChallengeTransitionParams) {
    const {
      challengeId,
      toStatus,
      actorId,
      actorRole,
      expectedVersion,
      reason,
      requestId,
      ipAddress,
    } = params;

    return await prisma.$transaction(async tx => {
      const current = await tx.challenge.findUnique({
        where: { id: challengeId },
      });

      if (!current) {
        throw new NotFoundError('Challenge', challengeId);
      }

      const currentStatus = current.status as unknown as ChallengeStatus;
      const rule = findValidTransitionRule(currentStatus, toStatus);
      if (!rule) {
        throw new InvalidStateTransitionError(
          currentStatus,
          toStatus,
          `No valid transition path exists from '${currentStatus}' to '${toStatus}'`
        );
      }

      if (!rule.allowedRoles.includes(actorRole)) {
        throw new ForbiddenError(
          `Role '${actorRole}' is not permitted to transition challenge from '${currentStatus}' to '${toStatus}'`
        );
      }

      if (rule.requiresReason && (!reason || reason.trim().length === 0)) {
        throw new ValidationError(`A detailed reason is mandatory for transition to '${toStatus}'`);
      }

      const targetVersion = expectedVersion !== undefined ? expectedVersion : current.version;
      if (current.version !== targetVersion) {
        throw new ResourceVersionConflictError('Challenge', challengeId);
      }

      const updated = await tx.challenge.update({
        where: {
          id: challengeId,
          version: targetVersion,
        },
        data: {
          status: toStatus as unknown as import('@prisma/client').$Enums.ChallengeStatus,
          version: { increment: 1 },
        },
      });

      const timeline = await tx.challengeTimeline.create({
        data: {
          challengeId,
          fromStatus: current.status,
          toStatus: toStatus as unknown as import('@prisma/client').$Enums.ChallengeStatus,
          actorId,
          reason: reason?.trim() || null,
        },
      });

      const auditLog = await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: AuditAction.CHALLENGE_STATE_TRANSITION,
          resource: 'Challenge',
          resourceId: challengeId,
          previousState: { status: current.status, version: current.version },
          newState: { status: updated.status, version: updated.version },
          reason: reason?.trim() || null,
          requestId,
          ipAddress: ipAddress || null,
        },
      });

      if (current.submitterId !== actorId) {
        await tx.notification.create({
          data: {
            recipientId: current.submitterId,
            title: `Challenge status updated: ${toStatus}`,
            message: `Your challenge "${current.title}" was updated to ${toStatus}${reason ? `: ${reason}` : '.'}`,
            type: 'CHALLENGE_STATUS_UPDATE',
            actionUrl: `/challenges/${challengeId}`,
          },
        });
      }

      logger.info(`State transition succeeded: Challenge ${challengeId} [${current.status} -> ${toStatus}] by ${actorRole} (${actorId})`, {
        requestId,
        challengeId,
        fromStatus: current.status,
        toStatus,
        version: updated.version,
      });

      return {
        challenge: updated,
        timeline,
        auditLog,
      };
    });
  }
}
