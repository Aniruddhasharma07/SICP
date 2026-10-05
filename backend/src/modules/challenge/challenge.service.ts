import { prisma } from '../../database/prisma';
import {
  ChallengeDto,
  ChallengeStatus,
  AuditAction,
  UserRole,
  SeverityLevel,
  PriorityLevel,
  ChallengeTimelineDto,
  ChallengeEvidenceDto,
  ChallengeRelationshipDto,
  ProblemType,
  ImpactMetricType,
  ImpactTimeBasis,
  ImpactVerificationStatus,
  AdaptiveQuestionDto,
  ImpactMetricDto,
  IntentNextAction,
  ProblemIntentClassification,
  ContextAwareDuplicateCheckResultDto,
} from '@sicp/shared';
import { NotFoundError, AiUnavailableError, ValidationError } from '../../utils/errors';
import { StateMachineEngine } from '../../domain/state-machine/state-machine.engine';
import { AuditService } from '../audit/audit.service';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { AiServiceClient } from '../../domain/intelligence/ai-service.client';
import { ProblemIntentGateService } from '../../domain/intent/problem-intent-gate.service';
import { z } from 'zod';
import {
  createChallengeSchema,
  transitionChallengeSchema,
  checkDuplicatesSchema,
  mergeSystemicSchema,
  analyzeChallengeSchema,
  validateIntentSchema,
} from './challenge.schemas';
import { QueueManager } from '../../jobs/queue.manager';
import { PriorityEngine } from '../../domain/intelligence/priority.engine';
import { DuplicateClusteringService, ClusterCandidate } from '../../domain/intelligence/duplicate-clustering.service';
import { SlaService } from '../../domain/sla/sla.service';
import { ImpactService } from '../../domain/impact/impact.service';
import { ChallengeIntelligenceOrchestrator } from '../../domain/intelligence/challenge-intelligence.orchestrator';
import { SpatialPolicyEngine } from '../../domain/intelligence/spatial-policy.engine';
import { ProblemGroupingService } from '../../domain/intelligence/problem-grouping.service';
import { CategoryResolutionEngine } from '../../domain/intelligence/category-resolution.engine';
import { GeospatialService } from '../geospatial/geospatial.service';
import { SpatialQueryEngine } from '../../domain/intelligence/spatial-query.engine';
import { RelationshipScoringEngine } from '../../domain/intelligence/relationship-scoring.engine';

export class ChallengeService {
  public static async create(
    data: z.infer<typeof createChallengeSchema>,
    submitterId: string,
    submitterOrgId: string | null | undefined,
    context: { requestId: string; ipAddress?: string }
  ): Promise<ChallengeDto> {
    // Gate validation: Reject non-societal / gibberish submissions
    const intentValidation = await ProblemIntentGateService.validate(
      {
        title: data.title,
        description: data.description,
        category: data.category,
      },
      context.requestId
    );

    if (intentValidation.nextAction === IntentNextAction.BLOCKED) {
      throw new ValidationError(
        intentValidation.reason || 'The submission does not qualify as an actionable societal challenge.',
        { intent: intentValidation }
      );
    }

    // 1. Live Intelligence: Resolve canonical category, problem-type extent, and dynamic population with Gemini AI
    const resolution = await CategoryResolutionEngine.resolveWithAi(
      data.title,
      data.description,
      data.category,
      data.affectedPopulation,
      { requestId: context.requestId }
    );

    const canonicalCategory = resolution.canonicalCategory;
    const resolvedSeverity = resolution.severity;
    const resolvedPriority = resolution.priority;
    const resolvedPopulation = resolution.estimatedPopulation;

    // 2. Fallback Forward Geocoding: Ensure coordinates are never null if address is entered
    if ((data.latitude == null || data.longitude == null) && (data.address || data.district)) {
      const geoQuery = [data.address, data.district, data.state, 'India'].filter(Boolean).join(', ');
      try {
        const hits = await GeospatialService.searchGeocode(geoQuery);
        if (hits && hits.length > 0) {
          data.latitude = hits[0].latitude;
          data.longitude = hits[0].longitude;
          if (!data.district && hits[0].district) data.district = hits[0].district;
          if (!data.state && hits[0].state) data.state = hits[0].state;
        }
      } catch (err) {
        logger.warn('Forward geocoding lookup failed during challenge creation', {
          error: (err as Error).message,
        });
      }
    }

    // 3. Duplicate & Problem Group Merging Check
    const activeCandidates = await prisma.challenge.findMany({
      where: {
        status: {
          in: [
            ChallengeStatus.SUBMITTED,
            ChallengeStatus.UNDER_GOV_REVIEW,
            ChallengeStatus.APPROVED,
            ChallengeStatus.IN_RESEARCH,
          ],
        },
        deletedAt: null,
      },
      include: {
        problemGroups: {
          include: {
            members: true,
          },
        },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    let matchedChallenge: (typeof activeCandidates)[0] | null = null;
    let highestMatchScore = 0;

    for (const cand of activeCandidates) {
      // Category compatibility: same canonical or matching domain
      const candRes = CategoryResolutionEngine.resolve(cand.title, cand.description, cand.category);
      const isDomainMatch =
        candRes.domainKey === resolution.domainKey ||
        cand.category.toLowerCase() === canonicalCategory.toLowerCase() ||
        cand.category.toLowerCase() === (data.category || '').toLowerCase() ||
        candRes.canonicalCategory.toLowerCase() === canonicalCategory.toLowerCase();

      if (!isDomainMatch) continue;

      // Governance memory check: if candidate challenge has active rejected relationship, skip
      const isBlockedByGovernance = await prisma.relationshipGovernanceMemory.findFirst({
        where: {
          targetEntityId: cand.id,
          active: true,
        },
      });
      if (isBlockedByGovernance) continue;

      // Exact geospatial proximity in meters via SpatialQueryEngine
      const distanceMeters = SpatialQueryEngine.calculateDistanceMeters(
        data.latitude,
        data.longitude,
        cand.latitude,
        cand.longitude
      );

      const spatialPolicy = SpatialQueryEngine.getPolicy(canonicalCategory);

      const hasSameDistrict = Boolean(
        data.district &&
        cand.district &&
        data.district.trim().toLowerCase() === cand.district.trim().toLowerCase()
      );

      const hasSameState = Boolean(
        data.state &&
        cand.state &&
        data.state.trim().toLowerCase() === cand.state.trim().toLowerCase()
      );

      const addrTokensA = (data.address || '').toLowerCase().split(/[\s,]+/);
      const addrTokensB = (cand.address || '').toLowerCase().split(/[\s,]+/);
      const hasSharedLocality = addrTokensA.some(
        t => t.length > 3 && addrTokensB.includes(t)
      );

      const isImmediateRadius = distanceMeters !== null && distanceMeters <= spatialPolicy.immediateRadiusMeters;
      const isWithinDomainRadius = distanceMeters !== null && distanceMeters <= spatialPolicy.maxBoundaryMeters;

      const isGeoMatch =
        isWithinDomainRadius ||
        (distanceMeters === null && hasSameDistrict && (hasSameState || !data.state || !cand.state)) ||
        hasSharedLocality;

      if (!isGeoMatch) continue;

      // Semantic Similarity with civic concept expansion
      const titleSim = RelationshipScoringEngine.calculateTokenSimilarity(data.title, cand.title);
      const textSim = RelationshipScoringEngine.calculateTokenSimilarity(
        `${data.title} ${data.description}`,
        `${cand.title} ${cand.description}`
      );
      const semanticScore = Math.max(titleSim, textSim) / 100;

      const distBonus = isImmediateRadius ? 0.45 : isWithinDomainRadius ? 0.30 : 0.15;
      const combinedScore = distBonus + semanticScore * 0.7;

      if (
        (isImmediateRadius && (semanticScore >= 0.15 || (distanceMeters !== null && distanceMeters <= 50))) ||
        (semanticScore >= 0.30 && isWithinDomainRadius) ||
        (semanticScore >= 0.38) ||
        (semanticScore >= 0.25 && hasSharedLocality)
      ) {
        if (combinedScore > highestMatchScore) {
          highestMatchScore = combinedScore;
          matchedChallenge = cand;
        }
      }
    }

    // Branch A: Merging into Existing Challenge
    if (matchedChallenge) {
      let createdProblemId: string | null = null;
      const targetChallengeId = matchedChallenge.id;

      const mergedChallenge = await prisma.$transaction(async tx => {
        // 1. Create the Citizen Problem record so citizen's report is preserved in full
        const code = `PRB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const problem = await tx.problem.create({
          data: {
            code,
            title: data.title,
            description: data.description,
            category: canonicalCategory,
            status: 'CHALLENGE_CREATED',
            latitude: data.latitude || matchedChallenge.latitude,
            longitude: data.longitude || matchedChallenge.longitude,
            locationName: data.address || matchedChallenge.address,
            district: data.district || matchedChallenge.district,
            state: data.state || matchedChallenge.state,
            submitterId,
            aiSeverity: resolvedSeverity as unknown as import('@prisma/client').$Enums.SeverityLevel,
            aiPriority: resolvedPriority as unknown as import('@prisma/client').$Enums.PriorityLevel,
            aiAffectedPopulation: resolvedPopulation,
            populationStatus: resolution.populationStatus === 'UNKNOWN' ? 'UNKNOWN' : 'KNOWN',
            populationProvenance: resolution.populationProvenance,
          },
        });
        createdProblemId = problem.id;

        // 2. Link Problem to matched Challenge
        await tx.challengeProblem.upsert({
          where: {
            challengeId_problemId: {
              challengeId: targetChallengeId,
              problemId: problem.id,
            },
          },
          update: {},
          create: {
            challengeId: targetChallengeId,
            problemId: problem.id,
          },
        });

        // 3. Find or Create ProblemGroup in matchedChallenge
        let targetGroup = await tx.problemGroup.findFirst({
          where: { challengeId: targetChallengeId },
          orderBy: { createdAt: 'asc' },
        });

        if (!targetGroup) {
          targetGroup = await tx.problemGroup.create({
            data: {
              title: `${canonicalCategory} Incident Cluster - ${matchedChallenge.district || 'Regional'}`,
              canonicalCategory,
              challengeId: targetChallengeId,
              relationshipStrength: 0.95,
            },
          });
        }

        // Add problem to this ProblemGroup
        await tx.problemGroupMember.create({
          data: {
            groupId: targetGroup.id,
            problemId: problem.id,
          },
        });

        await tx.problem.update({
          where: { id: problem.id },
          data: { groupId: targetGroup.id },
        });

        // Ensure ChallengeGroup link exists for targetChallenge
        await tx.challengeGroup.upsert({
          where: {
            challengeId_groupId: {
              challengeId: targetChallengeId,
              groupId: targetGroup.id,
            },
          },
          update: {},
          create: {
            challengeId: targetChallengeId,
            groupId: targetGroup.id,
          },
        });

        // 4. Save any evidence submitted with this report
        if (data.evidence && data.evidence.length > 0) {
          for (const ev of data.evidence) {
            const fileKey = ev.fileKey || `evidence_${targetChallengeId}_${Date.now()}_${ev.originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            await tx.challengeEvidence.create({
              data: {
                challengeId: targetChallengeId,
                fileKey,
                originalName: ev.originalName,
                mimeType: ev.mimeType,
                sizeBytes: ev.sizeBytes || (ev.base64Data ? Math.round(ev.base64Data.length * 0.75) : 1024),
                storageBucket: ev.storageBucket || 'challenge-evidence',
                uploadedById: submitterId,
              },
            });
          }
        }

        // 5. Count total citizen problems linked to this challenge
        const totalProblems = await tx.challengeProblem.count({
          where: { challengeId: targetChallengeId },
        });

        // 6. Recalculate priority score with updated problem count and population
        const updatedPopulation = Math.max(
          matchedChallenge.affectedPopulation || 0,
          resolvedPopulation || 0
        );

        const recomputedPriority = PriorityEngine.calculate({
          severity: matchedChallenge.severity as SeverityLevel,
          urgency: matchedChallenge.priority as PriorityLevel,
          affectedPopulation: updatedPopulation,
          durationMonths: matchedChallenge.durationMonths || 1,
          communityVotesCount: totalProblems,
          evidenceCount: 1,
        });

        // 7. Update matchedChallenge (heal category and coordinates if previously missing)
        const updated = await tx.challenge.update({
          where: { id: targetChallengeId },
          data: {
            category: canonicalCategory,
            affectedPopulation: updatedPopulation,
            priorityScore: recomputedPriority.score,
            latitude: matchedChallenge.latitude || data.latitude,
            longitude: matchedChallenge.longitude || data.longitude,
            version: { increment: 1 },
          },
        });

        // 8. Add timeline entry
        await tx.challengeTimeline.create({
          data: {
            challengeId: targetChallengeId,
            fromStatus: matchedChallenge.status,
            toStatus: matchedChallenge.status,
            actorId: submitterId,
            reason: `Merged citizen report: "${data.title}" consolidated into Problem Group`,
          },
        });

        return updated;
      });

      // Record audit
      await AuditService.record({
        actorId: submitterId,
        action: AuditAction.CHALLENGE_UPDATE,
        resource: 'Challenge',
        resourceId: targetChallengeId,
        newState: {
          mergedProblemId: createdProblemId,
          mergedProblemTitle: data.title,
          challengeId: targetChallengeId,
        },
        requestId: context.requestId,
        ipAddress: context.ipAddress,
      });

      return {
        id: mergedChallenge.id,
        title: mergedChallenge.title,
        description: mergedChallenge.description,
        category: mergedChallenge.category,
        severity: mergedChallenge.severity as unknown as SeverityLevel,
        priority: mergedChallenge.priority as unknown as PriorityLevel,
        priorityScore: mergedChallenge.priorityScore,
        status: mergedChallenge.status as unknown as ChallengeStatus,
        submitterId: mergedChallenge.submitterId,
        submitterOrgId: mergedChallenge.submitterOrgId,
        latitude: mergedChallenge.latitude,
        longitude: mergedChallenge.longitude,
        address: mergedChallenge.address,
        district: mergedChallenge.district,
        state: mergedChallenge.state,
        affectedPopulation: mergedChallenge.affectedPopulation,
        durationMonths: mergedChallenge.durationMonths,
        isSystemic: mergedChallenge.isSystemic,
        systemicSummary: mergedChallenge.systemicSummary,
        version: mergedChallenge.version,
        createdAt: mergedChallenge.createdAt.toISOString(),
        updatedAt: mergedChallenge.updatedAt.toISOString(),
        problemId: createdProblemId || undefined,
        isMerged: true,
      } as any;
    }

    // Branch B: New Challenge Creation (No Duplicate Found)
    const priorityCalc = PriorityEngine.calculate({
      severity: resolvedSeverity,
      urgency: resolvedPriority,
      affectedPopulation: resolvedPopulation,
      durationMonths: data.durationMonths || 1,
      communityVotesCount: 0,
      evidenceCount: (data.evidence || []).length,
    });

    let createdProblemId: string | null = null;
    const challenge = await prisma.$transaction(async tx => {
      const created = await tx.challenge.create({
        data: {
          title: data.title,
          description: data.description,
          category: canonicalCategory,
          severity: resolvedSeverity as unknown as import('@prisma/client').$Enums.SeverityLevel,
          priority: resolvedPriority as unknown as import('@prisma/client').$Enums.PriorityLevel,
          priorityScore: priorityCalc.score,
          status: ChallengeStatus.SUBMITTED as unknown as import('@prisma/client').$Enums.ChallengeStatus,
          submitterId,
          submitterOrgId: submitterOrgId || null,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          address: data.address || null,
          district: data.district || null,
          state: data.state || null,
          affectedPopulation: resolvedPopulation,
          durationMonths: data.durationMonths || null,
          isSystemic: true,
          systemicSummary: `Possible Root Cause: ${resolution.rootCauses?.[0]?.hypothesis || 'Infrastructure capacity deficit or network blockage'} (Not Yet Government Verified)`,
          version: 1,
        },
      });

      await tx.challengeTimeline.create({
        data: {
          challengeId: created.id,
          fromStatus: ChallengeStatus.SUBMITTED as unknown as import('@prisma/client').$Enums.ChallengeStatus,
          toStatus: ChallengeStatus.SUBMITTED as unknown as import('@prisma/client').$Enums.ChallengeStatus,
          actorId: submitterId,
          reason: 'Initial citizen problem report submitted',
        },
      });

      // Automatically create a corresponding Problem record so it exists in the Citizen Problem Registry
      const code = `PRB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const problem = await tx.problem.create({
        data: {
          code,
          title: data.title,
          description: data.description,
          category: canonicalCategory,
          status: 'CHALLENGE_CREATED',
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          locationName: data.address || null,
          district: data.district || null,
          state: data.state || null,
          submitterId,
          aiSeverity: resolvedSeverity as unknown as import('@prisma/client').$Enums.SeverityLevel,
          aiPriority: resolvedPriority as unknown as import('@prisma/client').$Enums.PriorityLevel,
          aiAffectedPopulation: resolvedPopulation,
          populationStatus: resolution.populationStatus === 'UNKNOWN' ? 'UNKNOWN' : 'KNOWN',
          populationProvenance: resolution.populationProvenance,
        },
      });
      createdProblemId = problem.id;

      // Create Problem Group and link
      const group = await tx.problemGroup.create({
        data: {
          title: `${canonicalCategory} Incident Cluster - ${data.district || 'Regional'}`,
          canonicalCategory,
          challengeId: created.id,
          relationshipStrength: 0.95,
        },
      });

      await tx.problemGroupMember.create({
        data: {
          groupId: group.id,
          problemId: problem.id,
        },
      });

      await tx.problem.update({
        where: { id: problem.id },
        data: { groupId: group.id },
      });

      await tx.challengeProblem.create({
        data: {
          challengeId: created.id,
          problemId: problem.id,
        },
      });

      // Link ProblemGroup to the newly created Challenge
      await tx.challengeGroup.create({
        data: {
          challengeId: created.id,
          groupId: group.id,
        },
      });

      if (data.evidence && data.evidence.length > 0) {
        for (const ev of data.evidence) {
          const fileKey = ev.fileKey || `evidence_${created.id}_${Date.now()}_${ev.originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          await tx.challengeEvidence.create({
            data: {
              challengeId: created.id,
              fileKey,
              originalName: ev.originalName,
              mimeType: ev.mimeType,
              sizeBytes: ev.sizeBytes || (ev.base64Data ? Math.round(ev.base64Data.length * 0.75) : 1024),
              storageBucket: ev.storageBucket || 'challenge-evidence',
              uploadedById: submitterId,
            },
          });
        }
      }

      if (data.aiAnalysisResult || resolution.isAiResolved) {
        const aiPayload = data.aiAnalysisResult || {
          category: canonicalCategory,
          confidenceScore: resolution.confidenceScore,
          normalizedStatement: resolution.normalizedStatement,
          reasoningSummary: resolution.reasoningSummary,
          rootCauses: resolution.rootCauses,
        };
        await tx.aIAnalysis.create({
          data: {
            challengeId: created.id,
            status: 'COMPLETED' as unknown as import('@prisma/client').$Enums.AIAnalysisStatus,
            rawResponse: aiPayload as any,
            confidenceScore: typeof (aiPayload as any).confidenceScore === 'number' ? (aiPayload as any).confidenceScore : resolution.confidenceScore,
            reasoningSummary: ((aiPayload as any).reasoningSummary as string) || resolution.reasoningSummary || 'Multimodal AI problem intelligence processed at citizen intake.',
            requiresHumanReview: Boolean((aiPayload as any).requiresHumanReview),
            appliedRules: Array.isArray((aiPayload as any).appliedRules) ? ((aiPayload as any).appliedRules as string[]) : ['GEMINI_INTELLIGENCE_PIPELINE'],
          },
        });
      }

      return created;
    });

    await AuditService.record({
      actorId: submitterId,
      action: AuditAction.CHALLENGE_CREATE,
      resource: 'Challenge',
      resourceId: challenge.id,
      newState: {
        title: challenge.title,
        status: challenge.status,
        priorityScore: challenge.priorityScore,
        version: challenge.version,
      },
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    });

    // Initialize problem-specific impact intelligence
    await ImpactService.computeAndPersistImpact(
      challenge.id,
      (data.impactInputs as Record<string, unknown>) || {},
      data.affectedPopulation
    ).catch(() => {
      // Non-blocking fallback
    });

    // Enqueue background AI problem intelligence
    await QueueManager.enqueueAiAnalysis(challenge.id, context.requestId).catch((err: Error) => {
      logger.info(
        `Queue offline or enqueue failed for challenge ${challenge.id} (${err.message}). Running background AI intelligence directly.`,
        { requestId: context.requestId }
      );
      setImmediate(() => {
        ChallengeIntelligenceOrchestrator.processChallengeIntelligence(challenge.id, context.requestId).catch(
          orchestratorErr => {
            logger.warn(
              `Background challenge intelligence failed for ${challenge.id}: ${orchestratorErr.message}`,
              { requestId: context.requestId }
            );
          }
        );
      });
    });

    // Initialize SLA tracking for government review
    await SlaService.initOrUpdateSLA(
      challenge.id,
      (data.severity as any) || SeverityLevel.MODERATE,
      (data.priority as any) || PriorityLevel.MEDIUM
    ).catch(() => {});

    return {
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      category: challenge.category,
      severity: challenge.severity as unknown as SeverityLevel,
      priority: challenge.priority as unknown as PriorityLevel,
      priorityScore: challenge.priorityScore,
      status: challenge.status as unknown as ChallengeStatus,
      submitterId: challenge.submitterId,
      submitterOrgId: challenge.submitterOrgId,
      latitude: challenge.latitude,
      longitude: challenge.longitude,
      address: challenge.address,
      district: challenge.district,
      state: challenge.state,
      affectedPopulation: challenge.affectedPopulation,
      durationMonths: challenge.durationMonths,
      isSystemic: challenge.isSystemic,
      systemicSummary: challenge.systemicSummary,
      version: challenge.version,
      createdAt: challenge.createdAt.toISOString(),
      updatedAt: challenge.updatedAt.toISOString(),
      problemId: createdProblemId || undefined,
    } as any;
  }

  public static async getById(id: string): Promise<
    ChallengeDto & {
      timelines: ChallengeTimelineDto[];
      evidence: ChallengeEvidenceDto[];
      aiAnalysis: unknown;
      relationships?: ChallengeRelationshipDto[];
      supportVotesCount: number;
    }
  > {
    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        timelines: {
          include: { actor: true },
          orderBy: { createdAt: 'asc' },
        },
        evidence: true,
        aiAnalysis: true,
        communityVotes: true,
        sourceRelationships: {
          include: { targetChallenge: true },
        },
        targetRelationships: {
          include: { sourceChallenge: true },
        },
        impact: true,
        submitter: {
          select: { id: true, fullName: true, email: true },
        },
        projects: {
          include: {
            leadingOrg: {
              select: { id: true, name: true, type: true },
            },
            partnerships: {
              include: {
                partnerOrg: {
                  select: { id: true, name: true, type: true },
                },
              },
            },
            deployments: {
              orderBy: { deploymentDate: 'desc' },
              take: 1,
            },
            milestones: {
              orderBy: { updatedAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        citizenVerifications: {
          select: {
            id: true,
            rating: true,
            verifiedImprovement: true,
            problemStatus: true,
            comments: true,
            createdAt: true,
            citizenId: true,
          },
        },
        challengeProblems: {
          include: {
            problem: true,
          },
        },
        problemGroups: {
          include: {
            problems: true,
            solutionMemories: true,
          },
        },
        challengeGroups: {
          include: {
            group: {
              include: {
                problems: true,
                solutionMemories: true,
              },
            },
          },
        },
      },
    });

    if (!challenge) {
      throw new NotFoundError('Challenge', id);
    }

    const c = challenge as any;

    const relationships: ChallengeRelationshipDto[] = [
      ...(c.sourceRelationships || []).map((r: any) => ({
        id: r.id,
        sourceChallengeId: r.sourceChallengeId,
        targetChallengeId: r.targetChallengeId,
        targetChallengeTitle: r.targetChallenge?.title,
        relationType: r.relationType as unknown as import('@sicp/shared').RelationshipType,
        status: r.status as unknown as import('@sicp/shared').RelationshipStatus,
        confidenceScore: r.confidenceScore,
        reasoning: r.reasoning,
        approvedById: r.approvedById,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      ...(c.targetRelationships || []).map((r: any) => ({
        id: r.id,
        sourceChallengeId: r.sourceChallengeId,
        targetChallengeId: r.targetChallengeId,
        sourceChallengeTitle: r.sourceChallenge?.title,
        relationType: r.relationType as unknown as import('@sicp/shared').RelationshipType,
        status: r.status as unknown as import('@sicp/shared').RelationshipStatus,
        confidenceScore: r.confidenceScore,
        reasoning: r.reasoning,
        approvedById: r.approvedById,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    ];

    // Consolidate Problem Groups (both direct problemGroups and many-to-many challengeGroups)
    const directGroups = c.problemGroups || [];
    const linkedGroups = (c.challengeGroups || []).map((cg: any) => cg.group).filter(Boolean);
    const groupMap = new Map<string, any>();
    for (const g of [...directGroups, ...linkedGroups]) {
      if (g && !groupMap.has(g.id)) {
        groupMap.set(g.id, {
          id: g.id,
          title: g.title,
          canonicalCategory: g.canonicalCategory,
          relationshipStrength: g.relationshipStrength || 0.88,
          factorBreakdown: g.factorBreakdown || { spatial: 0.85, semantic: 0.9, temporal: 0.8 },
          challengeId: g.challengeId || c.id,
          problems: g.problems ? [...g.problems] : [],
          solutionMemories: g.solutionMemories || [],
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
        });
      }
    }

    const linkedProblems = (c.challengeProblems || []).map((cp: any) => cp.problem).filter(Boolean);

    // Ensure linked problems belonging to a group are present in group.problems
    for (const prob of linkedProblems) {
      if (prob.groupId && groupMap.has(prob.groupId)) {
        const grp = groupMap.get(prob.groupId);
        if (!grp.problems.some((p: any) => p.id === prob.id)) {
          grp.problems.push(prob);
        }
      }
    }

    // Identify problems that do not belong to any group in groupMap
    const assignedProblemIds = new Set<string>();
    groupMap.forEach((grp) => {
      grp.problems.forEach((p: any) => assignedProblemIds.add(p.id));
    });

    const unassignedProblems = linkedProblems.filter((p: any) => !assignedProblemIds.has(p.id));

    if (unassignedProblems.length > 0) {
      // Synthesize a group for unassigned problems in this challenge corridor
      const fallbackGroup = {
        id: `group-corridor-${c.id}`,
        title: `${c.title} — Correlated Issue Cluster`,
        canonicalCategory: c.category || 'CIVIC',
        relationshipStrength: 0.88,
        factorBreakdown: { spatial: 0.85, semantic: 0.9, temporal: 0.8 },
        challengeId: c.id,
        problems: unassignedProblems,
        solutionMemories: [],
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
      groupMap.set(fallbackGroup.id, fallbackGroup);
    }

    // If still no groups exist (e.g. newly created challenge with no problem records yet)
    if (groupMap.size === 0) {
      const primaryGroup = {
        id: `group-primary-${c.id}`,
        title: `${c.title} — Primary Cluster`,
        canonicalCategory: c.category || 'CIVIC',
        relationshipStrength: 0.95,
        factorBreakdown: { spatial: 1.0, semantic: 1.0, temporal: 1.0 },
        challengeId: c.id,
        problems: [
          {
            id: `p-${c.id}`,
            title: c.title,
            description: c.description,
            category: c.category,
            status: 'GROUPED',
            aiSeverity: c.severity,
            aiPriority: c.priority,
            latitude: c.latitude,
            longitude: c.longitude,
            locationName: c.address || `${c.district || ''}, ${c.state || ''}`.trim() || 'Municipal Corridor',
            district: c.district,
            state: c.state,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          },
        ],
        solutionMemories: [],
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
      groupMap.set(primaryGroup.id, primaryGroup);
    }

    const consolidatedGroups = Array.from(groupMap.values());
    const allUniqueProblemIds = new Set<string>();
    consolidatedGroups.forEach((g: any) => (g.problems || []).forEach((p: any) => allUniqueProblemIds.add(p.id)));
    linkedProblems.forEach((p: any) => allUniqueProblemIds.add(p.id));
    const totalCitizenProblems = Math.max(1, allUniqueProblemIds.size);

    const deployedDate = c.projects?.[0]?.deployments?.[0]?.deploymentDate
      ? new Date(c.projects[0].deployments[0].deploymentDate).toISOString()
      : null;
    const finishedDate =
      c.projects?.[0]?.deployments?.[0]?.status === 'OPERATIONAL' || c.projects?.[0]?.deployments?.[0]?.status === 'DEPLOYED'
        ? new Date(c.projects[0].deployments[0].updatedAt || c.projects[0].deployments[0].deploymentDate).toISOString()
        : (c.projects?.[0]?.milestones?.find((m: any) => m.status === 'COMPLETED')?.updatedAt
          ? new Date(c.projects[0].milestones.find((m: any) => m.status === 'COMPLETED').updatedAt).toISOString()
          : null);

    return {
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      severity: c.severity as unknown as SeverityLevel,
      priority: c.priority as unknown as PriorityLevel,
      priorityScore: c.priorityScore,
      status: c.status as unknown as ChallengeStatus,
      submitterId: c.submitterId,
      submitterOrgId: c.submitterOrgId,
      submitter: c.submitter
        ? { id: c.submitter.id, fullName: c.submitter.fullName, email: c.submitter.email }
        : (c.submitterId ? { id: c.submitterId, fullName: 'Citizen', email: '' } : null),
      latitude: c.latitude,
      longitude: c.longitude,
      address: c.address,
      district: c.district,
      state: c.state,
      affectedPopulation: c.affectedPopulation,
      durationMonths: c.durationMonths,
      isSystemic: c.isSystemic,
      systemicSummary: c.systemicSummary,
      isCanonical: c.isCanonical,
      canonicalClusterId: c.canonicalClusterId,
      version: c.version,
      supportVotesCount: (c.communityVotes || []).length,
      timelines: (c.timelines || []).map((t: any) => ({
        id: t.id,
        challengeId: t.challengeId,
        fromStatus: t.fromStatus as unknown as ChallengeStatus,
        toStatus: t.toStatus as unknown as ChallengeStatus,
        actorId: t.actorId,
        actorRole: t.actor?.role as unknown as UserRole,
        reason: t.reason,
        metadata: t.metadata as Record<string, unknown> | null,
        createdAt: t.createdAt.toISOString(),
      })),
      evidence: (c.evidence || []).map((e: any) => ({
        id: e.id,
        challengeId: e.challengeId,
        fileKey: e.fileKey,
        originalName: e.originalName,
        mimeType: e.mimeType,
        sizeBytes: e.sizeBytes,
        storageBucket: e.storageBucket,
        uploadedById: e.uploadedById,
        createdAt: e.createdAt.toISOString(),
      })),
      aiAnalysis: c.aiAnalysis,
      relationships,
      impact: c.impact
        ? {
            id: c.impact.id,
            challengeId: c.impact.challengeId,
            problemType: c.impact.problemType as unknown as ProblemType,
            metricType: c.impact.metricType as unknown as ImpactMetricType,
            value: c.impact.estimatedValue,
            unit: c.impact.unit,
            timeBasis: c.impact.timeBasis as unknown as ImpactTimeBasis,
            calculationMethod: c.impact.calculationMethod,
            inputs: c.impact.inputs as Record<string, unknown>,
            confidence: c.impact.confidence,
            evidenceBasis: (c.impact.evidenceBasis as string[]) || [],
            dataSources: (c.impact.dataSources as string[]) || [],
            verificationStatus: c.impact.verificationStatus as unknown as ImpactVerificationStatus,
            verifiedValue: c.impact.verifiedValue,
            verifiedById: c.impact.verifiedById,
            verifiedAt: c.impact.verifiedAt?.toISOString() || null,
            verificationNotes: c.impact.verificationNotes,
            normalizedMagnitude: c.impact.normalizedMagnitude,
            missingInformation: (c.impact.missingInformation as string[]) || [],
            suggestedQuestions: (c.impact.suggestedQuestions as unknown as AdaptiveQuestionDto[]) || [],
            requiresHumanReview: c.impact.requiresHumanReview,
            explanation: c.impact.explanation,
            createdAt: c.impact.createdAt.toISOString(),
            updatedAt: c.impact.updatedAt.toISOString(),
          }
        : null,
      projects: (c.projects || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        status: p.status as unknown as import('@sicp/shared').ProjectStatus,
      })),
      universityName: c.projects?.[0]?.leadingOrg?.name || null,
      industryName: c.projects?.[0]?.partnerships?.[0]?.partnerOrg?.name || null,
      deployedDate,
      finishedDate,
      totalCitizenProblems,
      verifiedCount: (c.citizenVerifications || []).filter((v: any) => v.verifiedImprovement).length || 0,
      deniedCount: (c.citizenVerifications || []).filter((v: any) => !v.verifiedImprovement).length || 0,
      challengeProblems: linkedProblems,
      problemGroups: consolidatedGroups,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  public static async list(filter: {
    status?: ChallengeStatus;
    category?: string;
    district?: string;
    state?: string;
    submitterId?: string;
    isSystemic?: boolean;
    sortBy?: string;
    lat?: number;
    lon?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ items: ChallengeDto[]; total: number }> {
    const whereClause = {
      ...(filter.status ? { status: filter.status as unknown as import('@prisma/client').$Enums.ChallengeStatus } : {}),
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.district ? { district: filter.district } : {}),
      ...(filter.state ? { state: filter.state } : {}),
      ...(filter.submitterId ? { submitterId: filter.submitterId } : {}),
      ...(filter.isSystemic !== undefined ? { isSystemic: filter.isSystemic } : {}),
      deletedAt: null,
    };

    const isNearestSort = filter.sortBy === 'NEAREST' || filter.sortBy === 'LOCATION_NEAREST';
    const hasCoordinates = filter.lat != null && filter.lon != null;
    const postgisDistances = new Map<string, number>();

    // PostGIS Spatial Query Execution (with graceful fallback if extension unavailable)
    if (hasCoordinates && typeof (prisma as any).$queryRaw === 'function') {
      try {
        const rawResults: any = await (prisma as any).$queryRaw`
          SELECT 
            c.id,
            ROUND(
              ST_Distance(
                ST_SetSRID(ST_MakePoint(c.longitude, c.latitude), 4326)::geography,
                ST_SetSRID(ST_MakePoint(${filter.lon!}, ${filter.lat!}), 4326)::geography
              )::numeric, 1
            )::float AS distance_meters
          FROM "Challenge" c
          WHERE c."deletedAt" IS NULL
            AND c.latitude IS NOT NULL 
            AND c.longitude IS NOT NULL
        `;
        if (Array.isArray(rawResults)) {
          for (const row of rawResults) {
            if (row && row.id && row.distance_meters != null) {
              postgisDistances.set(row.id, Number(row.distance_meters));
            }
          }
        }
      } catch (err: any) {
        logger.info(`PostGIS spatial query unavailable (${err.message}). Using mathematical Haversine calculation.`);
      }
    }

    const [items, total] = await Promise.all([
      prisma.challenge.findMany({
        where: whereClause,
        orderBy: [{ priorityScore: 'desc' }, { createdAt: 'desc' }],
        take: isNearestSort ? 100 : (filter.limit || 20),
        skip: isNearestSort ? 0 : (filter.offset || 0),
        include: {
          communityVotes: true,
          impact: true,
          submitter: {
            select: { id: true, fullName: true, email: true },
          },
          citizenVerifications: {
            select: { verifiedImprovement: true },
          },
          challengeProblems: {
            select: { id: true },
          },
        },
      }),
      prisma.challenge.count({ where: whereClause }),
    ]);

    const mappedItems: ChallengeDto[] = items.map(c => {
      let distanceMeters: number | null = null;
      if (postgisDistances.has(c.id)) {
        distanceMeters = postgisDistances.get(c.id)!;
      } else if (filter.lat != null && filter.lon != null && c.latitude != null && c.longitude != null) {
        distanceMeters = SpatialPolicyEngine.calculateDistanceMeters(filter.lat, filter.lon, c.latitude, c.longitude);
      }
      const distanceKm = distanceMeters != null ? Math.round((distanceMeters / 1000) * 10) / 10 : null;

      return {
        id: c.id,
        title: c.title,
        description: c.description,
        category: c.category,
        severity: c.severity as unknown as SeverityLevel,
        priority: c.priority as unknown as PriorityLevel,
        priorityScore: c.priorityScore,
        status: c.status as unknown as ChallengeStatus,
        submitterId: c.submitterId,
        submitterOrgId: c.submitterOrgId,
        submitter: c.submitter
          ? { id: c.submitter.id, fullName: c.submitter.fullName, email: c.submitter.email }
          : (c.submitterId ? { id: c.submitterId, fullName: 'Citizen', email: '' } : null),
        latitude: c.latitude,
        longitude: c.longitude,
        distanceMeters,
        distanceKm,
        address: c.address,
        district: c.district,
        state: c.state,
        affectedPopulation: c.affectedPopulation,
        durationMonths: c.durationMonths,
        isSystemic: c.isSystemic,
        systemicSummary: c.systemicSummary,
        isCanonical: c.isCanonical,
        canonicalClusterId: c.canonicalClusterId,
        supportVotesCount: c.communityVotes.length,
        totalCitizenProblems: Math.max(1, (c as any).challengeProblems?.length || 0),
        verifiedCount: (c as any).citizenVerifications?.filter((v: any) => v.verifiedImprovement).length || 0,
        deniedCount: (c as any).citizenVerifications?.filter((v: any) => !v.verifiedImprovement).length || 0,
        version: c.version,
        impact: c.impact
          ? {
              id: c.impact.id,
              problemType: c.impact.problemType as unknown as ProblemType,
              metricType: c.impact.metricType as unknown as ImpactMetricType,
              value: c.impact.estimatedValue,
              unit: c.impact.unit,
              timeBasis: c.impact.timeBasis as unknown as ImpactTimeBasis,
              calculationMethod: c.impact.calculationMethod,
              inputs: c.impact.inputs as Record<string, unknown>,
              confidence: c.impact.confidence,
              evidenceBasis: (c.impact.evidenceBasis as string[]) || [],
              dataSources: (c.impact.dataSources as string[]) || [],
              verificationStatus: c.impact.verificationStatus as unknown as ImpactVerificationStatus,
              verifiedValue: c.impact.verifiedValue,
              normalizedMagnitude: c.impact.normalizedMagnitude,
              missingInformation: (c.impact.missingInformation as string[]) || [],
              suggestedQuestions: (c.impact.suggestedQuestions as unknown as AdaptiveQuestionDto[]) || [],
              requiresHumanReview: c.impact.requiresHumanReview,
              explanation: c.impact.explanation,
            }
          : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });

    if (isNearestSort) {
      mappedItems.sort((a, b) => {
        const distA = a.distanceMeters ?? Infinity;
        const distB = b.distanceMeters ?? Infinity;
        return distA - distB;
      });
      const offset = filter.offset || 0;
      const limit = filter.limit || 20;
      return {
        items: mappedItems.slice(offset, offset + limit),
        total,
      };
    }

    return {
      items: mappedItems,
      total,
    };
  }

  public static async transition(
    challengeId: string,
    data: z.infer<typeof transitionChallengeSchema>,
    actorId: string,
    actorRole: UserRole,
    context: { requestId: string; ipAddress?: string }
  ) {
    const result = await StateMachineEngine.transitionChallenge({
      challengeId,
      toStatus: data.toStatus,
      actorId,
      actorRole,
      expectedVersion: data.expectedVersion,
      reason: data.reason,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    });

    if (data.toStatus === ChallengeStatus.SUBMITTED) {
      QueueManager.enqueueAiAnalysis(challengeId, context.requestId).catch(() => {
        // Safe handling if Redis is down
      });

      // Initialize SLA for government review
      SlaService.initOrUpdateSLA(
        challengeId,
        result.challenge.severity as unknown as SeverityLevel,
        result.challenge.priority as unknown as PriorityLevel
      ).catch(() => {
        // Safe handling
      });
    }

    return result;
  }

  public static async checkDuplicatesPreSubmit(
    data: z.infer<typeof checkDuplicatesSchema>
  ): Promise<ContextAwareDuplicateCheckResultDto> {
    return DuplicateClusteringService.checkContextAwareDuplicates(data);
  }

  public static async getChallengeDuplicates(challengeId: string): Promise<ClusterCandidate[]> {
    return DuplicateClusteringService.findCandidates(challengeId, 5);
  }

  public static async mergeSystemic(
    data: z.infer<typeof mergeSystemicSchema>,
    actorId: string,
    actorRole: UserRole,
    context: { requestId: string; ipAddress?: string }
  ) {
    return DuplicateClusteringService.executeSystemicMerge({
      ...data,
      actorId,
      actorRole,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    });
  }

  public static async analyzeProblemStatement(
    data: z.input<typeof analyzeChallengeSchema>,
    context: { requestId: string }
  ) {
    logger.info(`[AI_REQUEST_STARTED] Direct analysis requested for: "${data.title}"`, { requestId: context.requestId });

    // Intent Gate validation
    const intentValidation = await ProblemIntentGateService.validate(
      {
        title: data.title,
        description: data.description || '',
        category: data.category || 'General',
      },
      context.requestId
    );

    // For interactive pre-submit analysis: if intent indicates partial or unclear typing, return structured non-error response
    if (
      intentValidation.nextAction === IntentNextAction.BLOCKED ||
      intentValidation.nextAction === IntentNextAction.IMPROVE_SUBMISSION ||
      intentValidation.classification === ProblemIntentClassification.UNCLEAR_PROBLEM
    ) {
      logger.info(`[AI_ANALYSIS_PRE_SUBMIT_PARTIAL] Intent is intermediate or unclear: ${intentValidation.classification}`, {
        requestId: context.requestId,
      });
      return {
        isPartial: true,
        category: null,
        message: intentValidation.suggestedClarification || intentValidation.reason || 'Enter more details for AI analysis',
        confidenceScore: 0,
        intentValidation,
      };
    }

    try {
      const result = await AiServiceClient.analyzeChallenge(
        {
          title: data.title,
          description: data.description || '',
          category: data.category || 'General',
          district: data.district,
          state: data.state,
          affectedPopulation: data.affectedPopulation,
          durationMonths: data.durationMonths,
          transcribedAudio: data.transcribedAudio,
          audioData: data.audioData,
          audioMimeType: data.audioMimeType,
          images: data.images,
          videoKeyframes: data.videoKeyframes,
          documents: data.documents,
          modalitiesProvided: data.modalitiesProvided,
        },
        context.requestId
      );
      const mapping = CategoryResolutionEngine.mapAiResultToCanonical(
        result.primaryProblem?.domain || (result as any).domain,
        result.primaryProblem?.category || result.category,
        result.primaryProblem?.problemType || result.problemType,
        `${data.title} ${data.description || ''} ${result.normalizedStatement || ''}`
      );

      logger.info(`[AI_REQUEST_SUCCESS] Direct AI analysis completed -> ${mapping.canonicalCategory}`, { requestId: context.requestId });
      return {
        ...result,
        category: mapping.canonicalCategory,
        domainKey: mapping.domainKey,
        intentValidation,
      };
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        throw err;
      }
      logger.warn(`[AI_REQUEST_DEGRADED] AI service rate-limited or unreachable: ${(err as Error).message}. Returning honest status.`);

      // Section 16 & Section 4 Rule: Do NOT fabricate fake AI confidence, category or regex guessing on failure
      return {
        isPartial: false,
        aiUnavailable: true,
        category: null,
        message: 'AI service is currently unavailable. Please select your sector manually.',
        confidenceScore: 0,
        intentValidation,
      };
    }
  }

  public static async validateIntent(
    data: z.infer<typeof validateIntentSchema>,
    context: { requestId: string }
  ) {
    return ProblemIntentGateService.validate(data, context.requestId);
  }

  public static async getChallengeAnalysis(challengeId: string) {
    const analysis = await prisma.aIAnalysis.findUnique({
      where: { challengeId },
    });

    if (!analysis) {
      throw new NotFoundError('AIAnalysis for Challenge', challengeId);
    }

    return analysis;
  }

  public static async triggerChallengeAnalysis(
    challengeId: string,
    context: { requestId: string }
  ) {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundError('Challenge', challengeId);
    }

    // Try enqueueing via QueueManager if Redis is available
    if (QueueManager.isRedisReady()) {
      await QueueManager.enqueueAiAnalysis(challengeId, context.requestId);
      return { status: 'QUEUED', message: 'AI analysis queued for background processing.' };
    }

    // Fallback: synchronous analysis and update DB
    try {
      const result = await this.analyzeProblemStatement(
        {
          title: challenge.title,
          description: challenge.description,
          category: challenge.category,
          district: challenge.district || undefined,
          state: challenge.state || undefined,
          affectedPopulation: challenge.affectedPopulation || undefined,
          durationMonths: challenge.durationMonths || undefined,
        },
        context
      );

      const analysisResult = result as any;
      const record = await prisma.aIAnalysis.upsert({
        where: { challengeId },
        create: {
          challengeId,
          status: 'COMPLETED' as unknown as import('@prisma/client').$Enums.AIAnalysisStatus,
          rawResponse: result as any,
          confidenceScore: analysisResult.confidenceScore || 0,
          reasoningSummary: analysisResult.reasoningSummary || analysisResult.message || 'AI assessment completed.',
          requiresHumanReview: analysisResult.requiresHumanReview ?? true,
          appliedRules: analysisResult.appliedRules || [],
        },
        update: {
          status: 'COMPLETED' as unknown as import('@prisma/client').$Enums.AIAnalysisStatus,
          rawResponse: result as any,
          confidenceScore: analysisResult.confidenceScore || 0,
          reasoningSummary: analysisResult.reasoningSummary || analysisResult.message || 'AI assessment completed.',
          requiresHumanReview: analysisResult.requiresHumanReview ?? true,
          appliedRules: analysisResult.appliedRules || [],
        },
      });

      return record;
    } catch (err: unknown) {
      if (err instanceof AiUnavailableError) {
        await prisma.aIAnalysis.upsert({
          where: { challengeId },
          create: {
            challengeId,
            status: 'UNAVAILABLE' as unknown as import('@prisma/client').$Enums.AIAnalysisStatus,
            reasoningSummary: (err as Error).message,
          },
          update: {
            status: 'UNAVAILABLE' as unknown as import('@prisma/client').$Enums.AIAnalysisStatus,
            reasoningSummary: (err as Error).message,
          },
        });
      }
      throw err;
    }
  }

  public static async analyzeEvidence(
    challengeId: string,
    data: { base64Data: string; mimeType?: string; fileKey?: string },
    context: { requestId: string }
  ) {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundError('Challenge', challengeId);
    }

    if (!data.base64Data) {
      throw new ValidationError('base64Data image payload is required for visual evidence analysis.');
    }

    return AiServiceClient.analyzeEvidence(
      data.fileKey || 'evidence.jpg',
      data.mimeType || 'image/jpeg',
      data.base64Data,
      challenge.category,
      challenge.description,
      context.requestId
    );
  }

  public static async applyGovernmentOverride(
    challengeId: string,
    overrides: {
      severity?: SeverityLevel;
      priority?: PriorityLevel;
      affectedPopulation?: number;
      reason: string;
      officerId?: string;
    }
  ) {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        challengeProblems: { include: { problem: true } },
      },
    });

    if (!challenge) {
      throw new NotFoundError('Challenge', challengeId);
    }

    const updates: any = {};
    let finalSeverity = overrides.severity || challenge.severity;
    let finalPriority = overrides.priority || challenge.priority;
    let finalPopulation = overrides.affectedPopulation !== undefined ? overrides.affectedPopulation : challenge.affectedPopulation;

    if (overrides.affectedPopulation !== undefined) {
      updates.affectedPopulation = overrides.affectedPopulation;

      // Auto-recalculate priority/severity if not explicitly provided
      if (!overrides.priority || !overrides.severity) {
        const computed = ProblemGroupingService.calculatePriorityAndSeverityByProblemType(
          challenge.category,
          overrides.affectedPopulation,
          finalSeverity as any
        );
        if (!overrides.priority) {
          finalPriority = computed.priority;
          updates.priority = computed.priority;
        }
        if (!overrides.severity) {
          finalSeverity = computed.severity;
          updates.severity = computed.severity;
        }
      }
    }

    if (overrides.severity) {
      updates.severity = overrides.severity;
    }
    if (overrides.priority) {
      updates.priority = overrides.priority;
    }

    updates.priorityScore = ProblemGroupingService.calculateChallengePriorityScore(
      finalSeverity as any,
      finalPriority as any,
      finalPopulation
    );

    const updated = await prisma.challenge.update({
      where: { id: challengeId },
      data: updates,
    });

    // Also update member problems and log overrides
    for (const cp of challenge.challengeProblems) {
      await ProblemGroupingService.applyGovernmentOverride(cp.problemId, {
        severity: overrides.severity,
        priority: overrides.priority,
        affectedPopulation: overrides.affectedPopulation,
        reason: `Propagated from Challenge ${challengeId} override: ${overrides.reason}`,
        officerId: overrides.officerId,
      }).catch((e) => logger.warn(`Failed to propagate override to problem ${cp.problemId}: ${e.message}`));
    }

    return updated;
  }
}


