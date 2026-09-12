import { prisma } from '../../database/prisma';
import {
  OutcomeVerificationStatus,
  ProjectStatus,
  ChallengeStatus,
  OutcomeType,
  AuditAction,
  UserRole,
  CitizenProblemStatus,
  CitizenFeedbackDto,
  CreateCitizenFeedbackDto,
  OutcomeVerificationDto,
  ReviewOutcomeVerificationDto,
  InnovationOutcomeDto,
  CreateInnovationOutcomeDto,
} from '@sicp/shared';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { RecurrenceDetectionEngine } from '../../domain/intelligence/recurrence-detection.engine';
import { logger } from '../../utils/logger';

export class OutcomeService {
  /**
   * Submits citizen feedback for a deployed project/challenge with duplicate protection.
   */
  public static async submitCitizenFeedback(params: {
    projectId?: string;
    challengeId?: string;
    dto: CreateCitizenFeedbackDto;
    citizenId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }): Promise<CitizenFeedbackDto> {
    const { projectId, challengeId, dto, citizenId, actorRole, requestId, ipAddress } = params;

    let project = null;
    if (projectId) {
      project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { challenge: true },
      });
    } else if (challengeId) {
      project = await prisma.project.findFirst({
        where: { challengeId },
        include: { challenge: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!project) {
      throw new NotFoundError('Project', projectId || challengeId || 'unknown');
    }

    // Verify project has reached deployment or completed stage
    const eligibleStatuses: ProjectStatus[] = [
      ProjectStatus.DEPLOYMENT,
      ProjectStatus.COMPLETED,
      ProjectStatus.PILOT,
    ];
    if (!eligibleStatuses.includes(project.status as ProjectStatus)) {
      throw new ValidationError(
        `Cannot submit citizen outcome verification for project in ${project.status} status. It must be in pilot or deployment.`
      );
    }

    // Duplicate check: prevent duplicate feedback submissions by same citizen
    const existing = await prisma.citizenVerification.findFirst({
      where: { projectId: project.id, citizenId },
    });

    if (existing) {
      throw new ConflictError('You have already submitted feedback for this deployed solution.');
    }

    const verification = await prisma.$transaction(async tx => {
      const created = await tx.citizenVerification.create({
        data: {
          projectId: project.id,
          challengeId: project.challengeId,
          citizenId,
          rating: dto.rating,
          comments: dto.comments,
          verifiedImprovement: dto.verifiedImprovement,
          problemStatus: dto.problemStatus,
          effectivenessRating: dto.effectivenessRating,
          improvementRating: dto.improvementRating,
          unresolvedIssues: dto.unresolvedIssues,
          introducedNewIssues: dto.introducedNewIssues,
          isRecurrenceReported: dto.isRecurrenceReported || dto.problemStatus === CitizenProblemStatus.NO,
          evidenceFileKey: dto.evidenceFileKey,
        },
        include: { citizen: true },
      });

      await AuditService.log({
        actorId: citizenId,
        actorRole,
        action: AuditAction.CITIZEN_FEEDBACK_SUBMITTED,
        resource: 'CitizenVerification',
        resourceId: created.id,
        previousState: null,
        newState: created,
        reason: `Citizen feedback submitted: Improvement=${dto.verifiedImprovement}, Rating=${dto.rating}/5, Status=${dto.problemStatus}`,
        requestId,
        ipAddress,
      });

      return created;
    });

    // If citizen indicates problem persists or recurrence, trigger background recurrence detection
    if (dto.problemStatus === CitizenProblemStatus.NO || dto.isRecurrenceReported) {
      try {
        await RecurrenceDetectionEngine.detectRecurrence({
          challengeId: project.challengeId,
          category: project.challenge.category,
          title: project.challenge.title,
          description: dto.comments,
          latitude: project.challenge.latitude,
          longitude: project.challenge.longitude,
          district: project.challenge.district,
          state: project.challenge.state,
          actorId: citizenId,
          requestId,
        });

        // Notify government officers of persistent issue / recurrence alert
        const govUsers = await prisma.user.findMany({
          where: { role: { in: [UserRole.GOVERNMENT_OFFICER, UserRole.GOVERNMENT_DEPARTMENT] } },
        });
        for (const gov of govUsers) {
          await NotificationService.create({
            recipientId: gov.id,
            title: 'Citizen Recurrence Alert',
            message: `Citizen reported problem persists for deployed project "${project.title}": ${dto.comments.slice(0, 100)}...`,
            type: 'RECURRENCE_ALERT',
            actionUrl: `/projects/${project.id}?tab=outcomes`,
          });
        }
      } catch (err) {
        logger.warn(`Failed to process recurrence detection after citizen feedback: ${(err as Error).message}`);
      }
    }

    return this.mapFeedbackToDto(verification);
  }

  /**
   * Conducts official government outcome verification review.
   * On VERIFIED: Marks Project as COMPLETED and Challenge as RESOLVED!
   * On NOT_VERIFIED: Requires follow-up action with zero dead ends.
   */
  public static async verifyOutcome(params: {
    projectId: string;
    dto: ReviewOutcomeVerificationDto;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }): Promise<OutcomeVerificationDto> {
    const { projectId, dto, actorId, actorRole, requestId, ipAddress } = params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { challenge: true },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    if (dto.status === OutcomeVerificationStatus.NOT_VERIFIED && !dto.followUpAction) {
      throw new ValidationError(
        'Marking an outcome as NOT_VERIFIED requires an explicit follow-up action plan to prevent dead ends.'
      );
    }

    const verification = await prisma.$transaction(async tx => {
      const created = await tx.projectOutcomeVerification.create({
        data: {
          projectId,
          challengeId: project.challengeId,
          reviewerId: actorId,
          status: dto.status,
          baselineSummary: dto.baselineSummary,
          targetSummary: dto.targetSummary,
          observedSummary: dto.observedSummary,
          calculatedImpact: (dto.calculatedImpact as any) || {},
          citizenFeedbackSummary: (dto.citizenFeedbackSummary as any) || {},
          limitations: dto.limitations,
          followUpRequired: dto.followUpRequired || dto.status === OutcomeVerificationStatus.NOT_VERIFIED,
          followUpAction: dto.followUpAction,
          notes: dto.notes,
          verifiedAt: (dto.status === OutcomeVerificationStatus.VERIFIED || dto.status === OutcomeVerificationStatus.VERIFIED_WITH_LIMITATIONS)
            ? new Date()
            : null,
        },
        include: { reviewer: true },
      });

      // If fully verified, complete project and resolve challenge
      if (dto.status === OutcomeVerificationStatus.VERIFIED) {
        await tx.project.update({
          where: { id: projectId },
          data: { status: ProjectStatus.COMPLETED },
        });

        await tx.challenge.update({
          where: { id: project.challengeId },
          data: { status: ChallengeStatus.RESOLVED },
        });

        await tx.challengeTimeline.create({
          data: {
            challengeId: project.challengeId,
            fromStatus: ChallengeStatus.DEPLOYED,
            toStatus: ChallengeStatus.RESOLVED,
            actorId,
            reason: `Challenge officially RESOLVED following outcome verification: ${dto.observedSummary}`,
          },
        });
      }

      await AuditService.log({
        actorId,
        actorRole,
        action: AuditAction.OUTCOME_VERIFIED,
        resource: 'ProjectOutcomeVerification',
        resourceId: created.id,
        previousState: null,
        newState: created,
        reason: `Outcome verification decision: ${dto.status}. Follow-up: ${dto.followUpAction || 'None'}`,
        requestId,
        ipAddress,
      });

      return created;
    });

    return this.mapVerificationToDto(verification);
  }

  /**
   * Records a formal innovation outcome (e.g. PATENT_FILED, RESEARCH_PUBLICATION, STARTUP, SOCIAL_IMPACT).
   */
  public static async recordInnovationOutcome(params: {
    projectId: string;
    dto: CreateInnovationOutcomeDto;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }): Promise<InnovationOutcomeDto> {
    const { projectId, dto, actorId, actorRole, requestId, ipAddress } = params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    const outcome = await prisma.$transaction(async tx => {
      const created = await tx.innovationOutcome.create({
        data: {
          projectId,
          challengeId: project.challengeId,
          outcomeType: dto.outcomeType,
          title: dto.title,
          description: dto.description,
          referenceIdentifier: dto.referenceIdentifier,
          verifiedBeneficiaries: dto.verifiedBeneficiaries || 0,
          measurableImpactSummary: dto.measurableImpactSummary,
          evidenceUrl: dto.evidenceUrl,
          responsibleOrg: dto.responsibleOrg,
          isVerified: actorRole === UserRole.GOVERNMENT_OFFICER || actorRole === UserRole.SYSTEM_ADMIN,
          verifiedById: (actorRole === UserRole.GOVERNMENT_OFFICER || actorRole === UserRole.SYSTEM_ADMIN) ? actorId : null,
          verifiedAt: (actorRole === UserRole.GOVERNMENT_OFFICER || actorRole === UserRole.SYSTEM_ADMIN) ? new Date() : null,
        },
      });

      await AuditService.log({
        actorId,
        actorRole,
        action: AuditAction.INNOVATION_OUTCOME_RECORDED,
        resource: 'InnovationOutcome',
        resourceId: created.id,
        previousState: null,
        newState: created,
        reason: `Innovation outcome recorded: [${dto.outcomeType}] ${dto.title}`,
        requestId,
        ipAddress,
      });

      return created;
    });

    return this.mapInnovationToDto(outcome);
  }

  /**
   * Retrieves all citizen feedback for a project or challenge.
   */
  public static async getCitizenFeedback(id: string): Promise<CitizenFeedbackDto[]> {
    const feedback = await prisma.citizenVerification.findMany({
      where: {
        OR: [
          { projectId: id },
          { challengeId: id },
        ],
      },
      include: { citizen: true },
      orderBy: { createdAt: 'desc' },
    });

    return feedback.map(f => this.mapFeedbackToDto(f));
  }

  /**
   * Retrieves official outcome verifications for a project.
   */
  public static async getOutcomeVerifications(projectId: string): Promise<OutcomeVerificationDto[]> {
    const verifications = await prisma.projectOutcomeVerification.findMany({
      where: { projectId },
      include: { reviewer: true },
      orderBy: { createdAt: 'desc' },
    });

    return verifications.map(v => this.mapVerificationToDto(v));
  }

  /**
   * Retrieves innovation outcomes for a project.
   */
  public static async getInnovationOutcomes(projectId: string): Promise<InnovationOutcomeDto[]> {
    const outcomes = await prisma.innovationOutcome.findMany({
      where: { projectId },
      orderBy: { registeredAt: 'desc' },
    });

    return outcomes.map(o => this.mapInnovationToDto(o));
  }

  private static mapFeedbackToDto(f: any): CitizenFeedbackDto {
    return {
      id: f.id,
      projectId: f.projectId,
      challengeId: f.challengeId,
      citizenId: f.citizenId,
      citizenName: f.citizen?.fullName,
      rating: f.rating,
      comments: f.comments,
      verifiedImprovement: f.verifiedImprovement,
      problemStatus: f.problemStatus,
      effectivenessRating: f.effectivenessRating,
      improvementRating: f.improvementRating,
      unresolvedIssues: f.unresolvedIssues,
      introducedNewIssues: f.introducedNewIssues,
      isRecurrenceReported: f.isRecurrenceReported,
      evidenceFileKey: f.evidenceFileKey,
      createdAt: f.createdAt.toISOString(),
    };
  }

  private static mapVerificationToDto(v: any): OutcomeVerificationDto {
    return {
      id: v.id,
      projectId: v.projectId,
      challengeId: v.challengeId,
      reviewerId: v.reviewerId,
      reviewerName: v.reviewer?.fullName,
      status: v.status as OutcomeVerificationStatus,
      baselineSummary: v.baselineSummary,
      targetSummary: v.targetSummary,
      observedSummary: v.observedSummary,
      calculatedImpact: v.calculatedImpact as Record<string, unknown> | null,
      citizenFeedbackSummary: v.citizenFeedbackSummary as Record<string, unknown> | null,
      limitations: v.limitations,
      followUpRequired: v.followUpRequired,
      followUpAction: v.followUpAction,
      notes: v.notes,
      verifiedAt: v.verifiedAt ? v.verifiedAt.toISOString() : null,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    };
  }

  private static mapInnovationToDto(o: any): InnovationOutcomeDto {
    return {
      id: o.id,
      projectId: o.projectId,
      challengeId: o.challengeId,
      outcomeType: o.outcomeType as OutcomeType,
      title: o.title,
      description: o.description,
      referenceIdentifier: o.referenceIdentifier,
      verifiedBeneficiaries: o.verifiedBeneficiaries,
      measurableImpactSummary: o.measurableImpactSummary,
      evidenceUrl: o.evidenceUrl,
      responsibleOrg: o.responsibleOrg,
      isVerified: o.isVerified,
      verifiedById: o.verifiedById,
      verifiedAt: o.verifiedAt ? o.verifiedAt.toISOString() : null,
      registeredAt: o.registeredAt.toISOString(),
    };
  }
}
