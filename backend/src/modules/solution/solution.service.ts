import { prisma } from '../../database/prisma';
import {
  SolutionMemoryDto,
  CreateSolutionMemoryDto,
  ReviewSolutionMemoryDto,
  SolutionRetrievalFilterDto,
  HistoricalRecommendationDto,
  SolutionComparisonDto,
  KnowledgeAnalyticsDto,
  InstitutionalLearningDto,
  KnowledgeAssistantRequestDto,
  KnowledgeAssistantResponseDto,
  SolutionMemoryStatus,
  ReusabilityClass,
  EvidenceLevel,
  MemoryOutcomeStatus,
  EmbeddingStatus,
  AuditAction,
  UserRole,
  ProjectStatus,
  OutcomeVerificationStatus,
  ProblemType,
} from '@sicp/shared';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { AuditService } from '../audit/audit.service';
import { QueueManager } from '../../jobs/queue.manager';
import { SolutionRetrievalEngine } from '../../domain/intelligence/solution-retrieval.engine';
import { KnowledgeAssistantEngine } from '../../domain/intelligence/knowledge-assistant.engine';
import { hasPermission } from '../../domain/permissions/permissions.matrix';
import { logger } from '../../utils/logger';

export class SolutionService {
  /**
   * Automatically generates a draft SolutionMemory from a completed or deployed project.
   */
  public static async generateDraftFromProject(params: {
    projectId: string;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
  }): Promise<SolutionMemoryDto> {
    const { projectId, actorId, actorRole, requestId } = params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        challenge: {
          include: {
            impact: true,
          },
        },
        proposals: {
          where: { status: 'APPROVED' },
          orderBy: { version: 'desc' },
          take: 1,
        },
        deployments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        outcomeVerifications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    // Check if memory already exists
    const existing = await prisma.solutionMemory.findFirst({
      where: { projectId },
    });
    if (existing) {
      return this.mapToDto(existing);
    }

    const challenge = project.challenge;
    const proposal = project.proposals[0];
    const outcome = project.outcomeVerifications[0];
    const deployment = project.deployments[0];

    const title = `Solution: ${project.title}`;
    const challengeCategory = challenge.category;
    const problemType = (challenge.impact?.problemType as ProblemType) || null;
    const problemSummary = challenge.description;
    const rootCause = (challenge.impact?.inputs as any)?.rootCause || challenge.category;
    const technicalApproach = proposal?.technicalApproach || project.description;
    const summary = `${project.title} addresses ${challenge.title} through ${technicalApproach.slice(0, 150)}...`;

    // Determine outcome status
    let outcomeStatus = MemoryOutcomeStatus.UNDER_EVALUATION;
    let evidenceLevel = EvidenceLevel.ESTIMATED;

    if (outcome) {
      if (outcome.status === OutcomeVerificationStatus.VERIFIED) {
        outcomeStatus = MemoryOutcomeStatus.SUCCESSFUL;
        evidenceLevel = EvidenceLevel.VERIFIED;
      } else if (outcome.status === OutcomeVerificationStatus.VERIFIED_WITH_LIMITATIONS) {
        outcomeStatus = MemoryOutcomeStatus.PARTIALLY_EFFECTIVE;
        evidenceLevel = EvidenceLevel.VERIFIED;
      } else if (outcome.status === OutcomeVerificationStatus.NOT_VERIFIED) {
        outcomeStatus = MemoryOutcomeStatus.FAILED;
        evidenceLevel = EvidenceLevel.OFFICIAL;
      }
    } else if (project.status === ProjectStatus.COMPLETED) {
      outcomeStatus = MemoryOutcomeStatus.SUCCESSFUL;
      evidenceLevel = EvidenceLevel.CALCULATED;
    }

    const whatWorked = outcome?.observedSummary || proposal?.expectedImpact || 'Implementation met technical specifications.';
    const whatFailed = outcome?.limitations || deployment?.failureRootCause || deployment?.blockerReason || null;
    const limitations = outcome?.limitations || null;
    const futureWarnings = whatFailed
      ? `Attention for future replications: ${whatFailed}`
      : null;
    const lessonsLearned = `Project executed over ${deployment ? 'operational deployment' : 'pilot phase'}. ${whatWorked} ${limitations ? `Limitations noted: ${limitations}` : ''}`;

    const reusabilityScore = SolutionRetrievalEngine.calculateReusabilityScore({
      outcomeStatus,
      evidenceLevel,
      whatFailed,
      limitations,
    });
    const reusabilityClass = SolutionRetrievalEngine.mapScoreToReusabilityClass(reusabilityScore, outcomeStatus);

    const canonicalText = `${title}\nCategory: ${challengeCategory}\nProblem: ${problemSummary}\nRoot Cause: ${rootCause}\nApproach: ${technicalApproach}\nLessons: ${lessonsLearned}\nWhat Worked: ${whatWorked}\nWhat Failed: ${whatFailed || 'None'}`;

    const locationContext = {
      district: challenge.district,
      state: challenge.state,
      latitude: challenge.latitude,
      longitude: challenge.longitude,
    };

    const memory = await prisma.solutionMemory.create({
      data: {
        projectId,
        challengeId: challenge.id,
        title,
        summary,
        challengeCategory,
        problemType: problemType ? String(problemType) : null,
        problemSummary,
        rootCause,
        rootCauseSummary: rootCause,
        technicalApproach,
        solutionSummary: summary,
        implementationSummary: proposal?.technicalApproach || technicalApproach,
        impactSummary: outcome?.observedSummary || null,
        lessonsLearned,
        whatWorked,
        whatFailed,
        futureWarnings,
        limitations,
        reusabilityScore,
        reusabilityClass,
        reusabilityExplanation: `Computed initial score of ${reusabilityScore} based on field verification.`,
        evidenceLevel,
        status: SolutionMemoryStatus.DRAFT,
        outcomeStatus,
        canonicalText,
        embeddingStatus: EmbeddingStatus.PENDING,
        locationContext: locationContext as any,
        tags: [challengeCategory, ...(problemType ? [String(problemType)] : [])],
      },
      include: {
        project: true,
        challenge: true,
      },
    });

    // Enqueue embedding generation resiliently
    try {
      await QueueManager.enqueueEmbeddingGeneration(memory.id, canonicalText, requestId);
    } catch (err) {
      logger.warn(`Failed to enqueue embedding: ${(err as Error).message}`);
    }

    await AuditService.log({
      actorId,
      actorRole,
      action: AuditAction.SOLUTION_MEMORY_CREATED,
      resource: 'SolutionMemory',
      resourceId: memory.id,
      previousState: null,
      newState: memory,
      reason: `Automated solution memory draft synthesized from project ${projectId}`,
      requestId,
    });

    return this.mapToDto(memory);
  }

  /**
   * Manually creates a new SolutionMemory record.
   */
  public static async createSolutionMemory(params: {
    dto: CreateSolutionMemoryDto;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
  }): Promise<SolutionMemoryDto> {
    const { dto, actorId, actorRole, requestId } = params;

    const outcomeStatus = dto.outcomeStatus || MemoryOutcomeStatus.UNDER_EVALUATION;
    const evidenceLevel = dto.evidenceLevel || EvidenceLevel.CALCULATED;

    const reusabilityScore =
      dto.reusabilityScore ??
      SolutionRetrievalEngine.calculateReusabilityScore({
        outcomeStatus,
        evidenceLevel,
        whatFailed: dto.whatFailed,
        limitations: dto.limitations,
      });

    const reusabilityClass =
      dto.reusabilityClass ??
      SolutionRetrievalEngine.mapScoreToReusabilityClass(reusabilityScore, outcomeStatus);

    const canonicalText = `${dto.title}\nCategory: ${dto.challengeCategory}\nProblem: ${dto.problemSummary}\nRoot Cause: ${dto.rootCause}\nApproach: ${dto.technicalApproach}\nLessons: ${dto.lessonsLearned}\nWhat Worked: ${dto.whatWorked || 'None'}\nWhat Failed: ${dto.whatFailed || 'None'}`;

    const memory = await prisma.solutionMemory.create({
      data: {
        projectId: dto.projectId || null,
        challengeId: dto.challengeId || null,
        title: dto.title,
        summary: dto.summary,
        challengeCategory: dto.challengeCategory,
        problemType: dto.problemType ? String(dto.problemType) : null,
        problemSummary: dto.problemSummary,
        rootCause: dto.rootCause,
        rootCauseSummary: dto.rootCauseSummary || dto.rootCause,
        technicalApproach: dto.technicalApproach,
        solutionSummary: dto.solutionSummary || dto.summary,
        implementationSummary: dto.implementationSummary || dto.technicalApproach,
        impactSummary: dto.impactSummary || null,
        lessonsLearned: dto.lessonsLearned,
        whatWorked: dto.whatWorked || null,
        whatFailed: dto.whatFailed || null,
        futureWarnings: dto.futureWarnings || null,
        limitations: dto.limitations || null,
        reusabilityScore,
        reusabilityClass,
        reusabilityExplanation: dto.reusabilityExplanation || `Reusability score: ${reusabilityScore}`,
        evidenceLevel,
        status: SolutionMemoryStatus.DRAFT,
        outcomeStatus,
        canonicalText,
        embeddingStatus: EmbeddingStatus.PENDING,
        failureContext: dto.failureContext || null,
        constraints: dto.constraints || null,
        locationContext: (dto.locationContext as any) || null,
        tags: dto.tags || [dto.challengeCategory],
      },
      include: {
        project: true,
        challenge: true,
      },
    });

    try {
      await QueueManager.enqueueEmbeddingGeneration(memory.id, canonicalText, requestId);
    } catch (err) {
      logger.warn(`Failed to enqueue embedding: ${(err as Error).message}`);
    }

    await AuditService.log({
      actorId,
      actorRole,
      action: AuditAction.SOLUTION_MEMORY_CREATED,
      resource: 'SolutionMemory',
      resourceId: memory.id,
      previousState: null,
      newState: memory,
      reason: `Solution memory record created for ${dto.title}`,
      requestId,
    });

    return this.mapToDto(memory);
  }

  /**
   * Updates an existing SolutionMemory.
   */
  public static async updateSolutionMemory(params: {
    id: string;
    dto: Partial<CreateSolutionMemoryDto>;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
  }): Promise<SolutionMemoryDto> {
    const { id, dto, actorId, actorRole, requestId } = params;

    const existing = await prisma.solutionMemory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundError('SolutionMemory', id);
    }

    const updatedOutcomeStatus = dto.outcomeStatus || (existing.outcomeStatus as MemoryOutcomeStatus);
    const updatedEvidenceLevel = dto.evidenceLevel || (existing.evidenceLevel as EvidenceLevel);
    const updatedWhatFailed = dto.whatFailed !== undefined ? dto.whatFailed : existing.whatFailed;
    const updatedLimitations = dto.limitations !== undefined ? dto.limitations : existing.limitations;

    const reusabilityScore =
      dto.reusabilityScore ??
      SolutionRetrievalEngine.calculateReusabilityScore({
        outcomeStatus: updatedOutcomeStatus,
        evidenceLevel: updatedEvidenceLevel,
        whatFailed: updatedWhatFailed,
        limitations: updatedLimitations,
      });

    const reusabilityClass =
      dto.reusabilityClass ??
      SolutionRetrievalEngine.mapScoreToReusabilityClass(reusabilityScore, updatedOutcomeStatus);

    const canonicalText = `${dto.title || existing.title}\nCategory: ${dto.challengeCategory || existing.challengeCategory}\nProblem: ${dto.problemSummary || existing.problemSummary}\nRoot Cause: ${dto.rootCause || existing.rootCause}\nApproach: ${dto.technicalApproach || existing.technicalApproach}\nLessons: ${dto.lessonsLearned || existing.lessonsLearned}\nWhat Worked: ${dto.whatWorked || existing.whatWorked || 'None'}\nWhat Failed: ${updatedWhatFailed || 'None'}`;

    const memory = await prisma.solutionMemory.update({
      where: { id },
      data: {
        title: dto.title ?? existing.title,
        summary: dto.summary ?? existing.summary,
        challengeCategory: dto.challengeCategory ?? existing.challengeCategory,
        problemType: dto.problemType ? String(dto.problemType) : existing.problemType,
        problemSummary: dto.problemSummary ?? existing.problemSummary,
        rootCause: dto.rootCause ?? existing.rootCause,
        rootCauseSummary: dto.rootCauseSummary ?? existing.rootCauseSummary,
        technicalApproach: dto.technicalApproach ?? existing.technicalApproach,
        solutionSummary: dto.solutionSummary ?? existing.solutionSummary,
        implementationSummary: dto.implementationSummary ?? existing.implementationSummary,
        impactSummary: dto.impactSummary ?? existing.impactSummary,
        lessonsLearned: dto.lessonsLearned ?? existing.lessonsLearned,
        whatWorked: dto.whatWorked ?? existing.whatWorked,
        whatFailed: updatedWhatFailed,
        futureWarnings: dto.futureWarnings ?? existing.futureWarnings,
        limitations: updatedLimitations,
        reusabilityScore,
        reusabilityClass,
        reusabilityExplanation: dto.reusabilityExplanation ?? existing.reusabilityExplanation,
        evidenceLevel: updatedEvidenceLevel,
        outcomeStatus: updatedOutcomeStatus,
        canonicalText,
        failureContext: dto.failureContext ?? existing.failureContext,
        constraints: dto.constraints ?? existing.constraints,
        locationContext: dto.locationContext ? (dto.locationContext as any) : existing.locationContext,
        tags: dto.tags ?? existing.tags,
      },
      include: {
        project: true,
        challenge: true,
      },
    });

    if (dto.whatFailed && dto.whatFailed !== existing.whatFailed) {
      await AuditService.log({
        actorId,
        actorRole,
        action: AuditAction.FAILURE_LESSON_ADDED,
        resource: 'SolutionMemory',
        resourceId: id,
        previousState: { whatFailed: existing.whatFailed },
        newState: { whatFailed: dto.whatFailed },
        reason: 'Documented field failure lessons for future teams',
        requestId,
      });
    }

    await AuditService.log({
      actorId,
      actorRole,
      action: AuditAction.SOLUTION_MEMORY_UPDATED,
      resource: 'SolutionMemory',
      resourceId: id,
      previousState: existing,
      newState: memory,
      reason: `Solution memory ${id} updated`,
      requestId,
    });

    return this.mapToDto(memory);
  }

  /**
   * Reviews and publishes/archives a SolutionMemory.
   */
  public static async reviewSolutionMemory(params: {
    id: string;
    dto: ReviewSolutionMemoryDto;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
  }): Promise<SolutionMemoryDto> {
    const { id, dto, actorId, actorRole, requestId } = params;

    const existing = await prisma.solutionMemory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundError('SolutionMemory', id);
    }

    const isPublishing = dto.status === SolutionMemoryStatus.PUBLISHED;
    if (isPublishing && !hasPermission(actorRole, 'solution:publish')) {
      throw new ForbiddenError('solution:publish', 'Publishing a SolutionMemory requires publication authorization');
    }

    const memory = await prisma.$transaction(async tx => {
      const updated = await tx.solutionMemory.update({
        where: { id },
        data: {
          status: dto.status,
          reviewNotes: dto.reviewNotes ?? existing.reviewNotes,
          reusabilityClass: dto.reusabilityClass ?? existing.reusabilityClass,
          outcomeStatus: dto.outcomeStatus ?? existing.outcomeStatus,
          whatWorked: dto.whatWorked ?? existing.whatWorked,
          whatFailed: dto.whatFailed ?? existing.whatFailed,
          futureWarnings: dto.futureWarnings ?? existing.futureWarnings,
          limitations: dto.limitations ?? existing.limitations,
          reviewedById: actorId,
          lastReviewedAt: new Date(),
        },
        include: {
          project: true,
          challenge: true,
          reviewer: true,
        },
      });

      await AuditService.log({
        actorId,
        actorRole,
        action: isPublishing ? AuditAction.SOLUTION_MEMORY_PUBLISHED : AuditAction.SOLUTION_MEMORY_REVIEWED,
        resource: 'SolutionMemory',
        resourceId: id,
        previousState: { status: existing.status },
        newState: { status: updated.status, reviewNotes: dto.reviewNotes },
        reason: `Solution memory reviewed with status ${dto.status}`,
        requestId,
      });

      return updated;
    });

    return this.mapToDto(memory);
  }

  /**
   * Retrieves a single SolutionMemory by ID with RBAC visibility filtering.
   */
  public static async getSolutionMemory(id: string, userRole?: UserRole): Promise<SolutionMemoryDto> {
    const memory = await prisma.solutionMemory.findUnique({
      where: { id },
      include: {
        project: true,
        challenge: true,
        reviewer: true,
      },
    });

    if (!memory) {
      throw new NotFoundError('SolutionMemory', id);
    }

    // Role-based visibility: citizens can only view PUBLISHED memories
    const isPublic = userRole === UserRole.CITIZEN || userRole === UserRole.COMMUNITY_GROUP || !userRole;
    if (isPublic && memory.status !== SolutionMemoryStatus.PUBLISHED) {
      throw new NotFoundError('SolutionMemory', id);
    }

    // Increment view count asynchronously
    prisma.solutionMemory
      .update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(err => logger.warn(`Failed to increment viewCount: ${err.message}`));

    return this.mapToDto(memory, isPublic);
  }

  /**
   * Search and filter Solution Memories.
   */
  public static async searchSolutions(
    filters: SolutionRetrievalFilterDto,
    userRole?: UserRole
  ): Promise<{ items: SolutionMemoryDto[]; total: number }> {
    const isPublic = userRole === UserRole.CITIZEN || userRole === UserRole.COMMUNITY_GROUP || !userRole;
    const limit = filters.limit ? Math.min(filters.limit, 50) : 20;
    const offset = filters.offset || 0;

    const where: any = {};

    if (isPublic) {
      where.status = SolutionMemoryStatus.PUBLISHED;
    } else if (filters.status) {
      where.status = filters.status;
    }

    if (filters.category) {
      where.challengeCategory = { equals: filters.category, mode: 'insensitive' };
    }

    if (filters.problemType) {
      where.problemType = String(filters.problemType);
    }

    if (filters.outcomeStatus) {
      where.outcomeStatus = filters.outcomeStatus;
    }

    if (filters.reusabilityClass) {
      where.reusabilityClass = filters.reusabilityClass;
    }

    if (filters.evidenceLevel) {
      where.evidenceLevel = filters.evidenceLevel;
    }

    if ((filters as any).projectId) {
      where.projectId = (filters as any).projectId;
    }

    if (filters.query && filters.query.trim()) {
      const q = filters.query.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { problemSummary: { contains: q, mode: 'insensitive' } },
        { technicalApproach: { contains: q, mode: 'insensitive' } },
        { rootCause: { contains: q, mode: 'insensitive' } },
        { tags: { has: q } },
      ];
    }

    const [memories, total] = await Promise.all([
      prisma.solutionMemory.findMany({
        where,
        include: {
          project: true,
          challenge: true,
          reviewer: true,
        },
        orderBy: [{ reusabilityScore: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
      }),
      prisma.solutionMemory.count({ where }),
    ]);

    return {
      items: memories.map(m => this.mapToDto(m, isPublic)),
      total,
    };
  }

  /**
   * Compare 2-3 solution memories side by side.
   */
  public static async compareSolutions(solutionIds: string[], userRole?: UserRole): Promise<SolutionComparisonDto> {
    if (!solutionIds || solutionIds.length < 2) {
      throw new ValidationError('At least 2 solution IDs are required for comparison.');
    }
    if (solutionIds.length > 5) {
      throw new ValidationError('A maximum of 5 solutions can be compared simultaneously.');
    }

    return SolutionRetrievalEngine.compareSolutions(solutionIds, userRole);
  }

  /**
   * Retrieves relevant historical solutions for a specific challenge.
   */
  public static async getChallengeHistoricalSolutions(
    challengeId: string,
    userRole?: UserRole
  ): Promise<HistoricalRecommendationDto[]> {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: { impact: true },
    });

    if (!challenge) {
      throw new NotFoundError('Challenge', challengeId);
    }

    return SolutionRetrievalEngine.retrieveRelevantSolutions(
      {
        challengeId: challenge.id,
        title: challenge.title,
        description: challenge.description,
        category: challenge.category,
        problemType: challenge.impact?.problemType,
        latitude: challenge.latitude,
        longitude: challenge.longitude,
        district: challenge.district,
        state: challenge.state,
      },
      userRole
    );
  }

  /**
   * Aggregated Knowledge and Institutional Analytics.
   */
  public static async getKnowledgeAnalytics(): Promise<KnowledgeAnalyticsDto> {
    const memories = await prisma.solutionMemory.findMany({
      select: {
        id: true,
        title: true,
        challengeCategory: true,
        outcomeStatus: true,
        reusabilityClass: true,
        evidenceLevel: true,
        status: true,
        viewCount: true,
        reuseCount: true,
        whatFailed: true,
        rootCause: true,
      },
    });

    const totalMemories = memories.length;
    let publishedMemories = 0;
    let underReviewMemories = 0;
    let requiresReviewMemories = 0;

    const memoriesByDomain: Record<string, number> = {};
    const memoriesByReusability: Record<string, number> = {};
    const evidenceLevelDistribution: Record<string, number> = {};

    const memoriesByOutcome = {
      successful: 0,
      partiallyEffective: 0,
      failed: 0,
      requiresReview: 0,
      underEvaluation: 0,
    };

    const failureMap: Record<string, number> = {};
    const rootCauseMap: Record<string, number> = {};

    for (const m of memories) {
      if (m.status === SolutionMemoryStatus.PUBLISHED) publishedMemories++;
      if (m.status === SolutionMemoryStatus.UNDER_REVIEW) underReviewMemories++;
      if (m.status === SolutionMemoryStatus.REQUIRES_REVIEW) requiresReviewMemories++;

      // Domain
      memoriesByDomain[m.challengeCategory] = (memoriesByDomain[m.challengeCategory] || 0) + 1;

      // Reusability
      memoriesByReusability[m.reusabilityClass] = (memoriesByReusability[m.reusabilityClass] || 0) + 1;

      // Evidence
      evidenceLevelDistribution[m.evidenceLevel] = (evidenceLevelDistribution[m.evidenceLevel] || 0) + 1;

      // Outcome
      if (m.outcomeStatus === MemoryOutcomeStatus.SUCCESS || m.outcomeStatus === MemoryOutcomeStatus.SUCCESSFUL) {
        memoriesByOutcome.successful++;
      } else if (m.outcomeStatus === MemoryOutcomeStatus.PARTIAL_SUCCESS || m.outcomeStatus === MemoryOutcomeStatus.PARTIALLY_EFFECTIVE) {
        memoriesByOutcome.partiallyEffective++;
      } else if (m.outcomeStatus === MemoryOutcomeStatus.FAILED) {
        memoriesByOutcome.failed++;
      } else if (m.outcomeStatus === MemoryOutcomeStatus.REQUIRES_REVIEW) {
        memoriesByOutcome.requiresReview++;
      } else {
        memoriesByOutcome.underEvaluation++;
      }

      // Failure causes
      if (m.whatFailed && m.whatFailed.trim().length > 5) {
        const shortCause = m.whatFailed.slice(0, 60);
        failureMap[shortCause] = (failureMap[shortCause] || 0) + 1;
      }

      // Root causes
      if (m.rootCause && m.rootCause.trim().length > 3) {
        const rc = m.rootCause.slice(0, 50);
        rootCauseMap[rc] = (rootCauseMap[rc] || 0) + 1;
      }
    }

    const topReusableInterventions = memories
      .filter(m => m.reusabilityClass === ReusabilityClass.HIGHLY_REUSABLE || m.reusabilityClass === ReusabilityClass.CONDITIONALLY_REUSABLE)
      .sort((a, b) => b.reuseCount - a.reuseCount || b.viewCount - a.viewCount)
      .slice(0, 5)
      .map(m => ({
        id: m.id,
        title: m.title,
        category: m.challengeCategory,
        reusabilityClass: m.reusabilityClass as ReusabilityClass,
        reuseCount: m.reuseCount,
        viewCount: m.viewCount,
      }));

    const commonFailureCauses = Object.entries(failureMap)
      .map(([cause, count]) => ({ cause, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const commonRootCauses = Object.entries(rootCauseMap)
      .map(([cause, count]) => ({ cause, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalMemories,
      publishedMemories,
      underReviewMemories,
      requiresReviewMemories,
      memoriesByDomain,
      memoriesByOutcome,
      memoriesByReusability,
      evidenceLevelDistribution,
      topReusableInterventions,
      commonFailureCauses,
      commonRootCauses,
    };
  }

  /**
   * Institutional Learning Profile for a University / Organization.
   */
  public static async getInstitutionalLearning(organizationId: string): Promise<InstitutionalLearningDto> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        ledProjects: {
          include: {
            challenge: true,
            outcomeVerifications: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundError('Organization', organizationId);
    }

    const projects = org.ledProjects;
    const totalProjects = projects.length;
    const completedProjects = projects.filter(p => p.status === ProjectStatus.COMPLETED).length;

    let successfulOutcomes = 0;
    let partialOutcomes = 0;
    let failedOutcomes = 0;

    const domainsSet = new Set<string>();

    for (const p of projects) {
      if (p.challenge?.category) {
        domainsSet.add(p.challenge.category);
      }
      for (const ov of p.outcomeVerifications) {
        if (ov.status === OutcomeVerificationStatus.VERIFIED) successfulOutcomes++;
        else if (ov.status === OutcomeVerificationStatus.VERIFIED_WITH_LIMITATIONS) partialOutcomes++;
        else if (ov.status === OutcomeVerificationStatus.NOT_VERIFIED) failedOutcomes++;
      }
    }

    // Associated solution memories
    const projectIds = projects.map(p => p.id);
    const memories = await prisma.solutionMemory.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const reusableInnovationsCount = memories.filter(
      m => m.reusabilityClass === ReusabilityClass.HIGHLY_REUSABLE || m.reusabilityClass === ReusabilityClass.CONDITIONALLY_REUSABLE
    ).length;

    // Innovations count
    const innovations = await prisma.innovationOutcome.findMany({
      where: { projectId: { in: projectIds } },
    });
    const patentsCount = innovations.filter(i => (i.outcomeType as string) === 'PATENT_FILED').length;
    const startupsCount = innovations.filter(i => (i.outcomeType as string) === 'STARTUP').length;

    return {
      organizationId: org.id,
      organizationName: org.name,
      organizationType: org.type,
      totalProjects,
      completedProjects,
      sampleSizeDisclosure: `Metrics computed over ${totalProjects} assigned institutional initiatives.`,
      successfulOutcomes,
      partialOutcomes,
      failedOutcomes,
      domainExpertise: Array.from(domainsSet),
      reusableInnovationsCount,
      patentsCount,
      startupsCount,
      recentMemories: memories.map(m => ({
        id: m.id,
        title: m.title,
        outcomeStatus: m.outcomeStatus as MemoryOutcomeStatus,
        reusabilityClass: m.reusabilityClass as ReusabilityClass,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Natural Language Anti-Hallucinating Knowledge Assistant.
   */
  public static async askKnowledgeAssistant(params: {
    request: KnowledgeAssistantRequestDto;
    userRole: UserRole;
    userId?: string;
    requestId: string;
  }): Promise<KnowledgeAssistantResponseDto> {
    const { request, userRole, userId, requestId } = params;
    const queryStr = (request.query || (request as any).question || '').trim();
    const effectiveRequest = { ...request, query: queryStr };

    const response = await KnowledgeAssistantEngine.askAssistant(effectiveRequest, userRole, userId);

    if (userId) {
      await AuditService.log({
        actorId: userId,
        actorRole: userRole,
        action: AuditAction.KNOWLEDGE_RETRIEVED,
        resource: 'KnowledgeAssistant',
        resourceId: request.challengeId || request.projectId || 'ad-hoc-query',
        previousState: null,
        newState: {
          query: queryStr,
          citationsCount: response.citations.length,
          evidenceQuality: response.evidenceQuality,
        },
        reason: `Knowledge Assistant query evaluated: ${queryStr.slice(0, 100)}`,
        requestId,
      });
    }

    return response;
  }

  /**
   * Helper to map database model to shared DTO
   */
  private static mapToDto(memory: any, isPublic: boolean = false): SolutionMemoryDto {
    return {
      id: memory.id,
      projectId: memory.projectId,
      projectTitle: memory.project?.title || null,
      challengeId: memory.challengeId,
      challengeTitle: memory.challenge?.title || null,
      title: memory.title,
      summary: memory.summary,
      challengeCategory: memory.challengeCategory,
      problemType: memory.problemType as ProblemType | null,
      problemSummary: memory.problemSummary,
      rootCause: memory.rootCause,
      rootCauseSummary: memory.rootCauseSummary,
      technicalApproach: memory.technicalApproach,
      solutionSummary: memory.solutionSummary,
      implementationSummary: memory.implementationSummary,
      impactSummary: memory.impactSummary,
      lessonsLearned: memory.lessonsLearned,
      whatWorked: memory.whatWorked,
      whatFailed: memory.whatFailed,
      futureWarnings: memory.futureWarnings,
      limitations: memory.limitations,
      reusabilityScore: memory.reusabilityScore,
      reusabilityClass: memory.reusabilityClass as ReusabilityClass,
      reusabilityExplanation: memory.reusabilityExplanation,
      evidenceLevel: memory.evidenceLevel as EvidenceLevel,
      status: memory.status as SolutionMemoryStatus,
      outcomeStatus: memory.outcomeStatus as MemoryOutcomeStatus,
      canonicalText: isPublic ? null : memory.canonicalText,
      embeddingModel: memory.embeddingModel,
      embeddingVersion: memory.embeddingVersion,
      embeddingStatus: memory.embeddingStatus as EmbeddingStatus,
      embeddingGeneratedAt: memory.embeddingGeneratedAt?.toISOString() || null,
      embeddingFailureReason: isPublic ? null : memory.embeddingFailureReason,
      reviewedById: isPublic ? null : memory.reviewedById,
      reviewerName: isPublic ? null : memory.reviewer?.name || null,
      lastReviewedAt: memory.lastReviewedAt?.toISOString() || null,
      reviewNotes: isPublic ? null : memory.reviewNotes,
      failureContext: memory.failureContext,
      constraints: memory.constraints,
      locationContext: memory.locationContext as Record<string, unknown> | null,
      tags: memory.tags || [],
      viewCount: memory.viewCount,
      reuseCount: memory.reuseCount,
      createdAt: memory.createdAt.toISOString(),
      updatedAt: memory.updatedAt.toISOString(),
    };
  }
}
