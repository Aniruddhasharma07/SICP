import { prisma } from '../../database/prisma';
import { logger } from '../../utils/logger';
import {
  AIAnalysisStatus,
  RelationshipType,
  RelationshipStatus,
  AuditAction,
  LocationQuality,
  ImpactAssessmentDto,
  EvidenceAssessmentDto,
  FieldConfidenceBreakdownDto,
  RootCauseHypothesisItemDto,
  ContributingFactorDto,
  ProblemObservationDto,
  PrimaryProblemDto,
  SeverityRecommendationDto,
} from '@sicp/shared';
import { AiServiceClient, AiAnalysisResponse } from './ai-service.client';
import { DuplicateClusteringService } from './duplicate-clustering.service';
import { AuditService } from '../../modules/audit/audit.service';

export class ChallengeIntelligenceOrchestrator {
  /**
   * Orchestrates the complete post-submission AI intelligence pipeline:
   * 1. Structured AI problem categorization & field-level confidence breakdown
   * 2. Multimodal evidence and location quality gating
   * 3. Multi-signal candidate duplicate & systemic relationship scoring
   * 4. Idempotent candidate relationship persistence (RECOMMENDED status)
   * 5. Candidate systemic root-cause cluster formation (PENDING_REVIEW status)
   * 6. Immutable audit logging for transparent governance
   */
  public static async processChallengeIntelligence(challengeId: string, requestId: string): Promise<void> {
    logger.info(`Starting Challenge Intelligence Orchestration for challenge ${challengeId}`, { requestId });

    // 1. Fetch challenge with evidence and submitter info
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        evidence: true,
        submitter: { select: { id: true, fullName: true, role: true } },
      },
    });

    if (!challenge) {
      logger.error(`Challenge ${challengeId} not found for intelligence orchestration`, { requestId });
      return;
    }

    // 2. Mark AIAnalysis as PROCESSING
    await prisma.aIAnalysis.upsert({
      where: { challengeId },
      create: {
        challengeId,
        status: AIAnalysisStatus.PROCESSING as unknown as import('@prisma/client').$Enums.AIAnalysisStatus,
      },
      update: {
        status: AIAnalysisStatus.PROCESSING as unknown as import('@prisma/client').$Enums.AIAnalysisStatus,
      },
    });

    // 3. Call AI Service (or fallback)
    let analysisResult: AiAnalysisResponse;
    let isFallback = false;

    try {
      analysisResult = await AiServiceClient.analyzeChallenge(
        {
          title: challenge.title,
          description: challenge.description,
          category: challenge.category,
          district: challenge.district,
          state: challenge.state,
          affectedPopulation: challenge.affectedPopulation,
          durationMonths: challenge.durationMonths,
        },
        requestId
      );
    } catch (err: unknown) {
      logger.warn(
        `AI Service unavailable for challenge ${challengeId}, generating deterministic civic intelligence fallback: ${(err as Error).message}`,
        { requestId }
      );
      isFallback = true;
      analysisResult = this.generateCivicIntelligenceFallback(challenge);
    }

    // 4. Extract structured domain output with strict types
    const primaryProblem: PrimaryProblemDto = analysisResult.primaryProblem || {
      domain: challenge.category,
      category: challenge.category,
      problemType: analysisResult.problemType || challenge.category,
      normalizedStatement: challenge.title,
      confidence: analysisResult.confidenceScore || 0.85,
    };

    // Step 3 Domain Invariant: Distinguish Primary Problem vs Observation vs Contributing Factor vs Impact Method
    // NEVER classify ROAD_USAGE as the primary problem category.
    // NEVER allow "Sanitation & Drainage" to replace a road-infrastructure problem merely because drainage is mentioned.
    const combinedChallengeText = `${challenge.title} ${challenge.description}`.toLowerCase();
    const isRoadDefect =
      combinedChallengeText.includes('road') ||
      combinedChallengeText.includes('pothole') ||
      combinedChallengeText.includes('asphalt') ||
      combinedChallengeText.includes('carriageway') ||
      combinedChallengeText.includes('highway') ||
      challenge.category.toLowerCase().includes('road') ||
      challenge.category.toLowerCase().includes('transport');

    if (isRoadDefect) {
      if (
        primaryProblem.category === 'ROAD_USAGE' ||
        primaryProblem.category.toLowerCase().includes('sanitation') ||
        primaryProblem.category.toLowerCase().includes('drainage')
      ) {
        primaryProblem.category = 'Roads & Transport';
        primaryProblem.domain = 'ROADS_TRANSPORT';
      }
      if (
        analysisResult.category === 'ROAD_USAGE' ||
        analysisResult.category.toLowerCase().includes('sanitation') ||
        analysisResult.category.toLowerCase().includes('drainage')
      ) {
        analysisResult.category = 'Roads & Transport';
      }
    }

    const observations: ProblemObservationDto[] = analysisResult.observations || [
      {
        description: challenge.description.slice(0, 300),
        evidenceSource: 'TEXT',
        confidence: 0.9,
      },
    ];

    const contributingFactors: ContributingFactorDto[] = (analysisResult.contributingFactors || []).map(cf => ({
      factor: cf.factor,
      evidence: typeof cf.evidence === 'string' ? cf.evidence : JSON.stringify(cf.evidence),
      confidence: cf.confidence,
      status: cf.status || 'AI_HYPOTHESIS',
    }));

    if (
      isRoadDefect &&
      (combinedChallengeText.includes('drain') ||
        combinedChallengeText.includes('waterlog') ||
        combinedChallengeText.includes('water'))
    ) {
      const hasDrainageFactor = contributingFactors.some(cf => cf.factor.toLowerCase().includes('drain'));
      if (!hasDrainageFactor) {
        contributingFactors.unshift({
          factor: 'Inadequate roadside storm drainage runoff',
          evidence: 'Water collects on road surface during precipitation accelerating asphalt stripping',
          confidence: 0.85,
          status: 'AI_HYPOTHESIS',
        });
      }
    }

    const rootCauseHypotheses: RootCauseHypothesisItemDto[] = analysisResult.rootCauseHypothesesItems ||
      (analysisResult.rootCauseHypotheses || []).map(cause => ({
        cause,
        reasoning: 'Derived from problem description and civic domain heuristics',
        supportingEvidence: challenge.title,
        confidence: 0.75,
        validationStatus: 'AI_HYPOTHESIS',
      }));

    const severityRecommendation: SeverityRecommendationDto = analysisResult.severityRecommendation || {
      level: analysisResult.estimatedSeverity || (challenge.severity as string),
      reasoning: analysisResult.reasoningSummary || 'Estimated based on civic domain impact model',
      confidence: 0.8,
    };

    const impactAssessment: ImpactAssessmentDto = analysisResult.impactAssessment || {
      affectedGroups: ['Local Community', 'Residents'],
      affectedAssets: [challenge.category],
      geographicScope: challenge.district ? 'DISTRICT' : 'LOCAL',
      estimatedScale: challenge.affectedPopulation || 500,
      basis: 'ESTIMATED',
      confidence: 0.7,
      dataLimitations: 'Awaiting field officer verification',
    };

    const evidenceAssessment: EvidenceAssessmentDto = analysisResult.evidenceAssessment || {
      availableEvidence: challenge.evidence.length > 0 ? ['CITIZEN_ATTACHMENTS'] : ['CITIZEN_NARRATIVE'],
      limitations:
        challenge.evidence.length === 0
          ? 'No photographic or documentary attachments provided'
          : 'Preliminary evidence awaiting official inspection',
      evidenceQuality: challenge.evidence.length > 0 ? 'MODERATE' : 'LOW',
    };

    const fieldConfidences: FieldConfidenceBreakdownDto = analysisResult.fieldConfidences || {
      categoryConfidence: 0.9,
      problemTypeConfidence: 0.85,
      severityConfidence: 0.8,
      impactConfidence: 0.7,
      rootCauseConfidence: 0.75,
      duplicateConfidence: 0.8,
      systemicConfidence: 0.75,
    };

    const structuredAnalysis = {
      primaryProblem,
      observations,
      contributingFactors,
      rootCauseHypotheses,
      severityRecommendation,
      impactAssessment,
      missingInformation: analysisResult.missingInformation || [],
      evidenceAssessment,
      fieldConfidences,
      overallConfidence: analysisResult.confidenceScore || 0.82,
    };

    // 5. Persist AIAnalysis record
    await prisma.aIAnalysis.upsert({
      where: { challengeId },
      create: {
        challengeId,
        status: AIAnalysisStatus.COMPLETED as unknown as import('@prisma/client').$Enums.AIAnalysisStatus,
        rawResponse: {
          ...analysisResult,
          structuredAnalysis,
          isFallback,
        } as any,
        confidenceScore: structuredAnalysis.overallConfidence,
        reasoningSummary: analysisResult.reasoningSummary || 'AI problem intelligence structured successfully.',
        requiresHumanReview: Boolean(analysisResult.requiresHumanReview) || isFallback,
        appliedRules: analysisResult.appliedRules || ['AUTOMATED_INTELLIGENCE_ORCHESTRATION'],
      },
      update: {
        status: AIAnalysisStatus.COMPLETED as unknown as import('@prisma/client').$Enums.AIAnalysisStatus,
        rawResponse: {
          ...analysisResult,
          structuredAnalysis,
          isFallback,
        } as any,
        confidenceScore: structuredAnalysis.overallConfidence,
        reasoningSummary: analysisResult.reasoningSummary || 'AI problem intelligence structured successfully.',
        requiresHumanReview: Boolean(analysisResult.requiresHumanReview) || isFallback,
        appliedRules: analysisResult.appliedRules || ['AUTOMATED_INTELLIGENCE_ORCHESTRATION'],
      },
    });

    // 6. Location Intelligence Gate
    const hasCoordinates = challenge.latitude != null && challenge.longitude != null;
    let locationQuality: LocationQuality = 'NONE';
    if (hasCoordinates) {
      locationQuality = 'COORDINATES';
    } else if (challenge.district || challenge.state) {
      locationQuality = 'ADMIN_ONLY';
    }

    // 7. Multi-Signal Candidate Duplicate & Relationship Evaluation
    try {
      const candidates = await DuplicateClusteringService.findCandidates(challengeId, 10);
      const systemicCandidates: typeof candidates = [];

      for (const candidate of candidates) {
        if (candidate.challengeId === challengeId) continue;

        let relationType: RelationshipType = RelationshipType.RELATED;
        if (candidate.relationshipClassification === 'DUPLICATE') {
          // Hard gate: If location quality is NONE, do not declare geographic duplicate
          if (locationQuality === 'NONE') {
            relationType = RelationshipType.RELATED;
          } else {
            relationType = RelationshipType.DUPLICATE;
          }
        } else if (candidate.relationshipClassification === 'SYSTEMIC_CANDIDATE') {
          relationType = RelationshipType.SYSTEMIC_ROOT_CAUSE;
          systemicCandidates.push(candidate);
        } else if (candidate.relationshipClassification === 'RELATED') {
          relationType = RelationshipType.RELATED;
        } else {
          continue; // Unrelated
        }

        // Check if an existing relationship already exists between these two challenges
        const existingRel = await prisma.challengeRelationship.findFirst({
          where: {
            OR: [
              { sourceChallengeId: challengeId, targetChallengeId: candidate.challengeId },
              { sourceChallengeId: candidate.challengeId, targetChallengeId: challengeId },
            ],
          },
        });

        if (!existingRel) {
          await prisma.challengeRelationship.create({
            data: {
              sourceChallengeId: challengeId,
              targetChallengeId: candidate.challengeId,
              relationType: relationType as unknown as import('@prisma/client').$Enums.RelationshipType,
              status: RelationshipStatus.RECOMMENDED as unknown as import('@prisma/client').$Enums.RelationshipStatus,
              confidenceScore: candidate.overallScore,
              reasoning:
                candidate.reasoning ||
                `AI-identified ${relationType.toLowerCase().replace(/_/g, ' ')} candidate based on multi-signal intelligence analysis.`,
              problemSimilarity: candidate.semanticSimilarity * 100,
              locationSimilarity: candidate.factorBreakdown?.locationSimilarity ?? null,
              categoryCompatibility: candidate.factorBreakdown?.categoryCompatibility ?? null,
              infrastructureOverlap: candidate.factorBreakdown?.infrastructureOverlap ?? null,
              rootCauseSimilarity: candidate.factorBreakdown?.rootCauseSimilarity ?? null,
              evidenceConsistency: candidate.factorBreakdown?.evidenceConsistency ?? null,
              temporalRelationship: candidate.factorBreakdown?.temporalRelationship ?? null,
              factorBreakdown: candidate.factorBreakdown as any,
              distanceMeters: candidate.distanceMeters,
              sharedInfrastructure: candidate.sharedInfrastructure,
              model: 'gemini-3.1-flash-lite',
              modelVersion: '1.0',
            },
          });
        }
      }

      // 8. Candidate Root-Cause Problem Clustering
      if (systemicCandidates.length > 0 && locationQuality !== 'NONE') {
        const rootCauseTitle =
          structuredAnalysis.rootCauseHypotheses[0]?.cause || `${challenge.category} Systemic Issue`;
        const rootCauseSummary =
          structuredAnalysis.rootCauseHypotheses[0]?.reasoning ||
          'Aggregated civic defect cluster sharing infrastructure failure';

        // Check if an open/pending cluster already exists for this root cause & category
        let cluster = await prisma.problemCluster.findFirst({
          where: {
            category: challenge.category,
            status: RelationshipStatus.PENDING_REVIEW as unknown as import('@prisma/client').$Enums.RelationshipStatus,
            OR: [
              { rootCauseTitle: { contains: rootCauseTitle.slice(0, 30), mode: 'insensitive' } },
              { title: { contains: rootCauseTitle.slice(0, 30), mode: 'insensitive' } },
            ],
          },
        });

        if (!cluster) {
          // Create candidate ProblemCluster
          cluster = await prisma.problemCluster.create({
            data: {
              title: `Systemic Cluster: ${rootCauseTitle}`,
              description: rootCauseSummary,
              category: challenge.category,
              canonicalChallengeId: challengeId,
              rootCauseTitle,
              rootCauseSummary,
              confidenceScore: 0.85,
              status: RelationshipStatus.PENDING_REVIEW as unknown as import('@prisma/client').$Enums.RelationshipStatus,
              metadata: {
                aiGenerated: true,
                requestId,
                detectedAt: new Date().toISOString(),
              },
            },
          });

          // Add this challenge as canonical member
          await prisma.problemClusterMember.upsert({
            where: {
              clusterId_challengeId: {
                clusterId: cluster.id,
                challengeId,
              },
            },
            create: {
              clusterId: cluster.id,
              challengeId,
              isCanonical: true,
            },
            update: {},
          });
        }

        // Add candidate systemic challenges as members without modifying original challenges
        for (const sc of systemicCandidates) {
          await prisma.problemClusterMember.upsert({
            where: {
              clusterId_challengeId: {
                clusterId: cluster.id,
                challengeId: sc.challengeId,
              },
            },
            create: {
              clusterId: cluster.id,
              challengeId: sc.challengeId,
              isCanonical: false,
            },
            update: {},
          });
        }
      }
    } catch (candErr: unknown) {
      logger.warn(
        `Candidate relationship processing encountered non-fatal error for challenge ${challengeId}: ${(candErr as Error).message}`,
        { requestId }
      );
    }

    // 9. Record Audit Log for governance
    await AuditService.record({
      actorId: challenge.submitterId,
      actorRole: challenge.submitter?.role || 'CITIZEN',
      action: AuditAction.CHALLENGE_UPDATE,
      resource: 'Challenge',
      resourceId: challengeId,
      newState: {
        status: AIAnalysisStatus.COMPLETED,
        confidenceScore: structuredAnalysis.overallConfidence,
        primaryProblem: structuredAnalysis.primaryProblem,
        requiresHumanReview: structuredAnalysis.overallConfidence < 0.75 || isFallback,
      },
      reason: 'AI problem categorization and candidate relationship analysis completed.',
      requestId,
    }).catch(() => {});

    logger.info(`Challenge Intelligence Orchestration completed successfully for challenge ${challengeId}`, { requestId });
  }

  /**
   * Deterministic civic intelligence fallback matching the 7 standard domain scenarios
   */
  public static generateCivicIntelligenceFallback(challenge: {
    id: string;
    title: string;
    description: string;
    category: string;
    district?: string | null;
    state?: string | null;
    affectedPopulation?: number | null;
    durationMonths?: number | null;
  }): AiAnalysisResponse {
    const text = `${challenge.title} ${challenge.description}`.toLowerCase();
    let category = challenge.category;
    let subcategory = 'General';
    let problemType = 'General Civic Defect';
    let domain = 'CIVIC_INFRASTRUCTURE';
    let primaryRootCause = 'Infrastructure wear and lack of timely preventive maintenance';

    if (
      text.includes('school') ||
      text.includes('teacher') ||
      text.includes('classroom') ||
      text.includes('student') ||
      challenge.category.toLowerCase().includes('education')
    ) {
      domain = 'EDUCATION_INFRASTRUCTURE';
      category = 'Education Service';
      subcategory = text.includes('teacher') || text.includes('staff') ? 'Teaching Staffing' : 'School Physical Plant';
      problemType = text.includes('teacher') ? 'Teacher Shortage' : 'Classroom Structural Deterioration';
      primaryRootCause = text.includes('teacher')
        ? 'Delayed institutional faculty recruitment cycles and geographic transfer imbalances'
        : 'Deferred maintenance of public institutional buildings';
    } else if (
      text.includes('hospital') ||
      text.includes('clinic') ||
      text.includes('health') ||
      text.includes('doctor') ||
      text.includes('medicine') ||
      challenge.category.toLowerCase().includes('health')
    ) {
      domain = 'PUBLIC_HEALTHCARE';
      category = 'Healthcare Service';
      subcategory = 'Primary Health Infrastructure';
      problemType = 'Healthcare Facility Access Deficit';
      primaryRootCause = 'Inadequate regional transit links and rural medical staffing vacancies';
    } else if (
      text.includes('light') ||
      text.includes('power') ||
      text.includes('electric') ||
      text.includes('voltage') ||
      text.includes('blackout') ||
      challenge.category.toLowerCase().includes('electric')
    ) {
      domain = 'PUBLIC_LIGHTING_ENERGY';
      category = 'Electricity Network';
      subcategory = 'Street Lighting';
      problemType = 'Streetlight Illumination Failure';
      primaryRootCause = 'Underground feeder cable faults and phase imbalance during weather events';
    } else if (text.includes('road') || text.includes('pothole') || text.includes('asphalt') || text.includes('highway')) {
      domain = 'ROADS_TRANSPORT';
      category = 'Roads & Transport';
      subcategory = 'Pavement & Road Surface';
      problemType = 'Road Damage / Pavement Failure';
      primaryRootCause =
        text.includes('drain') || text.includes('water')
          ? 'Inadequate subsurface stormwater drainage causing pavement saturation and asphalt erosion'
          : 'Heavy vehicle axle loads combined with structural pavement wear';
    } else if (
      text.includes('drinking water') ||
      text.includes('potable') ||
      text.includes('handpump') ||
      text.includes('borewell') ||
      text.includes('water supply') ||
      text.includes('pipeline') ||
      (text.includes('water') &&
        (text.includes('contaminat') ||
          text.includes('dirty') ||
          text.includes('arsenic') ||
          text.includes('tap')))
    ) {
      domain = 'WATER_SANITATION';
      category = 'Water Supply';
      subcategory = 'Drinking Water Distribution';
      problemType = 'Water Quality / Contamination';
      primaryRootCause =
        text.includes('runoff') || text.includes('fertiliz') || text.includes('pesticide')
          ? 'Agricultural chemical runoff infiltrating shallow groundwater aquifers'
          : 'Pipe network infiltration from adjacent sewer lines';
    } else if (text.includes('drain') || text.includes('waterlog') || text.includes('flood') || text.includes('overflow')) {
      domain = 'DRAINAGE_ENVIRONMENT';
      category = 'Sanitation & Drainage';
      subcategory = 'Stormwater Drainage';
      problemType = 'Stormwater Overflow / Drainage Blockage';
      primaryRootCause = 'Silt accumulation and undersized culverts restricting peak runoff velocity';
    }

    return {
      category,
      subcategory,
      problemType,
      normalizedStatement: challenge.title,
      entities: [category, challenge.district || 'Municipal Region'],
      estimatedSeverity: 'MODERATE',
      preliminaryPriority: 'MEDIUM',
      priorityScore: 65,
      severityBreakdown: {
        riskLevel: 'MODERATE',
        urgencyLevel: 'MEDIUM',
        serviceDisruption: 'PARTIAL',
        environmentalImpact: 'LOCAL',
        vulnerabilityScore: 50,
      },
      rootCauseHypotheses: [primaryRootCause],
      systemicIndicators: ['Shared municipal corridor infrastructure', 'Seasonal weather vulnerability'],
      duplicateKeywords: [category.toLowerCase(), problemType.toLowerCase()],
      confidenceScore: 0.85,
      reasoningSummary: `Deterministic civic problem classification applied based on standard municipal taxonomies.`,
      requiresHumanReview: true,
      dataLimitations: 'Processed using deterministic fallback rules; requires authoritative government validation.',
      appliedRules: ['CIVIC_ENGINE_DETERMINISTIC_TAXONOMY'],
      aiProvider: 'CIVIC_ENGINE_FALLBACK',
      primaryProblem: {
        domain,
        category,
        problemType,
        normalizedStatement: challenge.title,
        confidence: 0.85,
      },
      observations: [
        {
          description: challenge.description.slice(0, 300),
          evidenceSource: 'TEXT',
          confidence: 0.9,
        },
        ...(text.includes('road') && (text.includes('drain') || text.includes('water'))
          ? [
              {
                description: 'Water accumulation and standing pools observed on carriageway',
                evidenceSource: 'TEXT' as const,
                confidence: 0.85,
              },
            ]
          : []),
      ],
      contributingFactors: [
        {
          factor:
            text.includes('road') && (text.includes('drain') || text.includes('water'))
              ? 'Inadequate roadside storm drainage runoff'
              : 'Local environmental exposure and deferred preventive maintenance',
          evidence: challenge.description.slice(0, 150),
          confidence: 0.8,
          status: 'AI_HYPOTHESIS',
        },
      ],
      rootCauseHypothesesItems: [
        {
          cause: primaryRootCause,
          reasoning: 'Derived from civic infrastructure baseline taxonomy and symptom profile',
          supportingEvidence: challenge.title,
          confidence: 0.8,
          validationStatus: 'AI_HYPOTHESIS',
        },
      ],
      severityRecommendation: {
        level: 'MODERATE',
        reasoning: 'Estimated based on municipal asset impact model',
        confidence: 0.8,
      },
      impactAssessment: {
        affectedGroups: ['Local Community', 'Daily Commuters'],
        affectedAssets: [category],
        geographicScope: challenge.district ? 'DISTRICT' : 'LOCAL',
        estimatedScale: challenge.affectedPopulation || 500,
        basis: 'ESTIMATED',
        confidence: 0.75,
        dataLimitations: 'Awaiting field officer verification',
      },
      evidenceAssessment: {
        availableEvidence: ['CITIZEN_NARRATIVE'],
        limitations: 'Preliminary evidence awaiting official field inspection',
        evidenceQuality: 'MODERATE',
      },
      fieldConfidences: {
        categoryConfidence: 0.9,
        problemTypeConfidence: 0.85,
        severityConfidence: 0.8,
        impactConfidence: 0.75,
        rootCauseConfidence: 0.8,
        duplicateConfidence: 0.8,
        systemicConfidence: 0.75,
      },
    };
  }
}
