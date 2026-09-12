import { prisma } from '../../database/prisma';
import {
  UserRole,
  ChallengeStatus,
  RelationshipType,
  RelationshipStatus,
  AuditAction,
  SeverityLevel,
  PriorityLevel,
} from '@sicp/shared';
import { PriorityEngine } from './priority.engine';
import { ValidationError, NotFoundError, ForbiddenError } from '../../utils/errors';

export interface ExecuteMergeParams {
  canonicalChallengeId?: string; // If null, a new systemic parent will be created
  sourceChallengeIds: string[];
  systemicTitle?: string;
  systemicDescription?: string;
  category?: string;
  district?: string;
  state?: string;
  rootCauseTitle?: string;
  rootCauseSummary?: string;
  actorId: string;
  actorRole: UserRole;
  reason: string;
  requestId?: string;
  ipAddress?: string;
}

export interface ExecuteUnmergeParams {
  clusterId: string;
  actorId: string;
  actorRole: UserRole;
  reversalReason: string;
  requestId?: string;
  ipAddress?: string;
}

export class ProblemConsolidationService {
  /**
   * Validate role has permission to execute or reverse merges
   */
  private static validateGovernanceRole(role: UserRole) {
    const allowedRoles: UserRole[] = [
      UserRole.GOVERNMENT_OFFICER,
      UserRole.GOVERNMENT_DEPARTMENT,
      UserRole.SYSTEM_ADMIN,
    ];
    if (!allowedRoles.includes(role)) {
      throw new ForbiddenError('Only authorized Government Officers or System Admins can execute problem merges and reversals.');
    }
  }

  /**
   * Execute an atomic consolidation of civic challenges into a canonical problem or new systemic parent
   */
  public static async executeMerge(params: ExecuteMergeParams) {
    this.validateGovernanceRole(params.actorRole);

    if (!params.sourceChallengeIds || params.sourceChallengeIds.length === 0) {
      throw new ValidationError('At least one source challenge ID is required for consolidation.');
    }

    if (!params.reason || params.reason.trim().length < 5) {
      throw new ValidationError('A detailed official governance reason is required to execute a problem merge.');
    }

    // Deduplicate input source IDs
    const uniqueSourceIds = Array.from(new Set(params.sourceChallengeIds));

    return await prisma.$transaction(async tx => {
      let canonicalId = params.canonicalChallengeId;
      let canonicalChallenge: any = null;

      if (canonicalId) {
        // Prevent self-merge
        if (uniqueSourceIds.includes(canonicalId)) {
          throw new ValidationError('A canonical challenge cannot be merged into itself.');
        }

        canonicalChallenge = await tx.challenge.findUnique({
          where: { id: canonicalId },
          include: {
            evidence: true,
            communityVotes: true,
          },
        });

        if (!canonicalChallenge) {
          throw new NotFoundError('Canonical Challenge', canonicalId);
        }

        if (canonicalChallenge.status === ChallengeStatus.MERGED_INTO_SYSTEMIC) {
          throw new ValidationError('The designated canonical challenge is already merged into another systemic issue. Unmerge it first.');
        }

        if (canonicalChallenge.status === ChallengeStatus.CLOSED || !!canonicalChallenge.deletedAt) {
          throw new ValidationError('Cannot merge challenges into an archived or closed challenge.');
        }
      } else {
        // Creating a new systemic parent challenge
        if (!params.systemicTitle || !params.category) {
          throw new ValidationError('Systemic title and category are required when creating a new parent systemic challenge.');
        }

        canonicalChallenge = await tx.challenge.create({
          data: {
            title: params.systemicTitle,
            description: params.systemicDescription || params.systemicTitle,
            category: params.category,
            district: params.district || null,
            state: params.state || null,
            isSystemic: true,
            isCanonical: true,
            systemicSummary: `Systemic issue consolidated by ${params.actorRole}. Root cause: ${params.rootCauseTitle || params.reason}`,
            status: ChallengeStatus.UNDER_GOV_REVIEW,
            submitterId: params.actorId,
            version: 1,
          },
          include: {
            evidence: true,
            communityVotes: true,
          },
        });

        canonicalId = canonicalChallenge.id;
      }

      // Fetch all source challenges
      const sourceChallenges = await tx.challenge.findMany({
        where: { id: { in: uniqueSourceIds }, deletedAt: null },
        include: {
          evidence: true,
          communityVotes: true,
        },
      });

      if (sourceChallenges.length === 0) {
        throw new ValidationError('No valid source challenges found to merge.');
      }

      for (const src of sourceChallenges) {
        if (src.id === canonicalId) {
          throw new ValidationError(`Source challenge ${src.id} cannot be the same as the canonical target.`);
        }
        if (src.status === ChallengeStatus.MERGED_INTO_SYSTEMIC) {
          throw new ValidationError(`Challenge "${src.title}" (${src.id}) is already merged into another issue.`);
        }
      }

      // Create ProblemCluster
      const cluster = await tx.problemCluster.create({
        data: {
          title: canonicalChallenge.title,
          description: canonicalChallenge.description,
          category: canonicalChallenge.category,
          canonicalChallengeId: canonicalId,
          rootCauseTitle: params.rootCauseTitle || `Systemic Root Cause for ${canonicalChallenge.title}`,
          rootCauseSummary: params.rootCauseSummary || params.reason,
          confidenceScore: 0.95,
          status: RelationshipStatus.APPROVED,
          createdById: params.actorId,
          reviewedById: params.actorId,
          reviewedAt: new Date(),
          metadata: {
            mergedSourceCount: sourceChallenges.length,
            governanceReason: params.reason,
            actorRole: params.actorRole,
          },
        },
      });

      // Add canonical member to cluster
      await tx.problemClusterMember.create({
        data: {
          clusterId: cluster.id,
          challengeId: canonicalId!,
          isCanonical: true,
        },
      });

      // Mark canonical challenge flag
      await tx.challenge.update({
        where: { id: canonicalId },
        data: {
          isCanonical: true,
          canonicalClusterId: cluster.id,
        },
      });

      // Attach all source challenges to cluster and update their state
      const uniqueSubmitters = new Set<string>([canonicalChallenge.submitterId]);
      let totalEvidenceCount = canonicalChallenge.evidence?.length || 0;
      let totalUniqueVotes = new Set<string>(
        (canonicalChallenge.communityVotes || []).map((v: any) => v.userId)
      );
      let aggregatedPopulation = canonicalChallenge.affectedPopulation || 0;

      for (const src of sourceChallenges) {
        uniqueSubmitters.add(src.submitterId);
        totalEvidenceCount += src.evidence?.length || 0;
        (src.communityVotes || []).forEach((v: any) => totalUniqueVotes.add(v.userId));
        if (src.affectedPopulation) {
          aggregatedPopulation += src.affectedPopulation;
        }

        // Add to cluster members
        await tx.problemClusterMember.create({
          data: {
            clusterId: cluster.id,
            challengeId: src.id,
            isCanonical: false,
          },
        });

        // Link ChallengeRelationship
        await tx.challengeRelationship.create({
          data: {
            sourceChallengeId: src.id,
            targetChallengeId: canonicalId!,
            relationType: canonicalChallenge.isSystemic
              ? RelationshipType.SYSTEMIC_CHILD
              : RelationshipType.DUPLICATE,
            status: RelationshipStatus.MERGED,
            confidenceScore: 0.95,
            reasoning: `Consolidated by ${params.actorRole}: ${params.reason}`,
            approvedById: params.actorId,
            reviewedAt: new Date(),
          },
        });

        // Update source challenge status
        await tx.challenge.update({
          where: { id: src.id },
          data: {
            status: ChallengeStatus.MERGED_INTO_SYSTEMIC,
            version: { increment: 1 },
          },
        });

        // Add timeline entry
        await tx.challengeTimeline.create({
          data: {
            challengeId: src.id,
            fromStatus: src.status,
            toStatus: ChallengeStatus.MERGED_INTO_SYSTEMIC,
            actorId: params.actorId,
            reason: `Consolidated into canonical problem "${canonicalChallenge.title}" (${canonicalId}): ${params.reason}`,
            metadata: {
              canonicalChallengeId: canonicalId,
              clusterId: cluster.id,
            },
          },
        });

        // Send notification to submitter
        await tx.notification.create({
          data: {
            recipientId: src.submitterId,
            title: 'Your civic report has been consolidated into a master problem',
            message: `Your report "${src.title}" has been verified and merged into canonical problem "${canonicalChallenge.title}". Your submission credit and evidence are fully preserved.`,
            type: 'CHALLENGE_MERGED',
            actionUrl: `/challenges/${canonicalId}`,
          },
        });
      }

      // Anti-spam deduplicated priority recalculation
      const previousPriorityScore = canonicalChallenge.priorityScore || 0;
      const recalculated = PriorityEngine.calculate({
        severity: canonicalChallenge.severity as SeverityLevel,
        urgency: canonicalChallenge.priority as PriorityLevel,
        affectedPopulation: aggregatedPopulation,
        durationMonths: canonicalChallenge.durationMonths || 1,
        communityVotesCount: totalUniqueVotes.size,
        evidenceCount: totalEvidenceCount,
      });

      const effectiveNewScore = Math.max(previousPriorityScore, recalculated.score);
      const effectivePriorityLevel = effectiveNewScore > recalculated.score
        ? ((canonicalChallenge.priority as PriorityLevel) || recalculated.priorityLevel)
        : recalculated.priorityLevel;

      await tx.challenge.update({
        where: { id: canonicalId },
        data: {
          priorityScore: effectiveNewScore,
          priority: effectivePriorityLevel,
          affectedPopulation: aggregatedPopulation,
        },
      });

      // Create ProblemMergeDecision audit record
      const decision = await tx.problemMergeDecision.create({
        data: {
          clusterId: cluster.id,
          canonicalChallengeId: canonicalId!,
          sourceChallengeIds: uniqueSourceIds,
          action: 'MERGE',
          decisionReason: params.reason,
          decidedById: params.actorId,
          previousPriorityScore,
          newPriorityScore: effectiveNewScore,
          affectedPopulationTotal: aggregatedPopulation,
          evidenceSnapshot: {
            totalEvidenceCount,
            uniqueSubmitterCount: uniqueSubmitters.size,
            uniqueVoteCount: totalUniqueVotes.size,
            sourceTitles: sourceChallenges.map(s => ({ id: s.id, title: s.title })),
          },
          metadata: {
            actorRole: params.actorRole,
            requestId: params.requestId || null,
          },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: params.actorId,
          actorRole: params.actorRole,
          action: AuditAction.PROBLEM_MERGED,
          resource: 'ProblemCluster',
          resourceId: cluster.id,
          newState: {
            clusterId: cluster.id,
            canonicalChallengeId: canonicalId,
            sourceChallengeIds: uniqueSourceIds,
            newPriorityScore: effectiveNewScore,
          },
          reason: params.reason,
          requestId: params.requestId || 'REQ-MERGE',
          ipAddress: params.ipAddress || null,
        },
      });

      return {
        clusterId: cluster.id,
        canonicalChallengeId: canonicalId,
        mergedSourceCount: sourceChallenges.length,
        previousPriorityScore,
        newPriorityScore: effectiveNewScore,
        decisionId: decision.id,
      };
    });
  }

  /**
   * Reversible Unmerge: Restores source challenges and resets cluster/canonical state
   */
  public static async executeUnmerge(params: ExecuteUnmergeParams) {
    this.validateGovernanceRole(params.actorRole);

    if (!params.reversalReason || params.reversalReason.trim().length < 5) {
      throw new ValidationError('A detailed official reversal justification is required to unmerge challenges.');
    }

    return await prisma.$transaction(async tx => {
      const cluster = await tx.problemCluster.findUnique({
        where: { id: params.clusterId },
        include: {
          members: {
            include: {
              challenge: {
                include: {
                  evidence: true,
                  communityVotes: true,
                },
              },
            },
          },
          canonicalChallenge: {
            include: {
              evidence: true,
              communityVotes: true,
            },
          },
        },
      });

      if (!cluster) {
        throw new NotFoundError('ProblemCluster', params.clusterId);
      }

      if (cluster.status === RelationshipStatus.REVERSED) {
        throw new ValidationError('This problem cluster has already been reversed / unmerged.');
      }

      const canonicalMember = cluster.members.find(m => m.isCanonical);
      const sourceMembers = cluster.members.filter(m => !m.isCanonical);

      const sourceChallengeIds: string[] = [];

      // Restore each source challenge
      for (const member of sourceMembers) {
        sourceChallengeIds.push(member.challengeId);

        await tx.challenge.update({
          where: { id: member.challengeId },
          data: {
            status: ChallengeStatus.SUBMITTED, // Return to active governance queue
            version: { increment: 1 },
          },
        });

        // Update relationship to REVERSED
        await tx.challengeRelationship.updateMany({
          where: {
            sourceChallengeId: member.challengeId,
            targetChallengeId: cluster.canonicalChallengeId || undefined,
          },
          data: {
            status: RelationshipStatus.REVERSED,
            reversalReason: params.reversalReason,
            reversedAt: new Date(),
            reversedById: params.actorId,
          },
        });

        // Add timeline reversal entry
        await tx.challengeTimeline.create({
          data: {
            challengeId: member.challengeId,
            fromStatus: ChallengeStatus.MERGED_INTO_SYSTEMIC,
            toStatus: ChallengeStatus.SUBMITTED,
            actorId: params.actorId,
            reason: `Unmerged from cluster "${cluster.title}": ${params.reversalReason}`,
            metadata: {
              clusterId: cluster.id,
              reversalReason: params.reversalReason,
            },
          },
        });

        // Notify submitter
        await tx.notification.create({
          data: {
            recipientId: member.challenge.submitterId,
            title: 'Your civic report has been unmerged into an independent issue',
            message: `Your report "${member.challenge.title}" was restored to active independent status. Reason: ${params.reversalReason}`,
            type: 'CHALLENGE_UNMERGED',
            actionUrl: `/challenges/${member.challengeId}`,
          },
        });
      }

      // Mark cluster as REVERSED
      await tx.problemCluster.update({
        where: { id: cluster.id },
        data: {
          status: RelationshipStatus.REVERSED,
          reversalReason: params.reversalReason,
          reversedAt: new Date(),
          reversedById: params.actorId,
        },
      });

      // Recalculate canonical priority without source challenges
      let newCanonicalScore = 0;
      if (cluster.canonicalChallenge) {
        const canonical = cluster.canonicalChallenge;
        const recalculated = PriorityEngine.calculate({
          severity: canonical.severity as SeverityLevel,
          urgency: canonical.priority as PriorityLevel,
          affectedPopulation: canonical.affectedPopulation || 1,
          durationMonths: canonical.durationMonths || 1,
          communityVotesCount: canonical.communityVotes?.length || 0,
          evidenceCount: canonical.evidence?.length || 0,
        });

        newCanonicalScore = recalculated.score;

        await tx.challenge.update({
          where: { id: canonical.id },
          data: {
            priorityScore: recalculated.score,
            priority: recalculated.priorityLevel,
          },
        });
      }

      // Create ProblemMergeDecision for UNMERGE
      const decision = await tx.problemMergeDecision.create({
        data: {
          clusterId: cluster.id,
          canonicalChallengeId: cluster.canonicalChallengeId || 'N/A',
          sourceChallengeIds,
          action: 'UNMERGE',
          decisionReason: params.reversalReason,
          decidedById: params.actorId,
          previousPriorityScore: cluster.canonicalChallenge?.priorityScore || null,
          newPriorityScore: newCanonicalScore,
          metadata: {
            actorRole: params.actorRole,
            unmergedCount: sourceMembers.length,
          },
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorId: params.actorId,
          actorRole: params.actorRole,
          action: AuditAction.PROBLEM_UNMERGED,
          resource: 'ProblemCluster',
          resourceId: cluster.id,
          newState: {
            status: RelationshipStatus.REVERSED,
            unmergedChallengeIds: sourceChallengeIds,
          },
          reason: params.reversalReason,
          requestId: params.requestId || 'REQ-UNMERGE',
          ipAddress: params.ipAddress || null,
        },
      });

      return {
        clusterId: cluster.id,
        unmergedSourceCount: sourceMembers.length,
        restoredChallengeIds: sourceChallengeIds,
        decisionId: decision.id,
      };
    });
  }
}
