import { prisma } from '../../database/prisma';
import { SeverityLevel, PriorityLevel, ChallengeStatus } from '@sicp/shared';
import { NotFoundError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export class SlaService {
  /**
   * Calculates SLA review deadline based on problem severity and priority
   */
  public static calculateDeadline(
    severity: SeverityLevel,
    priority: PriorityLevel,
    fromDate: Date = new Date()
  ): Date {
    let hours = 240; // 10 days default for LOW/MEDIUM

    if (severity === SeverityLevel.CATASTROPHIC || priority === PriorityLevel.CRITICAL) {
      hours = 48; // 48 hours for urgent public hazards
    } else if (severity === SeverityLevel.SEVERE || priority === PriorityLevel.HIGH) {
      hours = 120; // 5 days for severe issues
    }

    return new Date(fromDate.getTime() + hours * 60 * 60 * 1000);
  }

  /**
   * Determines escalation status based on time remaining until deadline
   */
  public static getEscalationStatus(
    deadline: Date,
    now: Date = new Date()
  ): 'NORMAL' | 'WARNING' | 'ESCALATED' {
    const diffMs = deadline.getTime() - now.getTime();

    if (diffMs <= 0) {
      return 'ESCALATED'; // SLA breached
    }

    const oneDayMs = 24 * 60 * 60 * 1000;
    if (diffMs <= oneDayMs) {
      return 'WARNING'; // Less than 24 hours remaining
    }

    return 'NORMAL';
  }

  /**
   * Initializes or updates SLA tracking for a challenge
   */
  public static async initOrUpdateSLA(
    challengeId: string,
    severity: SeverityLevel,
    priority: PriorityLevel,
    assignedOfficerId?: string
  ) {
    const deadline = this.calculateDeadline(severity, priority);
    const escalationStatus = this.getEscalationStatus(deadline);

    return await prisma.challengeSLA.upsert({
      where: { challengeId },
      create: {
        challengeId,
        reviewDeadline: deadline,
        escalationStatus,
        assignedOfficerId: assignedOfficerId || null,
      },
      update: {
        reviewDeadline: deadline,
        escalationStatus,
        assignedOfficerId: assignedOfficerId || undefined,
      },
    });
  }

  /**
   * Assigns a designated government officer to review a challenge
   */
  public static async assignOfficer(
    challengeId: string,
    officerId: string,
    assignedById: string
  ) {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundError('Challenge', challengeId);
    }

    const officer = await prisma.user.findUnique({
      where: { id: officerId },
    });

    if (!officer) {
      throw new NotFoundError('User', officerId);
    }

    const sla = await prisma.challengeSLA.upsert({
      where: { challengeId },
      create: {
        challengeId,
        reviewDeadline: this.calculateDeadline(
          challenge.severity as unknown as SeverityLevel,
          challenge.priority as unknown as PriorityLevel
        ),
        assignedOfficerId: officerId,
      },
      update: {
        assignedOfficerId: officerId,
      },
    });

    // Notify assigned officer
    await prisma.notification.create({
      data: {
        recipientId: officerId,
        title: `Assigned to Review: "${challenge.title}"`,
        message: `You have been assigned to evaluate this ${challenge.severity} severity challenge. SLA Deadline: ${sla.reviewDeadline.toLocaleDateString()}.`,
        type: 'OFFICER_ASSIGNED',
        actionUrl: `/challenges/${challengeId}`,
      },
    });

    logger.info(`Assigned officer ${officerId} to challenge ${challengeId} by ${assignedById}`);
    return sla;
  }

  /**
   * Batch process checking all active challenges and triggering escalation notifications
   */
  public static async checkAndTriggerEscalations(): Promise<number> {
    const now = new Date();
    const activeSLAs = await prisma.challengeSLA.findMany({
      where: {
        escalationStatus: { in: ['NORMAL', 'WARNING'] },
        challenge: {
          status: { in: [ChallengeStatus.SUBMITTED, ChallengeStatus.UNDER_GOV_REVIEW] },
        },
      },
      include: { challenge: true },
    });

    let escalatedCount = 0;
    for (const sla of activeSLAs) {
      const currentStatus = this.getEscalationStatus(sla.reviewDeadline, now);
      if (currentStatus !== sla.escalationStatus) {
        await prisma.challengeSLA.update({
          where: { id: sla.id },
          data: {
            escalationStatus: currentStatus,
            escalatedAt: currentStatus === 'ESCALATED' ? now : undefined,
          },
        });

        if (currentStatus === 'ESCALATED') {
          escalatedCount++;
          // Notify assigned officer or department admins
          if (sla.assignedOfficerId) {
            await prisma.notification.create({
              data: {
                recipientId: sla.assignedOfficerId,
                title: `URGENT SLA BREACH: "${sla.challenge.title}"`,
                message: `The review deadline for challenge "${sla.challenge.title}" has lapsed. Immediate intervention required.`,
                type: 'SLA_BREACH_ALERT',
                actionUrl: `/challenges/${sla.challengeId}`,
              },
            });
          }
        }
      }
    }

    return escalatedCount;
  }
}
