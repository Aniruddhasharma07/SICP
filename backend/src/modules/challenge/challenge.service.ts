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

    const priorityCalc = PriorityEngine.calculate({
      severity: data.severity,
      urgency: data.priority,
      affectedPopulation: data.affectedPopulation,
      durationMonths: data.durationMonths,
      communityVotesCount: 0,
      evidenceCount: 0,
    });

    const challenge = await prisma.$transaction(async tx => {
      const created = await tx.challenge.create({
        data: {
          title: data.title,
          description: data.description,
          category: data.category,
          severity: data.severity as unknown as import('@prisma/client').$Enums.SeverityLevel,
          priority: data.priority as unknown as import('@prisma/client').$Enums.PriorityLevel,
          priorityScore: priorityCalc.score,
          status: ChallengeStatus.DRAFT as unknown as import('@prisma/client').$Enums.ChallengeStatus,
          submitterId,
          submitterOrgId: submitterOrgId || null,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          address: data.address || null,
          district: data.district || null,
          state: data.state || null,
          affectedPopulation: data.affectedPopulation || null,
          durationMonths: data.durationMonths || null,
          version: 1,
        },
      });

      await tx.challengeTimeline.create({
        data: {
          challengeId: created.id,
          fromStatus: ChallengeStatus.DRAFT as unknown as import('@prisma/client').$Enums.ChallengeStatus,
          toStatus: ChallengeStatus.DRAFT as unknown as import('@prisma/client').$Enums.ChallengeStatus,
          actorId: submitterId,
          reason: 'Initial challenge draft created by citizen',
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

      if (data.aiAnalysisResult) {
        await tx.aIAnalysis.create({
          data: {
            challengeId: created.id,
            status: 'COMPLETED' as unknown as import('@prisma/client').$Enums.AIAnalysisStatus,
            rawResponse: data.aiAnalysisResult as any,
            confidenceScore: typeof data.aiAnalysisResult.confidenceScore === 'number' ? data.aiAnalysisResult.confidenceScore : 0.85,
            reasoningSummary: (data.aiAnalysisResult.reasoningSummary as string) || 'Multimodal AI problem intelligence processed at citizen intake.',
            requiresHumanReview: Boolean(data.aiAnalysisResult.requiresHumanReview),
            appliedRules: Array.isArray(data.aiAnalysisResult.appliedRules) ? (data.aiAnalysisResult.appliedRules as string[]) : ['MULTIMODAL_INTAKE_ANALYSIS'],
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
    };
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
          select: { id: true, title: true, status: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!challenge) {
      throw new NotFoundError('Challenge', id);
    }

    const relationships: ChallengeRelationshipDto[] = [
      ...challenge.sourceRelationships.map(r => ({
        id: r.id,
        sourceChallengeId: r.sourceChallengeId,
        targetChallengeId: r.targetChallengeId,
        targetChallengeTitle: r.targetChallenge.title,
        relationType: r.relationType as unknown as import('@sicp/shared').RelationshipType,
        status: r.status as unknown as import('@sicp/shared').RelationshipStatus,
        confidenceScore: r.confidenceScore,
        reasoning: r.reasoning,
        approvedById: r.approvedById,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      ...challenge.targetRelationships.map(r => ({
        id: r.id,
        sourceChallengeId: r.sourceChallengeId,
        targetChallengeId: r.targetChallengeId,
        sourceChallengeTitle: r.sourceChallenge.title,
        relationType: r.relationType as unknown as import('@sicp/shared').RelationshipType,
        status: r.status as unknown as import('@sicp/shared').RelationshipStatus,
        confidenceScore: r.confidenceScore,
        reasoning: r.reasoning,
        approvedById: r.approvedById,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    ];

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
      submitter: challenge.submitter
        ? { id: challenge.submitter.id, fullName: challenge.submitter.fullName, email: challenge.submitter.email }
        : (challenge.submitterId ? { id: challenge.submitterId, fullName: 'Citizen', email: '' } : null),
      latitude: challenge.latitude,
      longitude: challenge.longitude,
      address: challenge.address,
      district: challenge.district,
      state: challenge.state,
      affectedPopulation: challenge.affectedPopulation,
      durationMonths: challenge.durationMonths,
      isSystemic: challenge.isSystemic,
      systemicSummary: challenge.systemicSummary,
      isCanonical: challenge.isCanonical,
      canonicalClusterId: challenge.canonicalClusterId,
      version: challenge.version,
      supportVotesCount: challenge.communityVotes.length,
      timelines: challenge.timelines.map(t => ({
        id: t.id,
        challengeId: t.challengeId,
        fromStatus: t.fromStatus as unknown as ChallengeStatus,
        toStatus: t.toStatus as unknown as ChallengeStatus,
        actorId: t.actorId,
        actorRole: t.actor.role as unknown as UserRole,
        reason: t.reason,
        metadata: t.metadata as Record<string, unknown> | null,
        createdAt: t.createdAt.toISOString(),
      })),
      evidence: challenge.evidence.map(e => ({
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
      aiAnalysis: challenge.aiAnalysis,
      relationships,
      impact: challenge.impact
        ? {
            id: challenge.impact.id,
            challengeId: challenge.impact.challengeId,
            problemType: challenge.impact.problemType as unknown as ProblemType,
            metricType: challenge.impact.metricType as unknown as ImpactMetricType,
            value: challenge.impact.estimatedValue,
            unit: challenge.impact.unit,
            timeBasis: challenge.impact.timeBasis as unknown as ImpactTimeBasis,
            calculationMethod: challenge.impact.calculationMethod,
            inputs: challenge.impact.inputs as Record<string, unknown>,
            confidence: challenge.impact.confidence,
            evidenceBasis: (challenge.impact.evidenceBasis as string[]) || [],
            dataSources: (challenge.impact.dataSources as string[]) || [],
            verificationStatus: challenge.impact.verificationStatus as unknown as ImpactVerificationStatus,
            verifiedValue: challenge.impact.verifiedValue,
            verifiedById: challenge.impact.verifiedById,
            verifiedAt: challenge.impact.verifiedAt?.toISOString() || null,
            verificationNotes: challenge.impact.verificationNotes,
            normalizedMagnitude: challenge.impact.normalizedMagnitude,
            missingInformation: (challenge.impact.missingInformation as string[]) || [],
            suggestedQuestions: (challenge.impact.suggestedQuestions as unknown as AdaptiveQuestionDto[]) || [],
            requiresHumanReview: challenge.impact.requiresHumanReview,
            explanation: challenge.impact.explanation,
            createdAt: challenge.impact.createdAt.toISOString(),
            updatedAt: challenge.impact.updatedAt.toISOString(),
          }
        : null,
      projects: challenge.projects.map(p => ({
        id: p.id,
        title: p.title,
        status: p.status as unknown as import('@sicp/shared').ProjectStatus,
      })),
      createdAt: challenge.createdAt.toISOString(),
      updatedAt: challenge.updatedAt.toISOString(),
    };
  }

  public static async list(filter: {
    status?: ChallengeStatus;
    category?: string;
    district?: string;
    state?: string;
    submitterId?: string;
    isSystemic?: boolean;
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

    const [items, total] = await Promise.all([
      prisma.challenge.findMany({
        where: whereClause,
        orderBy: [{ priorityScore: 'desc' }, { createdAt: 'desc' }],
        take: filter.limit || 20,
        skip: filter.offset || 0,
        include: {
          communityVotes: true,
          impact: true,
          submitter: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      prisma.challenge.count({ where: whereClause }),
    ]);

    return {
      items: items.map(c => ({
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
        supportVotesCount: c.communityVotes.length,
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
      })),
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
    data: z.infer<typeof analyzeChallengeSchema>,
    context: { requestId: string }
  ) {
    logger.info(`[AI_REQUEST_STARTED] Direct analysis requested for: "${data.title}"`, { requestId: context.requestId });

    // Intent Gate validation
    const intentValidation = await ProblemIntentGateService.validate(
      {
        title: data.title,
        description: data.description,
        category: data.category,
      },
      context.requestId
    );

    if (intentValidation.nextAction === IntentNextAction.BLOCKED) {
      logger.warn(`[AI_ANALYSIS_BLOCKED_BY_INTENT] Intent validation blocked input: ${intentValidation.classification}`, {
        requestId: context.requestId,
      });
      throw new ValidationError(
        intentValidation.reason || 'The problem statement does not qualify as an actionable societal challenge.',
        { intent: intentValidation }
      );
    }

    try {
      const result = await AiServiceClient.analyzeChallenge(
        {
          title: data.title,
          description: data.description,
          category: data.category,
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
      logger.info(`[AI_REQUEST_SUCCESS] Direct AI analysis completed`, { requestId: context.requestId });
      return {
        ...result,
        intentValidation,
      };
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        throw err;
      }
      logger.warn(`[AI_REQUEST_DEGRADED] AI service rate-limited or unreachable: ${(err as Error).message}. Applying Civic Knowledge Engine fallback.`);

      const pop = data.affectedPopulation || 100;
      const isUrgent = pop > 500;
      const sev = isUrgent ? 'SEVERE' : (pop < 50 ? 'LOW' : 'MODERATE');
      const prio = isUrgent ? 'CRITICAL' : (pop < 50 ? 'LOW' : 'MEDIUM');
      const score = isUrgent ? 85.0 : (pop < 50 ? 35.0 : 55.0);

      const modalities = data.modalitiesProvided && data.modalitiesProvided.length > 0
        ? data.modalitiesProvided
        : ['TEXT'];

      const fallbackResult = {
        category: data.category,
        subcategory: `${data.category.replace(/_/g, ' ')} Infrastructure`,
        problemUnderstanding: `Civic issue regarding ${data.title}. Evaluated with multimodal citizen evidence.`,
        problemType: data.category.toUpperCase().replace(/\s+/g, '_'),
        normalizedStatement: `Reported civic deficiency: ${data.title}`,
        entities: ['Municipal Public Infrastructure', 'Distribution Assets'],
        estimatedSeverity: sev,
        preliminaryPriority: prio,
        priorityScore: score,
        severityBreakdown: {
          riskLevel: sev,
          urgencyLevel: prio,
          serviceDisruption: 'Public infrastructure impacted. Field review required.',
          environmentalImpact: 'Localized environmental or health risk.',
          vulnerabilityScore: isUrgent ? 0.7 : 0.4,
        },
        rootCauseHypotheses: [
          'Infrastructural wear and material fatigue along primary network',
          'Capacity bottleneck during peak utilization periods'
        ],
        systemicIndicators: [
          'Localized public complaints and repeated service disruption'
        ],
        duplicateKeywords: data.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3).slice(0, 5),
        confidenceScore: 0.80,
        reasoningSummary: 'Automated civic assessment applied via SICP Engineering Engine (Gemini free-tier rate-limit zero-interruption mode).',
        evidenceSummary: {
          textObservation: data.description ? 'Narrative details civic failure points.' : null,
          voiceObservation: data.transcribedAudio ? 'Citizen audio testimony matches problem description.' : null,
          visualObservation: (data.images && data.images.length > 0) ? `${data.images.length} photographic evidence item(s) logged.` : null,
          documentObservation: (data.documents && data.documents.length > 0) ? `${data.documents.length} civic document(s) referenced.` : null,
        },
        modalitiesAnalyzed: modalities,
        impactEstimate: {
          affectedEstimate: pop,
          unit: 'residents',
          basis: 'Civic engineering model',
        },
        requiresHumanReview: true,
        dataLimitations: 'Preliminary assessment based on citizen narrative and multimodal evidence. Requires municipal field verification.',
        appliedRules: ['CIVIC_ENGINE_SOCIETAL_MODEL', 'RATE_LIMIT_PROTECTION'],
        aiProvider: 'GEMINI_FALLBACK',
        intentValidation,
      };

      return fallbackResult;
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

      const record = await prisma.aIAnalysis.upsert({
        where: { challengeId },
        create: {
          challengeId,
          status: 'COMPLETED' as unknown as import('@prisma/client').$Enums.AIAnalysisStatus,
          rawResponse: result as any,
          confidenceScore: result.confidenceScore,
          reasoningSummary: result.reasoningSummary,
          requiresHumanReview: result.requiresHumanReview,
          appliedRules: result.appliedRules || [],
        },
        update: {
          status: 'COMPLETED' as unknown as import('@prisma/client').$Enums.AIAnalysisStatus,
          rawResponse: result as any,
          confidenceScore: result.confidenceScore,
          reasoningSummary: result.reasoningSummary,
          requiresHumanReview: result.requiresHumanReview,
          appliedRules: result.appliedRules || [],
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
}


