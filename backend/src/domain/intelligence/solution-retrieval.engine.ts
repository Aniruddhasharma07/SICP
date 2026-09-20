import { prisma } from '../../database/prisma';
import {
  MatchFactorBreakdownDto,
  HistoricalRecommendationDto,
  SolutionComparisonDto,
  ReusabilityClass,
  EvidenceLevel,
  MemoryOutcomeStatus,
  SolutionMemoryStatus,
  ProblemType,
  UserRole,
} from '@sicp/shared';
import { DuplicateClusteringService } from './duplicate-clustering.service';
import { logger } from '../../utils/logger';

export interface RetrievalQueryContext {
  challengeId?: string;
  category?: string;
  problemType?: ProblemType | string;
  title: string;
  description: string;
  rootCause?: string;
  latitude?: number | null;
  longitude?: number | null;
  district?: string | null;
  state?: string | null;
  tags?: string[];
  limit?: number;
}

export class SolutionRetrievalEngine {
  /**
   * Evidence Level Weight Matrix for Scoring
   */
  private static readonly EVIDENCE_WEIGHTS: Record<EvidenceLevel, number> = {
    [EvidenceLevel.MULTI_SOURCE_VERIFIED]: 1.0,
    [EvidenceLevel.VERIFIED]: 0.95,
    [EvidenceLevel.OFFICIAL]: 0.9,
    [EvidenceLevel.CITIZEN_REPORTED]: 0.75,
    [EvidenceLevel.CALCULATED]: 0.7,
    [EvidenceLevel.ESTIMATED]: 0.55,
    [EvidenceLevel.AI_ASSISTED]: 0.45,
    [EvidenceLevel.UNKNOWN]: 0.2,
  };

  /**
   * Evaluates historical solution memories against a query or challenge context
   * using explainable 5-factor hybrid scoring.
   */
  public static async retrieveRelevantSolutions(
    query: RetrievalQueryContext,
    userRole?: UserRole
  ): Promise<HistoricalRecommendationDto[]> {
    const limit = query.limit ?? 5;

    // Visibility filter: Citizens and public roles only see PUBLISHED solutions
    const allowedStatuses: SolutionMemoryStatus[] =
      userRole === UserRole.CITIZEN || userRole === UserRole.COMMUNITY_GROUP || !userRole
        ? [SolutionMemoryStatus.PUBLISHED]
        : [SolutionMemoryStatus.PUBLISHED, SolutionMemoryStatus.UNDER_REVIEW, SolutionMemoryStatus.REQUIRES_REVIEW];

    const whereClause: any = {
      status: { in: allowedStatuses },
    };

    if (query.category) {
      whereClause.challengeCategory = { equals: query.category, mode: 'insensitive' };
    }

    const candidateMemories = await prisma.solutionMemory.findMany({
      where: whereClause,
      include: {
        project: {
          select: { id: true, title: true, status: true },
        },
        challenge: {
          select: { id: true, title: true, district: true, state: true, latitude: true, longitude: true },
        },
        applications: {
          select: {
            id: true,
            projectId: true,
            challengeId: true,
            outcomeStatus: true,
            observedImpact: true,
            targetAchieved: true,
            successFactors: true,
            failureFactors: true,
            failureReason: true,
            maintenanceIssues: true,
            createdAt: true,
          },
        },
      },
      take: 50,
    });

    if (candidateMemories.length === 0) {
      return [];
    }

    const recommendations: HistoricalRecommendationDto[] = [];

    const queryProblemText = `${query.title} ${query.description}`.toLowerCase();
    const queryRootCause = (query.rootCause || '').toLowerCase();

    for (const memory of candidateMemories) {
      // 1. Problem Similarity (Weight 0.35)
      const memoryProblemText = `${memory.title} ${memory.problemSummary} ${memory.summary}`.toLowerCase();
      const problemSimilarity = DuplicateClusteringService.calculateTokenSimilarity(queryProblemText, memoryProblemText);

      // 2. Root Cause Alignment (Weight 0.25)
      let rootCauseAlignment = 0.3; // Default baseline if unspecified
      if (queryRootCause && memory.rootCause) {
        rootCauseAlignment = DuplicateClusteringService.calculateTokenSimilarity(
          queryRootCause,
          memory.rootCause.toLowerCase()
        );
      } else if (memory.rootCause && queryProblemText.includes(memory.rootCause.toLowerCase())) {
        rootCauseAlignment = 0.7;
      }

      // 3. Geographic Context (Weight 0.15)
      let geographicContext = 0.5; // Neutral baseline for cross-geography portability
      let distKm: number | null = null;

      const memLat = (memory.locationContext as any)?.latitude ?? (memory as any).challenge?.latitude;
      const memLng = (memory.locationContext as any)?.longitude ?? (memory as any).challenge?.longitude;
      const memDistrict = (memory.locationContext as any)?.district ?? (memory as any).challenge?.district;
      const memState = (memory.locationContext as any)?.state ?? (memory as any).challenge?.state;

      if (query.latitude != null && query.longitude != null && memLat != null && memLng != null) {
        distKm = DuplicateClusteringService.calculateDistanceKm(
          query.latitude,
          query.longitude,
          memLat,
          memLng
        );
        if (distKm !== null) {
          if (distKm < 50) geographicContext = 1.0;
          else if (distKm < 150) geographicContext = 0.85;
          else if (distKm < 500) geographicContext = 0.65;
          else geographicContext = 0.4;
        }
      } else if (query.district && memDistrict && query.district.toLowerCase() === memDistrict.toLowerCase()) {
        geographicContext = 0.9;
      } else if (query.state && memState && query.state.toLowerCase() === memState.toLowerCase()) {
        geographicContext = 0.7;
      }

      // 4. Verified Evidence Level (Weight 0.15)
      const verifiedEvidence = this.EVIDENCE_WEIGHTS[memory.evidenceLevel as EvidenceLevel] ?? 0.5;

      // 5. Implementation Compatibility (Weight 0.10)
      let implementationCompatibility = 0.5;
      if (query.problemType && memory.problemType) {
        if (String(query.problemType).toLowerCase() === String(memory.problemType).toLowerCase()) {
          implementationCompatibility = 1.0;
        }
      } else if (query.tags && query.tags.length > 0 && memory.tags && memory.tags.length > 0) {
        const memTagSet = new Set(memory.tags.map(t => t.toLowerCase()));
        const matchCount = query.tags.filter(t => memTagSet.has(t.toLowerCase())).length;
        implementationCompatibility = Math.min(1.0, 0.4 + (matchCount / query.tags.length) * 0.6);
      }

      // Weighted Composite Score (0.0 to 1.0)
      let finalScore = Math.round(
        (0.35 * problemSimilarity +
          0.25 * rootCauseAlignment +
          0.15 * geographicContext +
          0.15 * verifiedEvidence +
          0.10 * implementationCompatibility) *
          100
      ) / 100;

      // Evidence or geography cannot turn an irrelevant problem into a high match
      if (problemSimilarity < 0.15 && rootCauseAlignment < 0.15) {
        finalScore = Math.min(finalScore, 0.25);
      }

      // Reusability Score (0 to 100)
      const reusabilityScore =
        memory.reusabilityScore ??
        this.calculateReusabilityScore({
          outcomeStatus: memory.outcomeStatus as MemoryOutcomeStatus,
          evidenceLevel: memory.evidenceLevel as EvidenceLevel,
          whatFailed: memory.whatFailed,
          limitations: memory.limitations,
        });

      // Match Factor Breakdown
      const matchBreakdown: MatchFactorBreakdownDto = {
        problemSimilarity,
        rootCauseAlignment,
        geographicContext,
        verifiedEvidence,
        implementationCompatibility,
        finalScore,
      };

      // Explainable Rationale
      const explanation = this.generateExplanation(
        memory.title,
        matchBreakdown,
        memory.outcomeStatus as MemoryOutcomeStatus,
        distKm
      );

      // Extract Historical Warnings
      const historicalWarning = this.extractHistoricalWarning(
        memory.whatFailed,
        memory.limitations,
        memory.futureWarnings,
        memory.outcomeStatus as MemoryOutcomeStatus,
        memory.evidenceLevel as EvidenceLevel
      );

      // Recommended Prerequisites
      const recommendedPrerequisites = this.extractPrerequisites(memory.constraints, memory.technicalApproach);

      // Calculate Historical Applications Stats & Guidance Verdict
      const apps = (memory as any).applications || [];
      const appSuccesses = apps.filter(
        (a: any) =>
          a.outcomeStatus === MemoryOutcomeStatus.EFFECTIVE ||
          a.outcomeStatus === MemoryOutcomeStatus.SUCCESSFUL ||
          a.outcomeStatus === MemoryOutcomeStatus.SUCCESS
      ).length;
      const appFailures = apps.filter(
        (a: any) =>
          a.outcomeStatus === MemoryOutcomeStatus.INEFFECTIVE ||
          a.outcomeStatus === MemoryOutcomeStatus.FAILED
      ).length;
      const appPartials = apps.filter(
        (a: any) =>
          a.outcomeStatus === MemoryOutcomeStatus.PARTIALLY_EFFECTIVE ||
          a.outcomeStatus === MemoryOutcomeStatus.PARTIAL_SUCCESS
      ).length;

      const successCount = Math.max((memory as any).successCount || 0, appSuccesses);
      const failureCount = Math.max((memory as any).failureCount || 0, appFailures);
      const partialCount = Math.max((memory as any).partialCount || 0, appPartials);
      const historicalApplicationsCount = Math.max(
        (memory as any).implementationCount || 1,
        apps.length,
        successCount + failureCount + partialCount
      );

      const { guidanceVerdict, guidanceLabel } = this.determineGuidance(
        memory.outcomeStatus as MemoryOutcomeStatus,
        memory.reusabilityClass as ReusabilityClass,
        { successCount, failureCount, partialCount },
        memory.whatFailed
      );

      const { effectiveForContext, lessEffectiveForContext, failurePattern } =
        this.extractContextualApplicability(memory, failureCount, memory.whatFailed);

      recommendations.push({
        memoryId: memory.id,
        title: memory.title,
        challengeCategory: memory.challengeCategory,
        problemSummary: memory.problemSummary,
        rootCause: memory.rootCause,
        technicalApproach: memory.technicalApproach,
        outcomeStatus: memory.outcomeStatus as MemoryOutcomeStatus,
        evidenceLevel: memory.evidenceLevel as EvidenceLevel,
        reusabilityClass: memory.reusabilityClass as ReusabilityClass,
        reusabilityScore,
        relevanceScore: finalScore,
        matchBreakdown,
        explanation,
        guidanceVerdict,
        guidanceLabel,
        historicalApplicationsCount,
        successCount,
        failureCount,
        partialCount,
        failurePattern,
        effectiveForContext,
        lessEffectiveForContext,
        verifiedImpact: memory.impactSummary || memory.whatWorked || null,
        lessonsLearned: memory.lessonsLearned,
        whatWorked: memory.whatWorked,
        whatFailed: memory.whatFailed,
        knownLimitations: memory.limitations,
        historicalWarning,
        recommendedPrerequisites,
        sourceProjectId: memory.projectId,
        sourceChallengeId: memory.challengeId,
      });
    }

    // Sort by relevance score descending
    recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return recommendations.slice(0, limit);
  }

  /**
   * Computes an objective Reusability Score (0-100) based on verified outcome,
   * evidence rigor, and documented limitations.
   */
  public static calculateReusabilityScore(params: {
    outcomeStatus: MemoryOutcomeStatus;
    evidenceLevel: EvidenceLevel;
    whatFailed?: string | null;
    limitations?: string | null;
  }): number {
    let score = 50;

    // Outcome Status Baseline
    switch (params.outcomeStatus) {
      case MemoryOutcomeStatus.SUCCESS:
      case MemoryOutcomeStatus.SUCCESSFUL:
      case MemoryOutcomeStatus.EFFECTIVE:
        score = 85;
        break;
      case MemoryOutcomeStatus.PARTIAL_SUCCESS:
      case MemoryOutcomeStatus.PARTIALLY_EFFECTIVE:
        score = 65;
        break;
      case MemoryOutcomeStatus.UNDER_EVALUATION:
      case MemoryOutcomeStatus.INCONCLUSIVE:
        score = 50;
        break;
      case MemoryOutcomeStatus.FAILED:
      case MemoryOutcomeStatus.INEFFECTIVE:
        score = 15;
        break;
      case MemoryOutcomeStatus.REQUIRES_REVIEW:
        score = 40;
        break;
      default:
        score = 45;
    }

    // Evidence Quality Adjustment
    switch (params.evidenceLevel) {
      case EvidenceLevel.MULTI_SOURCE_VERIFIED:
      case EvidenceLevel.VERIFIED:
        score += 10;
        break;
      case EvidenceLevel.OFFICIAL:
        score += 5;
        break;
      case EvidenceLevel.ESTIMATED:
      case EvidenceLevel.AI_ASSISTED:
        score -= 8;
        break;
      case EvidenceLevel.UNKNOWN:
        score -= 15;
        break;
      default:
        break;
    }

    // Limitations / Failure penalty
    if (params.whatFailed && params.whatFailed.trim().length > 20) {
      score -= 5;
    }
    if (params.limitations && params.limitations.trim().length > 30) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Maps numerical Reusability Score to ReusabilityClass
   */
  public static mapScoreToReusabilityClass(score: number, outcomeStatus?: MemoryOutcomeStatus): ReusabilityClass {
    if (
      outcomeStatus === MemoryOutcomeStatus.FAILED ||
      outcomeStatus === MemoryOutcomeStatus.INEFFECTIVE
    ) {
      return ReusabilityClass.NOT_RECOMMENDED;
    }
    if (score >= 80) return ReusabilityClass.HIGHLY_REUSABLE;
    if (score >= 60) return ReusabilityClass.CONDITIONALLY_REUSABLE;
    if (score >= 40) return ReusabilityClass.REQUIRES_ADAPTATION;
    return ReusabilityClass.NOT_RECOMMENDED;
  }

  /**
   * Determines explainable institutional guidance based on outcome status,
   * historical applications, and failure evidence.
   */
  public static determineGuidance(
    outcomeStatus: MemoryOutcomeStatus,
    reusabilityClass: ReusabilityClass,
    history: { successCount: number; failureCount: number; partialCount: number },
    whatFailed?: string | null
  ): { guidanceVerdict: 'RECOMMEND' | 'WARN' | 'CAUTION' | 'NO_MEMORY'; guidanceLabel: string } {
    // If it has both successes and failures in historical applications, it is mixed evidence
    if (history.successCount > 0 && history.failureCount > 0) {
      return {
        guidanceVerdict: 'CAUTION',
        guidanceLabel: 'Mixed Results — Use With Caution',
      };
    }

    if (
      outcomeStatus === MemoryOutcomeStatus.INEFFECTIVE ||
      outcomeStatus === MemoryOutcomeStatus.FAILED ||
      reusabilityClass === ReusabilityClass.NOT_RECOMMENDED
    ) {
      return {
        guidanceVerdict: 'WARN',
        guidanceLabel: 'Failed Before — Warn',
      };
    }

    if (
      outcomeStatus === MemoryOutcomeStatus.PARTIALLY_EFFECTIVE ||
      outcomeStatus === MemoryOutcomeStatus.PARTIAL_SUCCESS ||
      outcomeStatus === MemoryOutcomeStatus.REQUIRES_REVIEW ||
      reusabilityClass === ReusabilityClass.REQUIRES_ADAPTATION
    ) {
      return {
        guidanceVerdict: 'CAUTION',
        guidanceLabel: 'Mixed Results — Use With Caution',
      };
    }

    if (
      outcomeStatus === MemoryOutcomeStatus.EFFECTIVE ||
      outcomeStatus === MemoryOutcomeStatus.SUCCESSFUL ||
      outcomeStatus === MemoryOutcomeStatus.SUCCESS
    ) {
      return {
        guidanceVerdict: 'RECOMMEND',
        guidanceLabel: 'Worked Before — Recommend',
      };
    }

    return {
      guidanceVerdict: 'CAUTION',
      guidanceLabel: 'Limited Evidence — Use With Caution',
    };
  }

  /**
   * Extracts contextual applicability factors distinguishing conditions where
   * the intervention thrives versus where it is less effective or prone to failure.
   */
  public static extractContextualApplicability(
    memory: any,
    failureCount: number,
    whatFailed?: string | null
  ): {
    effectiveForContext: string[];
    lessEffectiveForContext: string[];
    failurePattern: string | null;
  } {
    const effective: string[] = [];
    const lessEffective: string[] = [];

    const category = (memory.challengeCategory || '').toUpperCase();
    const problemType = (memory.problemType || '').toUpperCase();
    const location = memory.locationContext || {};
    const constraints = memory.constraints || '';

    if (category.includes('WATER') || problemType.includes('WATER')) {
      effective.push('Rural & semi-urban village recharge zones', 'High to moderate seasonal rainfall basins');
      lessEffective.push('Centralized metropolitan deep-piped networks', 'Arid low-recharge hard-rock formations');
    } else if (category.includes('ROAD') || category.includes('INFRASTRUCTURE')) {
      effective.push('High-traffic arterial corridors with dedicated sub-base drainage', 'Porous aggregate pavements');
      lessEffective.push('Inundated clay soil beds without perimeter stormwater diversion');
    } else if (category.includes('HEALTH') || category.includes('SANITATION')) {
      effective.push('Decentralized primary health centers', 'Community-operated filtration units');
      lessEffective.push('Unmonitored public points without scheduled technician service');
    } else {
      effective.push('Localized community deployment with trained caretaker support');
      lessEffective.push('Unmonitored environments lacking maintenance capacity');
    }

    if (constraints.toLowerCase().includes('maintenance')) {
      lessEffective.push('Low-maintenance operating environments');
    }

    let failurePattern: string | null = null;
    if (failureCount > 0 || whatFailed) {
      failurePattern = whatFailed
        ? `Documented precedent failure associated with: ${whatFailed.trim()}`
        : 'Intervention experienced performance degradation in environments with insufficient operational capacity.';
    }

    return {
      effectiveForContext: Array.from(new Set(effective)),
      lessEffectiveForContext: Array.from(new Set(lessEffective)),
      failurePattern,
    };
  }

  /**
   * Generates a clear, transparent explanation for a match
   */
  private static generateExplanation(
    title: string,
    breakdown: MatchFactorBreakdownDto,
    outcomeStatus: MemoryOutcomeStatus,
    distKm?: number | null
  ): string {
    const parts: string[] = [];

    if (breakdown.problemSimilarity > 0.6) {
      parts.push(`high problem formulation similarity (${Math.round(breakdown.problemSimilarity * 100)}%)`);
    } else if (breakdown.problemSimilarity > 0.3) {
      parts.push(`moderate topic overlap (${Math.round(breakdown.problemSimilarity * 100)}%)`);
    }

    if (breakdown.rootCauseAlignment > 0.5) {
      parts.push('strongly aligned root-cause dynamics');
    }

    if (distKm !== null) {
      parts.push(`deployed within ${distKm} km geographic radius`);
    } else if (breakdown.geographicContext > 0.7) {
      parts.push('matching regional/district jurisdiction');
    }

    if (breakdown.verifiedEvidence > 0.8) {
      parts.push('rigorously verified field outcome data');
    }

    const summaryStr = parts.length > 0 ? parts.join(', ') : 'general thematic alignment';
    return `Recommended based on ${summaryStr}. Historical outcome was marked as ${outcomeStatus}.`;
  }

  /**
   * Extracts historical failure modes and actionable warnings with strict classification:
   * [DOCUMENTED FAILURE], [ACTIONABLE WARNING], [OPERATIONAL CONSTRAINT], or [INSUFFICIENT EVIDENCE].
   */
  public static extractHistoricalWarning(
    whatFailed?: string | null,
    limitations?: string | null,
    futureWarnings?: string | null,
    outcomeStatus?: MemoryOutcomeStatus,
    evidenceLevel?: EvidenceLevel
  ): string | null {
    if (futureWarnings && futureWarnings.trim().length > 5) {
      return futureWarnings.trim();
    }
    if (whatFailed && whatFailed.trim().length > 5) {
      return `[DOCUMENTED FAILURE]: ${whatFailed.trim()}`;
    }
    if (limitations && limitations.trim().length > 5) {
      return `[OPERATIONAL CONSTRAINT]: ${limitations.trim()}`;
    }
    if (outcomeStatus === MemoryOutcomeStatus.INSUFFICIENT_EVIDENCE || evidenceLevel === EvidenceLevel.UNKNOWN) {
      return `[INSUFFICIENT EVIDENCE]: Field effectiveness data is unverified or under evaluation.`;
    }
    return null;
  }

  /**
   * Extracts technical prerequisites from constraints or approach
   */
  private static extractPrerequisites(constraints?: string | null, technicalApproach?: string): string[] {
    const list: string[] = [];
    if (constraints) {
      const items = constraints
        .split(/[,;\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 4);
      list.push(...items);
    }
    if (technicalApproach && list.length === 0) {
      if (technicalApproach.toLowerCase().includes('iot') || technicalApproach.toLowerCase().includes('sensor')) {
        list.push('Continuous telemetry and battery/solar power availability required');
      }
      if (technicalApproach.toLowerCase().includes('water') || technicalApproach.toLowerCase().includes('filtration')) {
        list.push('Regular chemical reagent and filter replacement scheduled maintenance');
      }
    }
    return list.slice(0, 4);
  }

  /**
   * Compares 2 to 3 solutions side-by-side across key dimensions
   */
  public static async compareSolutions(
    solutionIds: string[],
    userRole?: UserRole
  ): Promise<SolutionComparisonDto> {
    const isPublic = userRole === UserRole.CITIZEN || userRole === UserRole.COMMUNITY_GROUP || userRole === UserRole.STUDENT || !userRole;
    const memories = await prisma.solutionMemory.findMany({
      where: {
        id: { in: solutionIds },
        ...(isPublic ? { status: SolutionMemoryStatus.PUBLISHED } : {}),
      },
      include: {
        project: {
          select: { id: true, title: true },
        },
      },
    });

    const solutions = memories.map(m => ({
      id: m.id,
      title: m.title,
      category: m.challengeCategory,
      problemType: m.problemType,
      problemSummary: m.problemSummary,
      rootCause: m.rootCause,
      technicalApproach: m.technicalApproach,
      outcomeStatus: m.outcomeStatus as MemoryOutcomeStatus,
      evidenceLevel: m.evidenceLevel as EvidenceLevel,
      reusabilityClass: m.reusabilityClass as ReusabilityClass,
      whatWorked: m.whatWorked,
      whatFailed: m.whatFailed,
      limitations: m.limitations,
      futureWarnings: m.futureWarnings,
      beneficiaries: null,
      sourceProjectTitle: m.project?.title ?? null,
    }));

    const problemAndRootCause: Record<string, string> = {};
    const technologyAndApproach: Record<string, string> = {};
    const outcomesAndImpact: Record<string, string> = {};
    const limitationsAndFailureModes: Record<string, string> = {};
    const reusabilityAndAdoption: Record<string, string> = {};

    for (const sol of solutions) {
      problemAndRootCause[sol.id] = `Problem: ${sol.problemSummary} | Root Cause: ${sol.rootCause}`;
      technologyAndApproach[sol.id] = sol.technicalApproach;
      outcomesAndImpact[sol.id] = `Outcome: ${sol.outcomeStatus} | Evidence: ${sol.evidenceLevel} | What Worked: ${sol.whatWorked || 'Not recorded'}`;
      limitationsAndFailureModes[sol.id] = `What Failed: ${sol.whatFailed || 'None documented'} | Warnings: ${sol.futureWarnings || sol.limitations || 'None'}`;
      reusabilityAndAdoption[sol.id] = `Reusability: ${sol.reusabilityClass}`;
    }

    return {
      solutions,
      comparisonDimensions: {
        problemAndRootCause,
        technologyAndApproach,
        outcomesAndImpact,
        limitationsAndFailureModes,
        reusabilityAndAdoption,
      },
    };
  }
}
