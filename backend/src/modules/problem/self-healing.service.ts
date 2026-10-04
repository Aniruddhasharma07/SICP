import { prisma } from '../../database/prisma';
import { SlaService } from '../../domain/sla/sla.service';
import { SeverityLevel, PriorityLevel } from '@sicp/shared';
import { logger } from '../../utils/logger';

export class SelfHealingService {
  private static hasRunOnce = false;

  /**
   * Automatically heals any orphaned DRAFT challenges, unlinked problems,
   * or challenges missing SLAs and join records.
   */
  public static async healOrphanedDraftsAndProblems(): Promise<void> {
    try {
      // 1. Upgrade any DRAFT challenges to SUBMITTED and create their Problem records
      const draftChallenges = await prisma.challenge.findMany({
        where: {
          status: 'DRAFT' as any,
          deletedAt: null,
        },
      });

      for (const ch of draftChallenges) {
        // Upgrade to SUBMITTED
        await prisma.challenge.update({
          where: { id: ch.id },
          data: { status: 'SUBMITTED' as any },
        });

        // Ensure SLA exists
        await SlaService.initOrUpdateSLA(
          ch.id,
          (ch.severity as any) || SeverityLevel.MODERATE,
          (ch.priority as any) || PriorityLevel.MEDIUM
        ).catch(() => {});

        // Check if it has any linked Problem
        const linked = await prisma.challengeProblem.findFirst({
          where: { challengeId: ch.id },
        });

        if (!linked) {
          const code = `PRB-${new Date(ch.createdAt).getFullYear()}-${ch.id.slice(0, 4).toUpperCase()}`;
          const prob = await prisma.problem.create({
            data: {
              code,
              title: ch.title,
              description: ch.description,
              category: ch.category,
              status: 'CHALLENGE_CREATED',
              latitude: ch.latitude,
              longitude: ch.longitude,
              locationName: ch.address,
              district: ch.district,
              state: ch.state,
              submitterId: ch.submitterId,
              aiSeverity: ch.severity as any,
              aiPriority: ch.priority as any,
              aiAffectedPopulation: ch.affectedPopulation,
            },
          });

          await prisma.challengeProblem.create({
            data: {
              challengeId: ch.id,
              problemId: prob.id,
            },
          });
        }
      }

      // 2. Ensure all SUBMITTED challenges have at least one linked Problem record
      const unlinkedSubmitted = await prisma.challenge.findMany({
        where: {
          status: 'SUBMITTED' as any,
          deletedAt: null,
          challengeProblems: { none: {} },
        },
      });

      for (const ch of unlinkedSubmitted) {
        const code = `PRB-${new Date(ch.createdAt).getFullYear()}-${ch.id.slice(0, 4).toUpperCase()}`;
        const prob = await prisma.problem.create({
          data: {
            code,
            title: ch.title,
            description: ch.description,
            category: ch.category,
            status: 'CHALLENGE_CREATED',
            latitude: ch.latitude,
            longitude: ch.longitude,
            locationName: ch.address,
            district: ch.district,
            state: ch.state,
            submitterId: ch.submitterId,
            aiSeverity: ch.severity as any,
            aiPriority: ch.priority as any,
            aiAffectedPopulation: ch.affectedPopulation,
          },
        });

        await prisma.challengeProblem.create({
          data: {
            challengeId: ch.id,
            problemId: prob.id,
          },
        });

        await SlaService.initOrUpdateSLA(
          ch.id,
          (ch.severity as any) || SeverityLevel.MODERATE,
          (ch.priority as any) || PriorityLevel.MEDIUM
        ).catch(() => {});
      }

      this.hasRunOnce = true;
    } catch (err) {
      logger.warn(`Self-healing routine skipped or deferred: ${(err as Error).message}`);
    }
  }

  public static async runOnce(): Promise<void> {
    if (!this.hasRunOnce) {
      await this.healOrphanedDraftsAndProblems();
    }
  }
}
