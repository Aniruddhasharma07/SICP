import { prisma } from '../../database/prisma';
import {
  RelationshipType,
  RelationshipStatus,
  ChallengeStatus,
  UserRole,
  RelationshipFactorBreakdown,
  ContextAwareDuplicateCheckResultDto,
  TopicInsightItemDto,
  LocationQuality,
} from '@sicp/shared';
import { SpatialPolicyEngine } from './spatial-policy.engine';
import { RelationshipScoringEngine } from './relationship-scoring.engine';
import { ProblemConsolidationService } from './problem-consolidation.service';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { AiServiceClient } from './ai-service.client';

export interface ClusterCandidate {
  challengeId: string;
  title: string;
  category: string;
  district?: string | null;
  state?: string | null;
  distanceKm?: number | null;
  distanceMeters?: number | null;
  semanticSimilarity: number;
  overallScore: number;
  recommendedRelation: RelationshipType;
  relationshipClassification: 'DUPLICATE' | 'RELATED' | 'SYSTEMIC_CANDIDATE' | 'UNRELATED';
  reasoning: string;
  factorBreakdown?: RelationshipFactorBreakdown;
  sharedInfrastructure?: string | null;
  recommendedAction?: string;
  requiresHumanReview?: boolean;
}

export class DuplicateClusteringService {
  /**
   * Haversine distance in kilometers between two geo points (backwards compatible)
   */
  public static calculateDistanceKm(
    lat1?: number | null,
    lon1?: number | null,
    lat2?: number | null,
    lon2?: number | null
  ): number | null {
    const meters = SpatialPolicyEngine.calculateDistanceMeters(lat1, lon1, lat2, lon2);
    if (meters === null) return null;
    return Math.round((meters / 1000) * 100) / 100;
  }

  /**
   * Jaccard text similarity on word tokens (backwards compatible)
   */
  public static calculateTokenSimilarity(text1: string, text2: string): number {
    const tokenize = (str: string) =>
      new Set(
        str
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(t => t.length > 2)
      );

    const setA = tokenize(text1);
    const setB = tokenize(text2);

    if (setA.size === 0 || setB.size === 0) return 0.0;

    let intersectionCount = 0;
    for (const token of setA) {
      if (setB.has(token)) intersectionCount++;
    }

    const unionCount = new Set([...setA, ...setB]).size;
    return Math.round((intersectionCount / unionCount) * 100) / 100;
  }

  /**
   * Evaluates relationship between two challenges using the 7-factor scoring engine
   */
  public static evaluateRelationship(
    subject: {
      id?: string;
      title: string;
      description: string;
      category: string;
      district?: string | null;
      state?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      severity?: string | null;
      createdAt?: Date | string | null;
      rootCause?: string | null;
      durationMonths?: number | null;
      evidenceCount?: number;
    },
    target: {
      id: string;
      title: string;
      description: string;
      category: string;
      district?: string | null;
      state?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      severity?: string | null;
      createdAt?: Date | string | null;
      rootCause?: string | null;
      durationMonths?: number | null;
      evidenceCount?: number;
    }
  ): ClusterCandidate {
    const scoringResult = RelationshipScoringEngine.evaluate(
      {
        id: subject.id || 'subject',
        title: subject.title,
        description: subject.description,
        category: subject.category,
        severity: subject.severity,
        latitude: subject.latitude,
        longitude: subject.longitude,
        district: subject.district,
        state: subject.state,
        createdAt: subject.createdAt,
        rootCause: subject.rootCause,
        durationMonths: subject.durationMonths,
        evidenceCount: subject.evidenceCount,
      },
      {
        id: target.id,
        title: target.title,
        description: target.description,
        category: target.category,
        severity: target.severity,
        latitude: target.latitude,
        longitude: target.longitude,
        district: target.district,
        state: target.state,
        createdAt: target.createdAt,
        rootCause: target.rootCause,
        durationMonths: target.durationMonths,
        evidenceCount: target.evidenceCount,
      }
    );

    const distanceKm = scoringResult.distanceMeters !== null
      ? Math.round((scoringResult.distanceMeters / 1000) * 100) / 100
      : null;

    const isSameCategory = subject.category.toLowerCase() === target.category.toLowerCase();
    const isSameState = !!subject.state && !!target.state && subject.state.toLowerCase() === target.state.toLowerCase();
    const isSameDistrict = isSameState && !!subject.district && !!target.district && subject.district.toLowerCase() === target.district.toLowerCase();
    const semanticSimilarity = Math.round(scoringResult.factorBreakdown.problemSimilarity) / 100;

    // Rule 1: Different states are NEVER merged locally
    if (subject.state && target.state && !isSameState) {
      return {
        challengeId: target.id,
        title: target.title,
        category: target.category,
        district: target.district,
        state: target.state,
        distanceKm,
        distanceMeters: scoringResult.distanceMeters,
        semanticSimilarity,
        overallScore: Math.min(scoringResult.confidenceScore * 0.25, 0.25),
        recommendedRelation: RelationshipType.SAME_ROOT_CAUSE,
        relationshipClassification: 'RELATED',
        reasoning: 'Different states. Maintained as independent reports; potential high-level policy correlation only.',
        factorBreakdown: scoringResult.factorBreakdown,
        sharedInfrastructure: scoringResult.sharedInfrastructure,
        recommendedAction: 'KEEP_SEPARATE',
        requiresHumanReview: false,
      };
    }

    // Rule 2: Immediate geographic proximity (< 0.5km) with same category or semantic overlap = DUPLICATE (unless divergent root cause)
    const divergentRootCause = scoringResult.factorBreakdown.rootCauseSimilarity < 25;
    if (!divergentRootCause && distanceKm !== null && distanceKm <= 0.5 && (isSameCategory || semanticSimilarity >= 0.25)) {
      const duplicateScore = Math.round((0.85 + semanticSimilarity * 0.15) * 100) / 100;
      return {
        challengeId: target.id,
        title: target.title,
        category: target.category,
        district: target.district,
        state: target.state,
        distanceKm,
        distanceMeters: scoringResult.distanceMeters,
        semanticSimilarity,
        overallScore: duplicateScore,
        recommendedRelation: RelationshipType.DUPLICATE,
        relationshipClassification: 'DUPLICATE',
        reasoning: `Immediate geographic proximity (${distanceKm} km) with high thematic overlap. Strong duplicate candidate.`,
        factorBreakdown: scoringResult.factorBreakdown,
        sharedInfrastructure: scoringResult.sharedInfrastructure,
        recommendedAction: 'MERGE_CANDIDATE',
        requiresHumanReview: duplicateScore < 0.90,
      };
    }

    // Rule 3: Same neighborhood / ward / district (0.5 - 5km) in same district = SYSTEMIC_CHILD
    const spatialPolicy = SpatialPolicyEngine.getPolicy(subject.category);
    const allowSystemic = spatialPolicy.allowCrossDistrictSystemic || spatialPolicy.defaultRelationshipSuggestion === 'SYSTEMIC_ROOT_CAUSE';
    if (!divergentRootCause && allowSystemic && isSameDistrict && isSameCategory && distanceKm !== null && distanceKm > 0.5 && distanceKm <= 5.0) {
      const systemicScore = Math.round((0.65 + semanticSimilarity * 0.25) * 100) / 100;
      return {
        challengeId: target.id,
        title: target.title,
        category: target.category,
        district: target.district,
        state: target.state,
        distanceKm,
        distanceMeters: scoringResult.distanceMeters,
        semanticSimilarity,
        overallScore: systemicScore,
        recommendedRelation: RelationshipType.SYSTEMIC_CHILD,
        relationshipClassification: 'SYSTEMIC_CANDIDATE',
        reasoning: `Shared municipal district (${target.district}) and shared category (${target.category}). Candidate for systemic regional grouping.`,
        factorBreakdown: scoringResult.factorBreakdown,
        sharedInfrastructure: scoringResult.sharedInfrastructure,
        recommendedAction: 'LINK_SYSTEMIC',
        requiresHumanReview: true,
      };
    }

    let relationshipClassification: 'DUPLICATE' | 'RELATED' | 'SYSTEMIC_CANDIDATE' | 'UNRELATED';
    switch (scoringResult.relationType) {
      case RelationshipType.DUPLICATE:
        relationshipClassification = 'DUPLICATE';
        break;
      case RelationshipType.SYSTEMIC_ROOT_CAUSE:
      case RelationshipType.SYSTEMIC_CHILD:
      case RelationshipType.DEPENDENCY:
        relationshipClassification = 'SYSTEMIC_CANDIDATE';
        break;
      case RelationshipType.RELATED:
      case RelationshipType.RECURRING:
      case RelationshipType.SAME_ROOT_CAUSE:
        relationshipClassification = 'RELATED';
        break;
      case RelationshipType.INDEPENDENT:
      default:
        relationshipClassification = 'UNRELATED';
        break;
    }

    if (scoringResult.confidenceScore < 0.20) {
      relationshipClassification = 'UNRELATED';
    }

    return {
      challengeId: target.id,
      title: target.title,
      category: target.category,
      district: target.district,
      state: target.state,
      distanceKm,
      distanceMeters: scoringResult.distanceMeters,
      semanticSimilarity,
      overallScore: scoringResult.confidenceScore,
      recommendedRelation: scoringResult.relationType,
      relationshipClassification,
      reasoning: scoringResult.reasoning,
      factorBreakdown: scoringResult.factorBreakdown,
      sharedInfrastructure: scoringResult.sharedInfrastructure,
      recommendedAction: scoringResult.recommendedAction,
      requiresHumanReview: scoringResult.requiresHumanReview,
    };
  }

  /**
   * Find candidate related, duplicate, or systemic challenges from existing database records
   * Uses bounded candidate pre-filtering to prevent O(N^2) overhead
   */
  public static async findCandidates(
    challengeId: string,
    limit: number = 10
  ): Promise<ClusterCandidate[]> {
    const subject = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        aiAnalysis: true,
        evidence: true,
      },
    });

    if (!subject) {
      throw new NotFoundError('Challenge', challengeId);
    }

    // Build bounded pre-filter conditions
    const whereConditions: any = {
      id: { not: challengeId },
      status: {
        in: [
          ChallengeStatus.DRAFT,
          ChallengeStatus.SUBMITTED,
          ChallengeStatus.UNDER_GOV_REVIEW,
          ChallengeStatus.APPROVED,
          ChallengeStatus.IN_RESEARCH,
        ],
      },
      deletedAt: null,
    };

    // Geospatial bounding box filter (+- 0.2 deg ~ 22km) or category filter
    const orConditions: any[] = [{ category: { equals: subject.category, mode: 'insensitive' } }];

    if (subject.latitude != null && subject.longitude != null) {
      const delta = 0.2;
      orConditions.push({
        latitude: { gte: subject.latitude - delta, lte: subject.latitude + delta },
        longitude: { gte: subject.longitude - delta, lte: subject.longitude + delta },
      });
    }

    if (subject.district) {
      orConditions.push({
        district: { equals: subject.district, mode: 'insensitive' },
      });
    }

    whereConditions.OR = orConditions;

    // Fetch up to 25 bounded candidates
    const candidates = await prisma.challenge.findMany({
      where: whereConditions,
      include: {
        aiAnalysis: true,
        evidence: true,
      },
      take: 25,
      orderBy: { createdAt: 'desc' },
    });

    const evaluated = candidates.map(target =>
      this.evaluateRelationship(
        {
          id: subject.id,
          title: subject.title,
          description: subject.description,
          category: subject.category,
          severity: subject.severity,
          latitude: subject.latitude,
          longitude: subject.longitude,
          district: subject.district,
          state: subject.state,
          createdAt: subject.createdAt,
          rootCause: ((subject.aiAnalysis?.rawResponse as any)?.rootCauseHypothesis as string) || subject.aiAnalysis?.reasoningSummary || null,
          durationMonths: subject.durationMonths,
          evidenceCount: subject.evidence.length,
        },
        {
          id: target.id,
          title: target.title,
          description: target.description,
          category: target.category,
          severity: target.severity,
          latitude: target.latitude,
          longitude: target.longitude,
          district: target.district,
          state: target.state,
          createdAt: target.createdAt,
          rootCause: ((target.aiAnalysis?.rawResponse as any)?.rootCauseHypothesis as string) || target.aiAnalysis?.reasoningSummary || null,
          durationMonths: target.durationMonths,
          evidenceCount: target.evidence.length,
        }
      )
    );

    // Filter candidates with meaningful relationship and sort descending
    const topCandidates = evaluated
      .filter(c => c.overallScore >= 0.25 || c.recommendedRelation !== RelationshipType.INDEPENDENT)
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit);

    // If there are strong candidates, enrich top candidate with deep AI relationship reasoning
    if (topCandidates.length > 0 && topCandidates[0].overallScore >= 0.50) {
      try {
        const top = topCandidates[0];
        const targetChallenge = candidates.find(c => c.id === top.challengeId);
        if (targetChallenge) {
          const aiAnalysis = await AiServiceClient.analyzeRelationship(
            {
              id: subject.id,
              title: subject.title,
              description: subject.description,
              category: subject.category,
              district: subject.district,
              state: subject.state,
              latitude: subject.latitude,
              longitude: subject.longitude,
            },
            {
              id: targetChallenge.id,
              title: targetChallenge.title,
              description: targetChallenge.description,
              category: targetChallenge.category,
              district: targetChallenge.district,
              state: targetChallenge.state,
              latitude: targetChallenge.latitude,
              longitude: targetChallenge.longitude,
            }
          );
          if (aiAnalysis && aiAnalysis.explanation) {
            top.reasoning = `${top.reasoning} [AI Assessment: ${aiAnalysis.explanation}]`;
            if (aiAnalysis.sharedInfrastructure) {
              top.sharedInfrastructure = aiAnalysis.sharedInfrastructure;
            }
            if (aiAnalysis.recommendedAction) {
              top.recommendedAction = aiAnalysis.recommendedAction;
            }
          }
        }
      } catch {
        // Fallback to deterministic scoring silently
      }
    }

    return topCandidates;
  }

  /**
   * Evaluates duplicates and relationships using Location as an Intelligence Gate.
   * If location is not provided: returns NO duplicate candidates, provides problem understanding and general reference topics.
   * If location is provided: evaluates candidates along the 6-level geographic relationship hierarchy.
   */
  public static async checkContextAwareDuplicates(data: {
    title: string;
    description: string;
    category: string;
    district?: string | null;
    state?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    village?: string | null;
    ward?: string | null;
    address?: string | null;
  }): Promise<ContextAwareDuplicateCheckResultDto> {
    const hasCoordinates = data.latitude != null && data.longitude != null;
    const hasDistrict = Boolean(data.district && data.district.trim().length > 0);
    const hasState = Boolean(data.state && data.state.trim().length > 0);
    const hasVillageOrWard = Boolean(
      (data.village && data.village.trim().length > 0) ||
      (data.ward && data.ward.trim().length > 0) ||
      (data.address && data.address.trim().length > 0)
    );

    let locationQuality: LocationQuality = 'NONE';
    if (hasCoordinates) {
      const latStr = (data.latitude ?? '').toString();
      const lonStr = (data.longitude ?? '').toString();
      const latDec = (latStr.split('.')[1] || '').length;
      const lonDec = (lonStr.split('.')[1] || '').length;
      locationQuality = (latDec >= 3 && lonDec >= 3) || hasVillageOrWard ? 'PRECISE_COORDINATES' : 'COORDINATES';
    } else if (hasDistrict || hasVillageOrWard || hasState) {
      locationQuality = 'ADMIN_ONLY';
    } else {
      locationQuality = 'NONE';
    }

    const locationProvided = locationQuality !== 'NONE';

    // Extract problem understanding (category, keywords, possible root causes)
    const causalKeywords = [
      'broken', 'damaged', 'burst', 'clogged', 'leak', 'overflow', 'faulty',
      'choked', 'contaminated', 'shortage', 'low pressure', 'dumping', 'pothole',
      'collapsed', 'unpaved', 'failed', 'blackout', 'dry', 'flooding', 'waste'
    ];
    const fullText = `${data.title} ${data.description}`.toLowerCase();
    const foundCauses = causalKeywords.filter(k => fullText.includes(k));
    const possibleCauses = foundCauses.length > 0
      ? foundCauses.map(c => c.charAt(0).toUpperCase() + c.slice(1))
      : ['Infrastructure maintenance deficit or service interruption'];

    const tokens = RelationshipScoringEngine.extractTokens(`${data.title} ${data.description}`);
    const topicKeywords = Array.from(tokens.unigrams).slice(0, 5);

    // GATE 1: Location not provided (locationQuality === NONE) -> ZERO duplicate warnings!
    if (locationQuality === 'NONE') {
      // Provide general topic insights only for reference
      let referenceTopics: any[] = [];
      try {
        referenceTopics = await prisma.challenge.findMany({
          where: {
            category: { equals: data.category.trim(), mode: 'insensitive' },
            status: {
              in: [ChallengeStatus.SUBMITTED, ChallengeStatus.UNDER_GOV_REVIEW, ChallengeStatus.APPROVED],
            },
            deletedAt: null,
          },
          take: 3,
          select: {
            id: true,
            title: true,
            category: true,
            district: true,
            state: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch {
        referenceTopics = [];
      }

      return {
        locationProvided: false,
        locationQuality: 'NONE',
        locationSummary: {
          quality: 'NONE',
          hasCoordinates: false,
          hasDistrict: false,
          hasState: false,
          district: null,
          state: null,
          village: null,
          ward: null,
          address: null,
        },
        problemUnderstanding: {
          category: data.category,
          possibleCauses,
          topicKeywords,
        },
        topicInsights: {
          notice: 'Add a location to check for nearby or duplicate reports.',
          relatedTopicChallenges: (Array.isArray(referenceTopics) ? referenceTopics : []).map(r => ({
            challengeId: r.id,
            title: r.title,
            category: r.category,
            district: r.district,
            state: r.state,
          })),
        },
        localIntelligence: {
          duplicates: [],
          related: [],
          systemicCandidates: [],
          unrelatedCount: 0,
        },
        candidates: [],
      };
    }

    // GATE 2: Location provided -> perform bounded geospatial and relationship evaluation
    const whereConditions: any = {
      status: {
        in: [
          ChallengeStatus.SUBMITTED,
          ChallengeStatus.UNDER_GOV_REVIEW,
          ChallengeStatus.APPROVED,
          ChallengeStatus.IN_RESEARCH,
        ],
      },
      deletedAt: null,
    };

    const orConditions: any[] = [];
    if (hasCoordinates && data.latitude != null && data.longitude != null) {
      const delta = 0.2; // ~22km
      orConditions.push({
        latitude: { gte: data.latitude - delta, lte: data.latitude + delta },
        longitude: { gte: data.longitude - delta, lte: data.longitude + delta },
      });
    }
    if (hasDistrict && data.district) {
      orConditions.push({
        district: { equals: data.district.trim(), mode: 'insensitive' },
      });
    }
    if (hasState && data.state) {
      orConditions.push({
        state: { equals: data.state.trim(), mode: 'insensitive' },
        category: { equals: data.category.trim(), mode: 'insensitive' },
      });
    } else {
      orConditions.push({
        category: { equals: data.category.trim(), mode: 'insensitive' },
      });
    }

    whereConditions.OR = orConditions;

    let existingChallenges: any[] = [];
    try {
      existingChallenges = await prisma.challenge.findMany({
        where: whereConditions,
        include: {
          aiAnalysis: true,
          evidence: true,
        },
        take: 40,
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      existingChallenges = [];
    }

    const evaluated = existingChallenges.map(item =>
      this.evaluateRelationship(
        {
          title: data.title,
          description: data.description,
          category: data.category,
          district: data.district,
          state: data.state,
          latitude: data.latitude,
          longitude: data.longitude,
        },
        {
          id: item.id,
          title: item.title,
          description: item.description,
          category: item.category,
          district: item.district,
          state: item.state,
          latitude: item.latitude,
          longitude: item.longitude,
          severity: item.severity,
          createdAt: item.createdAt,
          rootCause: ((item.aiAnalysis?.rawResponse as any)?.rootCauseHypothesis as string) || item.aiAnalysis?.reasoningSummary || null,
          durationMonths: item.durationMonths,
          evidenceCount: item.evidence.length,
        }
      )
    );

    const duplicates = evaluated
      .filter(c => c.relationshipClassification === 'DUPLICATE')
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 5);

    const related = evaluated
      .filter(c => c.relationshipClassification === 'RELATED')
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 5);

    const systemicCandidates = evaluated
      .filter(c => c.relationshipClassification === 'SYSTEMIC_CANDIDATE')
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 5);

    const unrelatedCount = evaluated.filter(c => c.relationshipClassification === 'UNRELATED').length;

    const candidates = [...duplicates, ...systemicCandidates, ...related].slice(0, 5);

    return {
      locationProvided: true,
      locationQuality,
      locationSummary: {
        quality: locationQuality,
        hasCoordinates,
        hasDistrict,
        hasState,
        district: data.district || null,
        state: data.state || null,
        village: data.village || null,
        ward: data.ward || null,
        address: data.address || null,
      },
      problemUnderstanding: {
        category: data.category,
        possibleCauses,
        topicKeywords,
      },
      localIntelligence: {
        duplicates,
        related,
        systemicCandidates,
        unrelatedCount,
      },
      candidates,
    };
  }

  /**
   * Find specifically DUPLICATE candidates for inline creation pre-warning
   */
  public static async findDuplicateCandidates(
    challengeId: string,
    limit: number = 5
  ): Promise<ClusterCandidate[]> {
    const candidates = await this.findCandidates(challengeId, limit * 2);
    return candidates
      .filter(c => c.recommendedRelation === RelationshipType.DUPLICATE || c.overallScore >= 0.70)
      .slice(0, limit);
  }

  /**
   * Find specifically SYSTEMIC ROOT CAUSE candidates
   */
  public static async findSystemicCandidates(
    challengeId: string,
    limit: number = 5
  ): Promise<ClusterCandidate[]> {
    const candidates = await this.findCandidates(challengeId, limit * 2);
    return candidates
      .filter(
        c =>
          c.recommendedRelation === RelationshipType.SYSTEMIC_ROOT_CAUSE ||
          c.recommendedRelation === RelationshipType.SYSTEMIC_CHILD ||
          c.recommendedRelation === RelationshipType.SAME_ROOT_CAUSE
      )
      .slice(0, limit);
  }

  /**
   * Atomic Systemic Merge Execution (delegates to ProblemConsolidationService)
   */
  public static async executeSystemicMerge(params: {
    sourceChallengeIds: string[];
    systemicTitle: string;
    systemicDescription: string;
    category: string;
    district: string;
    state: string;
    actorId: string;
    actorRole: UserRole;
    reason: string;
    requestId: string;
    ipAddress?: string;
  }) {
    if (params.sourceChallengeIds.length < 2) {
      throw new ValidationError('A systemic challenge grouping requires at least 2 source incident reports.');
    }

    const mergeResult = await ProblemConsolidationService.executeMerge({
      sourceChallengeIds: params.sourceChallengeIds,
      systemicTitle: params.systemicTitle,
      systemicDescription: params.systemicDescription,
      category: params.category,
      district: params.district,
      state: params.state,
      actorId: params.actorId,
      actorRole: params.actorRole,
      reason: params.reason,
      requestId: params.requestId,
      ipAddress: params.ipAddress,
    });

    const systemic = await prisma.challenge.findUnique({
      where: { id: mergeResult.canonicalChallengeId },
    });

    return systemic;
  }
}
