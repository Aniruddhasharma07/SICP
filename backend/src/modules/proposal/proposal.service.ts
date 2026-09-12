import { prisma } from '../../database/prisma';
import {
  ProposalStatus,
  ChallengeStatus,
  UserRole,
  AuditAction,
} from '@sicp/shared';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export interface CreateProposalParams {
  projectId: string;
  challengeId?: string;
  problemUnderstanding: string;
  rootCauseHypothesis: string;
  technicalApproach: string;
  budgetBreakdown?: Record<string, number>;
  expectedImpact: string;
  risksAndMitigations: string;
  sustainabilityPlan: string;
  actorId: string;
  actorRole: UserRole;
  requestId: string;
  ipAddress?: string;
}

export interface ReviewProposalParams {
  proposalId: string;
  decision: 'APPROVED' | 'REVISION_REQUESTED' | 'REJECTED';
  comments: string;
  requiredChanges?: string[];
  actorId: string;
  actorRole: UserRole;
  requestId: string;
  ipAddress?: string;
}

export class ProposalService {
  /**
   * Creates a new Solution Proposal (Version 1 or subsequent version).
   */
  public static async createProposal(params: CreateProposalParams) {
    const {
      projectId,
      challengeId,
      problemUnderstanding,
      rootCauseHypothesis,
      technicalApproach,
      budgetBreakdown,
      expectedImpact,
      risksAndMitigations,
      sustainabilityPlan,
      actorId,
      actorRole,
      requestId,
      ipAddress,
    } = params;

    if (!problemUnderstanding || !rootCauseHypothesis || !technicalApproach || !expectedImpact) {
      throw new ValidationError('problemUnderstanding, rootCauseHypothesis, technicalApproach, and expectedImpact are required.');
    }

    return await prisma.$transaction(async tx => {
      const project = await tx.project.findUnique({
        where: { id: projectId },
        include: { proposals: { orderBy: { version: 'desc' } } },
      });

      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      const effectiveChallengeId = challengeId || project.challengeId;

      // Determine version
      const latestVersion = project.proposals.length > 0 ? project.proposals[0].version : 0;
      const newVersion = latestVersion + 1;

      const proposal = await tx.projectProposal.create({
        data: {
          projectId,
          challengeId: effectiveChallengeId,
          authorId: actorId,
          version: newVersion,
          problemUnderstanding,
          rootCauseHypothesis,
          technicalApproach,
          budgetBreakdown: budgetBreakdown ? (budgetBreakdown as any) : undefined,
          expectedImpact,
          risksAndMitigations: risksAndMitigations || 'Standard mitigation protocol applied',
          sustainabilityPlan: sustainabilityPlan || 'Community handover and institutional maintenance plan',
          status: ProposalStatus.DRAFT,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: AuditAction.PROPOSAL_CREATED,
          resource: 'ProjectProposal',
          resourceId: proposal.id,
          newState: { projectId, version: newVersion, status: proposal.status },
          requestId,
          ipAddress: ipAddress || null,
        },
      });

      logger.info(`Proposal ${proposal.id} (V${newVersion}) created for project ${projectId} by ${actorId}`);

      return proposal;
    });
  }

  /**
   * Submits a solution proposal for government review.
   * Transitions challenge status to SOLUTION_PROPOSED.
   */
  public static async submitProposal(params: {
    proposalId: string;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }) {
    const { proposalId, actorId, actorRole, requestId, ipAddress } = params;

    return await prisma.$transaction(async tx => {
      const proposal = await tx.projectProposal.findUnique({
        where: { id: proposalId },
        include: { project: true },
      });

      if (!proposal) {
        throw new NotFoundError('ProjectProposal', proposalId);
      }

      if (proposal.status !== ProposalStatus.DRAFT && proposal.status !== ProposalStatus.REVISION_REQUESTED) {
        throw new ValidationError(`Cannot submit proposal in '${proposal.status}' status. Must be DRAFT or REVISION_REQUESTED.`);
      }

      const updated = await tx.projectProposal.update({
        where: { id: proposalId },
        data: {
          status: ProposalStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      });

      // Advance challenge status to SOLUTION_PROPOSED
      const challengeId = proposal.challengeId || proposal.project.challengeId;
      const challenge = await tx.challenge.findUnique({ where: { id: challengeId } });

      if (challenge) {
        await tx.challenge.update({
          where: { id: challengeId },
          data: {
            status: ChallengeStatus.SOLUTION_PROPOSED,
            version: { increment: 1 },
          },
        });

        await tx.challengeTimeline.create({
          data: {
            challengeId,
            fromStatus: challenge.status,
            toStatus: ChallengeStatus.SOLUTION_PROPOSED,
            actorId,
            reason: `Solution Proposal V${proposal.version} submitted for formal government review.`,
          },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: AuditAction.PROPOSAL_SUBMITTED,
          resource: 'ProjectProposal',
          resourceId: proposal.id,
          previousState: { status: proposal.status },
          newState: { status: updated.status, submittedAt: updated.submittedAt },
          requestId,
          ipAddress: ipAddress || null,
        },
      });

      // Notify government officers
      const officers = await tx.user.findMany({
        where: { role: 'GOVERNMENT_OFFICER', isActive: true },
        take: 5,
      });

      for (const officer of officers) {
        await tx.notification.create({
          data: {
            recipientId: officer.id,
            title: `New Solution Proposal Submitted (V${proposal.version})`,
            message: `Solution proposal submitted for project "${proposal.project.title}". Review required.`,
            type: 'PROPOSAL_SUBMISSION',
            actionUrl: `/government?tab=proposals&id=${proposalId}`,
          },
        });
      }

      logger.info(`Proposal ${proposalId} submitted by ${actorId}. Status: SUBMITTED.`);

      return updated;
    });
  }

  /**
   * Government officer reviews solution proposal (Approve, Request Revision, Reject).
   */
  public static async reviewProposal(params: ReviewProposalParams) {
    const { proposalId, decision, comments, requiredChanges, actorId, actorRole, requestId, ipAddress } = params;

    if (!comments || comments.trim().length < 5) {
      throw new ValidationError('Review comments must be at least 5 characters.');
    }

    if (decision === 'REVISION_REQUESTED' && (!requiredChanges || requiredChanges.length === 0)) {
      throw new ValidationError('Specific requiredChanges array must be provided when requesting revisions.');
    }

    return await prisma.$transaction(async tx => {
      const proposal = await tx.projectProposal.findUnique({
        where: { id: proposalId },
        include: { project: true, author: true },
      });

      if (!proposal) {
        throw new NotFoundError('ProjectProposal', proposalId);
      }

      if (proposal.status !== ProposalStatus.SUBMITTED && proposal.status !== ProposalStatus.UNDER_GOV_REVIEW) {
        throw new ValidationError(`Proposal must be in SUBMITTED or UNDER_GOV_REVIEW status to review. Current: ${proposal.status}`);
      }

      const proposalStatusMap: Record<string, ProposalStatus> = {
        APPROVED: ProposalStatus.APPROVED,
        REVISION_REQUESTED: ProposalStatus.REVISION_REQUESTED,
        REJECTED: ProposalStatus.REJECTED,
      };

      const newProposalStatus = proposalStatusMap[decision];

      const updated = await tx.projectProposal.update({
        where: { id: proposalId },
        data: {
          status: newProposalStatus,
          reviewComments: comments.trim(),
          rejectionReason: decision === 'REJECTED' ? comments.trim() : null,
          requiredChanges: requiredChanges ? (requiredChanges as any) : undefined,
          reviewedAt: new Date(),
        },
      });

      // Create ProposalReview record
      const reviewRecord = await tx.proposalReview.create({
        data: {
          proposalId,
          reviewerId: actorId,
          decision: newProposalStatus,
          comments: comments.trim(),
          requiredChanges: requiredChanges ? (requiredChanges as any) : undefined,
        },
      });

      const challengeId = proposal.challengeId || proposal.project.challengeId;
      const challenge = await tx.challenge.findUnique({ where: { id: challengeId } });

      // Handle challenge state transition based on review decision
      if (challenge) {
        if (decision === 'REVISION_REQUESTED') {
          // Revert challenge to IN_RESEARCH so team can revise
          await tx.challenge.update({
            where: { id: challengeId },
            data: {
              status: ChallengeStatus.IN_RESEARCH,
              version: { increment: 1 },
            },
          });

          await tx.challengeTimeline.create({
            data: {
              challengeId,
              fromStatus: challenge.status,
              toStatus: ChallengeStatus.IN_RESEARCH,
              actorId,
              reason: `Government requested revision on Proposal V${proposal.version}: "${comments.trim()}"`,
            },
          });
        } else if (decision === 'APPROVED') {
          // Proposal approved! Note: Project activation is handled explicitly by ProjectService
          await tx.challengeTimeline.create({
            data: {
              challengeId,
              fromStatus: challenge.status,
              toStatus: ChallengeStatus.SOLUTION_PROPOSED,
              actorId,
              reason: `Government officially APPROVED Solution Proposal V${proposal.version}. Ready for Project Activation.`,
            },
          });
        } else if (decision === 'REJECTED') {
          await tx.challengeTimeline.create({
            data: {
              challengeId,
              fromStatus: challenge.status,
              toStatus: challenge.status,
              actorId,
              reason: `Government rejected Solution Proposal V${proposal.version}: "${comments.trim()}"`,
            },
          });
        }
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: AuditAction.PROPOSAL_REVIEWED,
          resource: 'ProjectProposal',
          resourceId: proposalId,
          previousState: { status: proposal.status },
          newState: { status: updated.status, decision, reviewId: reviewRecord.id },
          reason: comments.trim(),
          requestId,
          ipAddress: ipAddress || null,
        },
      });

      // Notify author / lead faculty
      if (proposal.authorId) {
        await tx.notification.create({
          data: {
            recipientId: proposal.authorId,
            title: `Proposal V${proposal.version} ${decision}: "${proposal.project.title}"`,
            message: `Government reviewer decision: ${decision}. ${comments.trim()}`,
            type: 'PROPOSAL_REVIEW',
            actionUrl: `/university?tab=proposals&id=${proposalId}`,
          },
        });
      }

      logger.info(`Proposal ${proposalId} reviewed by ${actorId}: ${decision}`);

      return {
        proposal: updated,
        review: reviewRecord,
      };
    });
  }

  /**
   * Retrieves proposal with full version history and reviews.
   */
  public static async getProposal(proposalId: string) {
    const proposal = await prisma.projectProposal.findUnique({
      where: { id: proposalId },
      include: {
        project: {
          include: {
            proposals: { orderBy: { version: 'desc' } },
            team: { include: { leadFaculty: true, members: { include: { user: true } } } },
          },
        },
        author: true,
        reviews: {
          include: { reviewer: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundError('ProjectProposal', proposalId);
    }

    return proposal;
  }
}
