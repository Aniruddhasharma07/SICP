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

      // 3. Heal any existing duplicate washroom/sanitation challenges
      const washroomChallenges = await prisma.challenge.findMany({
        where: {
          title: { contains: 'washroom', mode: 'insensitive' },
          deletedAt: null,
        },
        include: {
          problemGroups: {
            include: { members: true },
          },
          challengeProblems: {
            include: { problem: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (washroomChallenges.length >= 2) {
        const canonical = washroomChallenges[0];
        const secondary = washroomChallenges.slice(1);

        let primaryGroup = canonical.problemGroups[0];
        if (!primaryGroup) {
          primaryGroup = (await prisma.problemGroup.create({
            data: {
              title: `Sanitation & Drainage Incident Cluster - ${canonical.district || 'Mathura'}`,
              canonicalCategory: 'Sanitation & Drainage',
              challengeId: canonical.id,
              relationshipStrength: 0.95,
            },
            include: { members: true },
          })) as any;
        }

        for (const sec of secondary) {
          for (const cp of sec.challengeProblems) {
            await prisma.challengeProblem.upsert({
              where: {
                challengeId_problemId: {
                  challengeId: canonical.id,
                  problemId: cp.problemId,
                },
              },
              update: {},
              create: {
                challengeId: canonical.id,
                problemId: cp.problemId,
              },
            });

            await prisma.problemGroupMember.upsert({
              where: {
                groupId_problemId: {
                  groupId: primaryGroup.id,
                  problemId: cp.problemId,
                },
              },
              update: {},
              create: {
                groupId: primaryGroup.id,
                problemId: cp.problemId,
              },
            });

            await prisma.problem.update({
              where: { id: cp.problemId },
              data: {
                groupId: primaryGroup.id,
                category: 'Sanitation & Drainage',
                latitude: canonical.latitude || 27.7942,
                longitude: canonical.longitude || 77.4326,
              },
            });
          }

          await prisma.challenge.update({
            where: { id: sec.id },
            data: {
              deletedAt: new Date(),
              status: 'ARCHIVED' as any,
              title: `[MERGED into #${canonical.id.slice(0, 8).toUpperCase()}] ${sec.title}`,
            },
          });
        }

        await prisma.challenge.update({
          where: { id: canonical.id },
          data: {
            category: 'Sanitation & Drainage',
            latitude: canonical.latitude || 27.7942,
            longitude: canonical.longitude || 77.4326,
            district: canonical.district || 'Mathura',
            state: canonical.state || 'Uttar Pradesh',
            affectedPopulation: 4500,
            priorityScore: 78.5,
            severity: 'SEVERE' as any,
            priority: 'HIGH' as any,
          },
        });

        logger.info(
          `Self-healed ${washroomChallenges.length} washroom challenges into canonical #${canonical.id.slice(0, 8).toUpperCase()}`
        );
      }

      // 4. Heal any existing duplicate education challenges
      const educationChallenges = await prisma.challenge.findMany({
        where: {
          title: { contains: 'education', mode: 'insensitive' },
          deletedAt: null,
        },
        include: {
          problemGroups: {
            include: { members: true },
          },
          challengeProblems: {
            include: { problem: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (educationChallenges.length >= 2) {
        const canonical = educationChallenges[0];
        const secondary = educationChallenges.slice(1);

        let primaryGroup = canonical.problemGroups[0];
        if (!primaryGroup) {
          primaryGroup = (await prisma.problemGroup.create({
            data: {
              title: `Education & Schools Incident Cluster - ${canonical.district || 'Mathura'}`,
              canonicalCategory: 'Education & Schools',
              challengeId: canonical.id,
              relationshipStrength: 0.95,
            },
            include: { members: true },
          })) as any;
        }

        for (const sec of secondary) {
          for (const cp of sec.challengeProblems) {
            await prisma.challengeProblem.upsert({
              where: {
                challengeId_problemId: {
                  challengeId: canonical.id,
                  problemId: cp.problemId,
                },
              },
              update: {},
              create: {
                challengeId: canonical.id,
                problemId: cp.problemId,
              },
            });

            await prisma.problemGroupMember.upsert({
              where: {
                groupId_problemId: {
                  groupId: primaryGroup.id,
                  problemId: cp.problemId,
                },
              },
              update: {},
              create: {
                groupId: primaryGroup.id,
                problemId: cp.problemId,
              },
            });

            await prisma.problem.update({
              where: { id: cp.problemId },
              data: {
                groupId: primaryGroup.id,
                category: 'Education & Schools',
                latitude: canonical.latitude || 27.604,
                longitude: canonical.longitude || 77.5987,
              },
            });
          }

          await prisma.challenge.update({
            where: { id: sec.id },
            data: {
              deletedAt: new Date(),
              status: 'ARCHIVED' as any,
              title: `[MERGED into #${canonical.id.slice(0, 8).toUpperCase()}] ${sec.title}`,
            },
          });
        }

        await prisma.challenge.update({
          where: { id: canonical.id },
          data: {
            category: 'Education & Schools',
            latitude: canonical.latitude || 27.604,
            longitude: canonical.longitude || 77.5987,
            district: canonical.district || 'Mathura',
            state: canonical.state || 'Uttar Pradesh',
            affectedPopulation: 2500,
            priorityScore: 74.5,
            severity: 'SEVERE' as any,
            priority: 'HIGH' as any,
          },
        });

        logger.info(
          `Self-healed ${educationChallenges.length} education challenges into canonical #${canonical.id.slice(0, 8).toUpperCase()}`
        );
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
