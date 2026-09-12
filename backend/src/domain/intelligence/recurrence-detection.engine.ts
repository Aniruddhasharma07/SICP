import { prisma } from '../../database/prisma';
import {
  RecurrenceDetectionResultDto,
  ChallengeStatus,
  ProjectStatus,
  MemoryOutcomeStatus,
  SolutionMemoryStatus,
  AuditAction,
  UserRole,
} from '@sicp/shared';
import { DuplicateClusteringService } from './duplicate-clustering.service';
import { AuditService } from '../../modules/audit/audit.service';
import { NotificationService } from '../../modules/notification/notification.service';
import { logger } from '../../utils/logger';

export class RecurrenceDetectionEngine {
  /**
   * Evaluates if an incoming challenge is a recurrence of a problem previously addressed
   * by a deployed or completed project.
   */
  public static async detectRecurrence(params: {
    challengeId: string;
    category: string;
    title: string;
    description: string;
    latitude?: number | null;
    longitude?: number | null;
    district?: string | null;
    state?: string | null;
    actorId?: string;
    requestId?: string;
  }): Promise<RecurrenceDetectionResultDto> {
    const { challengeId, category, title, description, latitude, longitude, district, state, actorId, requestId } = params;

    // Find all deployed or completed projects with challenges in the same category
    const deployedProjects = await prisma.project.findMany({
      where: {
        status: { in: [ProjectStatus.DEPLOYMENT, ProjectStatus.COMPLETED] },
        challenge: {
          category: { equals: category, mode: 'insensitive' },
          id: { not: challengeId },
        },
      },
      include: {
        challenge: true,
        deployments: true,
      },
    });

    if (deployedProjects.length === 0) {
      return {
        isRecurrence: false,
        confidenceScore: 0,
        classification: 'INSUFFICIENT_EVIDENCE',
        reasoning: 'No prior deployed or completed projects found in this category.',
        actionRequired: 'Proceed with normal challenge evaluation.',
      };
    }

    let highestScore = 0;
    let bestMatchProject: (typeof deployedProjects)[0] | null = null;
    let distanceToBestMatch: number | null = null;

    const challengeText = `${title} ${description}`.toLowerCase();

    for (const project of deployedProjects) {
      const historicalText = `${project.challenge.title} ${project.challenge.description}`.toLowerCase();
      const semanticSim = DuplicateClusteringService.calculateTokenSimilarity(challengeText, historicalText);

      // Check distance if coordinates available
      let geoScore = 0;
      let dist: number | null = null;
      if (latitude != null && longitude != null && project.challenge.latitude != null && project.challenge.longitude != null) {
        dist = DuplicateClusteringService.calculateDistanceKm(
          latitude,
          longitude,
          project.challenge.latitude,
          project.challenge.longitude
        );
        if (dist !== null) {
          if (dist < 2.0) geoScore = 1.0;
          else if (dist < 5.0) geoScore = 0.8;
          else if (dist < 15.0) geoScore = 0.5;
          else if (dist < 50.0) geoScore = 0.2;
        }
      } else if (district && project.challenge.district && district.toLowerCase() === project.challenge.district.toLowerCase()) {
        geoScore = 0.6;
      }

      // Weighted score: 60% geography + 40% semantic
      const combinedScore = geoScore * 0.6 + semanticSim * 0.4;

      if (combinedScore > highestScore) {
        highestScore = combinedScore;
        bestMatchProject = project;
        distanceToBestMatch = dist;
      }
    }

    // Threshold for recurrence consideration
    if (highestScore < 0.45 || !bestMatchProject) {
      return {
        isRecurrence: false,
        confidenceScore: Math.round(highestScore * 100) / 100,
        classification: 'INSUFFICIENT_EVIDENCE',
        reasoning: 'Problem does not exhibit sufficient geographic and semantic overlap with past solutions.',
        actionRequired: 'Proceed with standard challenge lifecycle.',
      };
    }

    // Determine recurrence classification without premature false failure claim
    let classification: RecurrenceDetectionResultDto['classification'] = 'RECURRENCE';
    let reasoning = '';
    let actionRequired = '';

    const daysSinceDeployment = bestMatchProject.updatedAt
      ? Math.floor((Date.now() - new Date(bestMatchProject.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    if (daysSinceDeployment < 30) {
      classification = 'IMPLEMENTATION_FAILURE';
      reasoning = `Issue reappeared within ${daysSinceDeployment} days of deployment at ${distanceToBestMatch ?? 'same'} km. Indicates possible technical defect or incomplete initial deployment.`;
      actionRequired = 'Notify implementation team and university leads for immediate technical inspection.';
    } else if (highestScore > 0.75 && (distanceToBestMatch === null || distanceToBestMatch < 1.0)) {
      classification = 'RECURRENCE';
      reasoning = `Identical societal issue re-emerged at the exact same location after ${daysSinceDeployment} days of operational deployment.`;
      actionRequired = 'Flag historical solution for re-review and perform root cause sustainability assessment.';
    } else if (highestScore >= 0.55 && distanceToBestMatch !== null && distanceToBestMatch >= 1.0 && distanceToBestMatch <= 10.0) {
      classification = 'PARTIAL_EFFECTIVENESS';
      reasoning = `Issue appeared in adjacent vicinity (${distanceToBestMatch} km) indicating solution was localized and did not cover peripheral catchment.`;
      actionRequired = 'Consider scaling deployment boundary or launching targeted secondary intervention.';
    } else {
      classification = 'EXTERNAL_NEW_CAUSE';
      reasoning = `Similar category problem in regional proximity (${distanceToBestMatch ?? district} km) but likely driven by independent external environmental or seasonal factors.`;
      actionRequired = 'Verify independently without assuming past solution breakdown.';
    }

    // Mark SolutionMemory as REQUIRES_REVIEW if exists
    try {
      const memory = await prisma.solutionMemory.findFirst({
        where: { projectId: bestMatchProject.id },
      });

      if (memory) {
        await prisma.solutionMemory.update({
          where: { id: memory.id },
          data: {
            status: SolutionMemoryStatus.REQUIRES_REVIEW,
            outcomeStatus: MemoryOutcomeStatus.REQUIRES_REVIEW,
            lessonsLearned: `${memory.lessonsLearned} [Recurrence Alert: Challenge ${challengeId} flagged with ${classification} (${reasoning})]`,
          },
        });

        if (memory.reviewedById) {
          await NotificationService.create({
            recipientId: memory.reviewedById,
            title: `Recurrence Alert: Solution Memory Requires Review`,
            message: `A potential recurrence was detected for challenge ${challengeId}. Classification: ${classification}. Reasoning: ${reasoning}.`,
            type: 'RECURRENCE_ALERT',
            actionUrl: `/solutions/${memory.id}`,
            metadata: { challengeId, memoryId: memory.id, classification },
          }).catch(err => logger.warn(`Failed to notify reviewer on recurrence: ${err.message}`));
        }
      }

      if (actorId && requestId) {
        await AuditService.log({
          actorId,
          actorRole: UserRole.SYSTEM_ADMIN,
          action: AuditAction.RECURRENCE_DETECTED,
          resource: 'Challenge',
          resourceId: challengeId,
          previousState: null,
          newState: {
            classification,
            confidenceScore: highestScore,
            matchedProjectId: bestMatchProject.id,
            reasoning,
          },
          reason: `Recurrence detection flagged challenge ${challengeId} against project ${bestMatchProject.id}`,
          requestId,
        });
      }
    } catch (err) {
      logger.warn(`Failed to update SolutionMemory on recurrence detection: ${(err as Error).message}`);
    }

    return {
      isRecurrence: true,
      confidenceScore: Math.round(highestScore * 100) / 100,
      candidateChallengeId: bestMatchProject.challengeId,
      deployedProjectId: bestMatchProject.id,
      classification,
      reasoning,
      actionRequired,
    };
  }
}
