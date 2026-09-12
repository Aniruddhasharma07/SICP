import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma';
import { sendSuccess } from '../../utils/response';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import {
  RelationshipStatus,
  RelationshipType,
  ChallengeStatus,
  UserRole,
  AuditAction,
  ChallengeRelationshipDto,
  ProblemClusterDto,
} from '@sicp/shared';
import { DuplicateClusteringService } from '../../domain/intelligence/duplicate-clustering.service';
import { ProblemConsolidationService } from '../../domain/intelligence/problem-consolidation.service';
import { AuditService } from '../audit/audit.service';

export class RelationshipController {
  /**
   * Get all active and candidate relationships for a challenge
   */
  public static async getChallengeRelationships(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challengeId = req.params.id;

      const relations = await prisma.challengeRelationship.findMany({
        where: {
          OR: [
            { sourceChallengeId: challengeId },
            { targetChallengeId: challengeId },
          ],
        },
        include: {
          sourceChallenge: {
            select: { id: true, title: true, category: true, status: true, severity: true },
          },
          targetChallenge: {
            select: { id: true, title: true, category: true, status: true, severity: true },
          },
        },
        orderBy: { confidenceScore: 'desc' },
      });

      const formatted: ChallengeRelationshipDto[] = relations.map(r => ({
        id: r.id,
        sourceChallengeId: r.sourceChallengeId,
        targetChallengeId: r.targetChallengeId,
        sourceChallengeTitle: r.sourceChallenge.title,
        targetChallengeTitle: r.targetChallenge.title,
        relationType: r.relationType as unknown as RelationshipType,
        status: r.status as unknown as RelationshipStatus,
        confidenceScore: r.confidenceScore,
        reasoning: r.reasoning,
        factorBreakdown: (r.factorBreakdown as any) || undefined,
        distanceMeters: r.distanceMeters,
        aiExplanation: r.aiExplanation,
        sharedInfrastructure: r.sharedInfrastructure,
        model: r.model,
        modelVersion: r.modelVersion,
        approvedById: r.approvedById,
        reviewedAt: r.reviewedAt?.toISOString() || null,
        reversalReason: r.reversalReason,
        reversedAt: r.reversedAt?.toISOString() || null,
        reversedById: r.reversedById,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));

      sendSuccess(res, formatted, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieve duplicate candidates for a challenge with explainability
   */
  public static async getDuplicates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challengeId = req.params.id;
      const limit = Number(req.query.limit) || 5;
      const candidates = await DuplicateClusteringService.findDuplicateCandidates(challengeId, limit);
      sendSuccess(res, candidates, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieve systemic grouping candidates for a challenge
   */
  public static async getSystemicCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challengeId = req.params.id;
      const limit = Number(req.query.limit) || 5;
      const candidates = await DuplicateClusteringService.findSystemicCandidates(challengeId, limit);
      sendSuccess(res, candidates, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Problem Cluster details by ID
   */
  public static async getCluster(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clusterId = req.params.id;

      const cluster = await prisma.problemCluster.findUnique({
        where: { id: clusterId },
        include: {
          canonicalChallenge: {
            select: { id: true, title: true, status: true, category: true, district: true, state: true, priorityScore: true },
          },
          members: {
            include: {
              challenge: {
                select: { id: true, title: true, category: true, status: true, district: true, state: true, priorityScore: true, createdAt: true },
              },
            },
          },
          decisions: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!cluster) {
        throw new NotFoundError('ProblemCluster', clusterId);
      }

      const dto: ProblemClusterDto = {
        id: cluster.id,
        canonicalId: cluster.canonicalChallengeId,
        canonicalTitle: cluster.canonicalChallenge?.title || null,
        title: cluster.title,
        rootCauseTitle: cluster.rootCauseTitle || cluster.title,
        rootCauseSummary: cluster.rootCauseSummary || cluster.description || '',
        category: cluster.category,
        district: cluster.canonicalChallenge?.district || null,
        state: cluster.canonicalChallenge?.state || null,
        clusterType: RelationshipType.SYSTEMIC_ROOT_CAUSE,
        confidenceScore: cluster.confidenceScore,
        status: cluster.status as unknown as RelationshipStatus,
        memberCount: cluster.members.length,
        memberChallengeIds: cluster.members.map(m => m.challengeId),
        members: cluster.members.map(m => ({
          challengeId: m.challenge.id,
          title: m.challenge.title,
          category: m.challenge.category,
          district: m.challenge.district,
          state: m.challenge.state,
          isCanonical: m.isCanonical,
          status: m.challenge.status as unknown as ChallengeStatus,
          createdAt: m.challenge.createdAt.toISOString(),
        })),
        createdAt: cluster.createdAt.toISOString(),
        updatedAt: cluster.updatedAt.toISOString(),
      };

      sendSuccess(res, { cluster: dto, decisions: cluster.decisions }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Review a relationship candidate (APPROVE, REJECT, REQUEST_EXPERT_REVIEW, MARK_RELATED, CONFIRM_DUPLICATE_MERGE)
   */
  public static async reviewRelationship(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { relationshipId, action, notes, executeMerge, canonicalChallengeId } = req.body;

      if (!relationshipId || !action) {
        throw new ValidationError('relationshipId and action are required.');
      }

      const validActions = ['APPROVE', 'REJECT', 'REQUEST_EXPERT_REVIEW', 'MARK_RELATED', 'CONFIRM_DUPLICATE_MERGE'];
      if (!validActions.includes(action)) {
        throw new ValidationError(`Invalid review action. Must be one of: ${validActions.join(', ')}`);
      }

      const relationship = await prisma.challengeRelationship.findUnique({
        where: { id: relationshipId },
      });

      if (!relationship) {
        throw new NotFoundError('ChallengeRelationship', relationshipId);
      }

      let newStatus: RelationshipStatus = RelationshipStatus.APPROVED;
      let newRelationType = relationship.relationType;

      if (action === 'REJECT') {
        newStatus = RelationshipStatus.REJECTED;
      } else if (action === 'REQUEST_EXPERT_REVIEW') {
        newStatus = RelationshipStatus.REQUIRES_EXPERT_REVIEW;
      } else if (action === 'MARK_RELATED') {
        newStatus = RelationshipStatus.APPROVED;
        newRelationType = RelationshipType.RELATED as unknown as import('@prisma/client').$Enums.RelationshipType;
      }

      // If confirming duplicate and executing merge
      let mergeResult: any = null;
      if (
        (action === 'CONFIRM_DUPLICATE_MERGE' || (action === 'APPROVE' && executeMerge)) &&
        relationship.relationType === (RelationshipType.DUPLICATE as unknown as import('@prisma/client').$Enums.RelationshipType)
      ) {
        const targetCanonicalId = canonicalChallengeId || relationship.targetChallengeId;
        const sourceMergedId =
          targetCanonicalId === relationship.targetChallengeId
            ? relationship.sourceChallengeId
            : relationship.targetChallengeId;

        mergeResult = await ProblemConsolidationService.executeMerge({
          canonicalChallengeId: targetCanonicalId,
          sourceChallengeIds: [sourceMergedId],
          reason: notes || 'Confirmed duplicate problem merge executed by Government Officer.',
          actorId: req.user!.id,
          actorRole: req.user!.role as UserRole,
          requestId: (res.locals.requestId as string) || 'REQ-CONFIRM-DUPLICATE',
          ipAddress: req.ip,
        });

        newStatus = RelationshipStatus.MERGED;
      }

      const updated = await prisma.challengeRelationship.update({
        where: { id: relationshipId },
        data: {
          status: newStatus as unknown as import('@prisma/client').$Enums.RelationshipStatus,
          relationType: newRelationType,
          approvedById: req.user!.id,
          reviewedAt: new Date(),
          reasoning: notes ? `${relationship.reasoning} | Review notes: ${notes}` : relationship.reasoning,
        },
      });

      await AuditService.record({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: AuditAction.RELATIONSHIP_REVIEWED,
        resource: 'ChallengeRelationship',
        resourceId: relationshipId,
        previousState: { status: relationship.status, relationType: relationship.relationType },
        newState: { status: newStatus, relationType: newRelationType, action, notes, mergeResult },
        reason: notes || `Relationship reviewed as ${action}`,
        requestId: (res.locals.requestId as string) || 'REQ-RELATIONSHIP-REVIEW',
        ipAddress: req.ip,
      });

      sendSuccess(res, { relationship: updated, mergeResult }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Execute atomic consolidation (merge)
   */
  public static async merge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        canonicalChallengeId,
        sourceChallengeIds,
        systemicTitle,
        systemicDescription,
        category,
        district,
        state,
        rootCauseTitle,
        rootCauseSummary,
        reason,
      } = req.body;

      const requestId = (res.locals.requestId as string) || 'REQ-CONSOLIDATION';

      const result = await ProblemConsolidationService.executeMerge({
        canonicalChallengeId,
        sourceChallengeIds,
        systemicTitle,
        systemicDescription,
        category,
        district,
        state,
        rootCauseTitle,
        rootCauseSummary,
        actorId: req.user!.id,
        actorRole: req.user!.role as UserRole,
        reason,
        requestId,
        ipAddress: req.ip,
      });

      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Execute reversible unmerge
   */
  public static async unmerge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clusterId = req.params.id;
      const { reversalReason } = req.body;

      const requestId = (res.locals.requestId as string) || 'REQ-UNMERGE';

      const result = await ProblemConsolidationService.executeUnmerge({
        clusterId,
        actorId: req.user!.id,
        actorRole: req.user!.role as UserRole,
        reversalReason,
        requestId,
        ipAddress: req.ip,
      });

      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get cluster and relationship intelligence analytics
   */
  public static async getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const totalClusters = await prisma.problemCluster.count();
      const activeClusters = await prisma.problemCluster.count({
        where: { status: RelationshipStatus.APPROVED },
      });
      const reversedClusters = await prisma.problemCluster.count({
        where: { status: RelationshipStatus.REVERSED },
      });

      const totalRelationships = await prisma.challengeRelationship.count();
      const duplicateCount = await prisma.challengeRelationship.count({
        where: { relationType: RelationshipType.DUPLICATE },
      });
      const systemicCount = await prisma.challengeRelationship.count({
        where: {
          relationType: { in: [RelationshipType.SYSTEMIC_ROOT_CAUSE, RelationshipType.SYSTEMIC_CHILD] },
        },
      });
      const recurringCount = await prisma.challengeRelationship.count({
        where: { relationType: RelationshipType.RECURRING },
      });

      const decisions = await prisma.problemMergeDecision.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      sendSuccess(
        res,
        {
          clusters: {
            total: totalClusters,
            active: activeClusters,
            reversed: reversedClusters,
          },
          relationships: {
            total: totalRelationships,
            duplicates: duplicateCount,
            systemic: systemicCount,
            recurring: recurringCount,
          },
          recentDecisions: decisions,
        },
        200
      );
    } catch (err) {
      next(err);
    }
  }
}
