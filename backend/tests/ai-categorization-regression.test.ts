import {
  AiStructuredAnalysisDto,
  FieldConfidenceBreakdownDto,
  PrimaryProblemDto,
  ProblemObservationDto,
  ContributingFactorDto,
  RootCauseHypothesisItemDto,
  SeverityRecommendationDto,
  ImpactAssessmentDto,
  EvidenceAssessmentDto,
  ChallengeStatus,
  SeverityLevel,
  PriorityLevel,
  UserRole,
} from '@sicp/shared';
import { PriorityEngine } from '../src/domain/intelligence/priority.engine';
import { DuplicateClusteringService } from '../src/domain/intelligence/duplicate-clustering.service';
import { RelationshipScoringEngine } from '../src/domain/intelligence/relationship-scoring.engine';
import { ChallengeIntelligenceOrchestrator } from '../src/domain/intelligence/challenge-intelligence.orchestrator';
import { GovernmentController } from '../src/modules/government/government.controller';
import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    challenge: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    aIAnalysis: {
      update: jest.fn(),
    },
    challengeTimeline: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  },
}));

describe('AI Categorization & Governance Regression Suite', () => {
  describe('Domain Separation Models & Field-Level Confidence', () => {
    it('constructs complete structured AI response with strict domain separation', () => {
      const fieldConfidences: FieldConfidenceBreakdownDto = {
        categoryConfidence: 0.92,
        problemTypeConfidence: 0.89,
        severityConfidence: 0.85,
        impactConfidence: 0.78,
        rootCauseConfidence: 0.80,
        duplicateConfidence: 0.88,
        systemicConfidence: 0.75,
      };

      const primaryProblem: PrimaryProblemDto = {
        domain: 'Transportation',
        category: 'Roads & Transport',
        problemType: 'ROAD_USAGE',
        normalizedStatement: 'Severe asphalt degradation and potholes along main corridor',
        confidence: 0.92,
      };

      const observations: ProblemObservationDto[] = [
        {
          description: 'Deep potholes and surface cracking observed on carriageway',
          evidenceSource: 'TEXT',
          confidence: 0.95,
        },
        {
          description: 'Standing water pools along road shoulder during precipitation',
          evidenceSource: 'TEXT',
          confidence: 0.88,
        },
      ];

      const contributingFactors: ContributingFactorDto[] = [
        {
          factor: 'Inadequate roadside storm drainage runoff',
          evidence: 'Water collects on road surface during rain accelerating asphalt stripping',
          confidence: 0.85,
          status: 'AI_HYPOTHESIS',
        },
      ];

      const rootCauseHypotheses: RootCauseHypothesisItemDto[] = [
        {
          cause: 'Subbase saturation due to absence of culverts under wheel loads',
          reasoning: 'Water trapped in base weakens pavement bearing capacity',
          supportingEvidence: 'Pothole formation follows monsoon rain cycles',
          confidence: 0.82,
          validationStatus: 'AI_HYPOTHESIS',
        },
      ];

      const severityRecommendation: SeverityRecommendationDto = {
        level: 'SEVERE',
        reasoning: 'Critical arterial transit route with heavy vehicular traffic',
        confidence: 0.85,
      };

      const impactAssessment: ImpactAssessmentDto = {
        affectedGroups: ['Daily commuters', 'Public bus passengers', 'Local shop owners'],
        affectedAssets: ['Main arterial road', 'Vehicular fleet'],
        geographicScope: 'WARD',
        estimatedScale: 5000,
        basis: 'ESTIMATED',
        confidence: 0.80,
        dataLimitations: 'Field survey required for exact traffic volume',
      };

      const evidenceAssessment: EvidenceAssessmentDto = {
        availableEvidence: ['Citizen description', 'Photographic evidence'],
        limitations: 'No geotechnical soil sample available',
        evidenceQuality: 'HIGH',
      };

      const structuredAnalysis: Partial<AiStructuredAnalysisDto> = {
        category: 'Roads & Transport',
        estimatedSeverity: 'SEVERE',
        preliminaryPriority: 'HIGH',
        confidenceScore: 0.88,
        reasoningSummary: 'Potholes and structural pavement failure on key arterial route.',
        requiresHumanReview: true,
        appliedRules: ['High-stakes severity requires government validation'],
        aiProvider: 'GEMINI',
        primaryProblem,
        observations,
        contributingFactors,
        rootCauseHypothesesItems: rootCauseHypotheses,
        severityRecommendation,
        impactAssessment,
        evidenceAssessment,
        fieldConfidences,
      };

      expect(structuredAnalysis.primaryProblem?.domain).toBe('Transportation');
      expect(structuredAnalysis.primaryProblem?.category).toBe('Roads & Transport');
      expect(structuredAnalysis.fieldConfidences?.categoryConfidence).toBe(0.92);
      expect(structuredAnalysis.contributingFactors).toHaveLength(1);
      expect(structuredAnalysis.contributingFactors?.[0].status).toBe('AI_HYPOTHESIS');
      expect(structuredAnalysis.rootCauseHypothesesItems?.[0].validationStatus).toBe('AI_HYPOTHESIS');
    });
  });

  describe('Road Classification Regression Prevention', () => {
    it('prevents road defect from being classified as Sanitation & Drainage and detects duplicate', () => {
      const evaluation = RelationshipScoringEngine.evaluate(
        {
          id: 'chal-1',
          title: 'Village main road damaged with deep potholes',
          description: 'The village main road has deep potholes and broken asphalt surface causing severe vehicular damage.',
          category: 'Roads & Transport',
          severity: 'MODERATE',
          latitude: 12.9716,
          longitude: 77.5946,
          district: 'Bengaluru Urban',
          state: 'Karnataka',
        },
        {
          id: 'chal-2',
          title: 'Village main road damaged with severe potholes',
          description: 'The village main road has severe potholes and broken asphalt surface making vehicle transit hazardous.',
          category: 'Roads & Transport',
          severity: 'MODERATE',
          latitude: 12.9720,
          longitude: 77.5950,
          district: 'Bengaluru Urban',
          state: 'Karnataka',
        }
      );

      expect(evaluation.factorBreakdown.categoryCompatibility).toBe(100);
      expect(evaluation.relationType).toBe('DUPLICATE');
    });

    it('distinguishes road damage from sewage drain blockage as SYSTEMIC, not duplicate', () => {
      const evaluation = RelationshipScoringEngine.evaluate(
        {
          id: 'chal-road',
          title: 'Road surface completely broken and cracked',
          description: 'Potholes and bitumen stripping make vehicular movement dangerous.',
          category: 'Roads & Transport',
          severity: 'SEVERE',
          latitude: 19.076,
          longitude: 72.8777,
          district: 'Mumbai',
          state: 'Maharashtra',
          rootCause: 'Inadequate drainage capacity undermining road subgrade',
        },
        {
          id: 'chal-drain',
          title: 'Stormwater drain overflowing with solid waste',
          description: 'The open drain is choked with plastic debris causing blackwater to spill onto the street.',
          category: 'Sanitation & Drainage',
          severity: 'SEVERE',
          latitude: 19.0762,
          longitude: 72.8778,
          district: 'Mumbai',
          state: 'Maharashtra',
          rootCause: 'Inadequate drainage capacity undermining road subgrade and illegal waste',
        }
      );

      // Distinct problems sharing location and upstream root cause must NOT be DUPLICATE
      expect(evaluation.relationType).not.toBe('DUPLICATE');
      expect(['SYSTEMIC_ROOT_CAUSE', 'RELATED']).toContain(evaluation.relationType);
    });
  });

  describe('Step 3: Six Mandatory Domain Model Invariants & Regression Scenarios', () => {
    it('1. Road damaged: classifies as Roads & Transport / Road Infrastructure, NEVER ROAD_USAGE as category', () => {
      const fallback = ChallengeIntelligenceOrchestrator.generateCivicIntelligenceFallback({
        id: 'chal-road-1',
        title: 'Main village road damaged with deep potholes',
        description: 'Large potholes and asphalt surface cracking along 500m stretch.',
        category: 'Roads & Transport',
      });
      expect(fallback.category).toBe('Roads & Transport');
      expect(fallback.category).not.toBe('ROAD_USAGE');
      expect(fallback.category).not.toBe('Sanitation & Drainage');
      expect(fallback.primaryProblem!.category).toBe('Roads & Transport');
      expect(fallback.primaryProblem!.domain).toBe('ROADS_TRANSPORT');
      expect(fallback.primaryProblem!.problemType).toBe('Road Damage / Pavement Failure');
    });

    it('2. Road damaged + drainage problem: primary is Road Infrastructure, drainage is contributing factor, NOT primary category', () => {
      const fallback = ChallengeIntelligenceOrchestrator.generateCivicIntelligenceFallback({
        id: 'chal-road-drain-1',
        title: 'Road is badly damaged and water accumulates after rain',
        description: 'Carriageway is filled with potholes and standing water pools due to poor roadside drainage runoff.',
        category: 'Roads & Transport',
      });
      // Primary problem: Road infrastructure / road damage
      expect(fallback.category).toBe('Roads & Transport');
      expect(fallback.category).not.toBe('Sanitation & Drainage');
      expect(fallback.category).not.toBe('ROAD_USAGE');
      expect(fallback.primaryProblem!.category).toBe('Roads & Transport');
      // Observation: water accumulation
      expect(
        fallback.observations!.some(
          obs => obs.description.toLowerCase().includes('water') || obs.description.toLowerCase().includes('standing')
        )
      ).toBe(true);
      // Contributing factor: poor drainage
      expect(fallback.contributingFactors!.some(cf => cf.factor.toLowerCase().includes('drain'))).toBe(true);
      // Root-cause hypothesis: inadequate drainage
      expect(fallback.rootCauseHypotheses[0].toLowerCase()).toContain('drainage');
    });

    it('3. Drainage problem: classified as Sanitation & Drainage, NOT road infrastructure', () => {
      const fallback = ChallengeIntelligenceOrchestrator.generateCivicIntelligenceFallback({
        id: 'chal-drain-only',
        title: 'Stormwater drain blocked with plastic silt causing sewage overflow',
        description: 'The municipal open drain is choked with garbage, resulting in foul water spillage.',
        category: 'Sanitation & Drainage',
      });
      expect(fallback.category).toBe('Sanitation & Drainage');
      expect(fallback.primaryProblem!.domain).toBe('DRAINAGE_ENVIRONMENT');
      expect(fallback.category).not.toBe('Roads & Transport');
    });

    it('4. Waterlogging affecting road: classified as Roads & Transport, waterlogging as observation/symptom', () => {
      const fallback = ChallengeIntelligenceOrchestrator.generateCivicIntelligenceFallback({
        id: 'chal-waterlog-road',
        title: 'Severe waterlogging submerging main arterial road and stalling vehicles',
        description: 'Water stands knee-deep across 200m of the highway corridor preventing traffic transit.',
        category: 'Roads & Transport',
      });
      expect(fallback.category).toBe('Roads & Transport');
      expect(fallback.category).not.toBe('Sanitation & Drainage');
      expect(fallback.observations!.some(obs => obs.description.toLowerCase().includes('water') || obs.description.toLowerCase().includes('standing'))).toBe(true);
    });

    it('5. Pure sanitation/drainage problem: classified strictly as Sanitation & Drainage, NOT road infrastructure', () => {
      const fallback = ChallengeIntelligenceOrchestrator.generateCivicIntelligenceFallback({
        id: 'chal-pure-sanitation',
        title: 'Open sewer overflowing with sewage and stagnant foul sludge',
        description: 'Uncovered sewer line is clogged with domestic waste causing environmental contamination and vector breeding.',
        category: 'Sanitation & Drainage',
      });
      expect(fallback.category).toBe('Sanitation & Drainage');
      expect(fallback.primaryProblem!.domain).toBe('DRAINAGE_ENVIRONMENT');
      expect(fallback.category).not.toBe('Roads & Transport');
      expect(fallback.category).not.toBe('ROAD_USAGE');
    });

    it('6. School building damaged: classified as Education Service / School Infrastructure, NOT Sanitation', () => {
      const fallback = ChallengeIntelligenceOrchestrator.generateCivicIntelligenceFallback({
        id: 'chal-school-1',
        title: 'Primary school roof leaking and classroom plaster crumbling',
        description: 'Government school building structure damaged, waterlogging in school yard during rain.',
        category: 'Education',
      });
      expect(fallback.category).toBe('Education Service');
      expect(fallback.primaryProblem!.domain).toBe('EDUCATION_INFRASTRUCTURE');
      expect(fallback.category).not.toBe('Sanitation & Drainage');
    });

    it('7. Water contamination: classified as Potable Water Supply, NOT Agriculture even with fertilizer runoff', () => {
      const fallback = ChallengeIntelligenceOrchestrator.generateCivicIntelligenceFallback({
        id: 'chal-water-contam',
        title: 'Drinking water contamination with dark residue',
        description: 'Potable pipeline water smells of fertilizer runoff and chemicals.',
        category: 'Water Supply',
      });
      expect(fallback.category).toBe('Water Supply');
      expect(fallback.primaryProblem!.domain).toBe('WATER_SANITATION');
      expect(fallback.rootCauseHypotheses[0].toLowerCase()).toContain('runoff');
    });

    it('8. Different problems in same location: Handpumps dry + Farm wells dry are distinct problems sharing root cause, NOT duplicate', () => {
      const evaluation = RelationshipScoringEngine.evaluate(
        {
          id: 'chal-handpump',
          title: 'Handpumps are producing very little water',
          description: 'Village community handpumps yield only muddy trickle after dry season.',
          category: 'Water Supply',
          severity: 'SEVERE',
          latitude: 26.8467,
          longitude: 80.9462,
          district: 'Lucknow',
          state: 'Uttar Pradesh',
          rootCause: 'Groundwater table depletion',
        },
        {
          id: 'chal-wells',
          title: 'Farm wells are drying up',
          description: 'Agricultural irrigation borewells have run dry across all local farms.',
          category: 'Agriculture',
          severity: 'SEVERE',
          latitude: 26.847,
          longitude: 80.9465,
          district: 'Lucknow',
          state: 'Uttar Pradesh',
          rootCause: 'Groundwater table depletion',
        }
      );
      // Different problems in same location MUST NOT be merged as DUPLICATE
      expect(evaluation.relationType).not.toBe('DUPLICATE');
      expect(evaluation.relationType).toBe('SYSTEMIC_ROOT_CAUSE');
    });
  });

  describe('Location Intelligence Gate', () => {
    it('returns zero geographic duplicates and provides topic insights when location is NONE', async () => {
      const result = await DuplicateClusteringService.checkContextAwareDuplicates({
        title: 'Drinking water pipeline leakage',
        description: 'Potable water pipe is cracked and water is gushing onto the dirt road.',
        category: 'Water Supply',
        // No location provided
      });

      expect(result.locationQuality).toBe('NONE');
      expect(result.locationProvided).toBe(false);
      expect(result.localIntelligence?.duplicates).toHaveLength(0);
      expect(result.candidates).toHaveLength(0);
      expect(result.topicInsights?.notice).toContain('Add a location to check for nearby or duplicate reports');
    });
  });

  describe('Government Governance & Decision Persistence', () => {
    it('recalculates priority score when severity and priority are authoritatively overridden', () => {
      const original = PriorityEngine.calculate({
        severity: SeverityLevel.MODERATE,
        urgency: PriorityLevel.MEDIUM,
        affectedPopulation: 500,
        durationMonths: 1,
        communityVotesCount: 0,
        evidenceCount: 1,
      });

      const overridden = PriorityEngine.calculate({
        severity: SeverityLevel.CATASTROPHIC,
        urgency: PriorityLevel.CRITICAL,
        affectedPopulation: 500,
        durationMonths: 1,
        communityVotesCount: 0,
        evidenceCount: 1,
      });

      expect(overridden.score).toBeGreaterThan(original.score);
    });

    it('persists government review separately without overwriting original AI analysis', async () => {
      const mockChallenge = {
        id: 'chal-review-123',
        title: 'Road damaged in ward 12',
        status: ChallengeStatus.SUBMITTED,
        severity: 'MODERATE',
        priority: 'MEDIUM',
        priorityScore: 45.0,
        affectedPopulation: 1000,
        durationMonths: 2,
        submitterId: 'citizen-1',
        aiAnalysis: {
          id: 'ai-analysis-1',
          rawResponse: {
            estimatedSeverity: 'MODERATE',
            preliminaryPriority: 'MEDIUM',
            primaryProblem: { category: 'Roads & Transport' },
          },
        },
      };

      const mockUpdatedChallenge = {
        ...mockChallenge,
        status: ChallengeStatus.APPROVED,
        severity: 'SEVERE',
        priority: 'HIGH',
        priorityScore: 78.5,
        version: 2,
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          challenge: {
            findUnique: jest.fn().mockResolvedValue(mockChallenge),
            update: jest.fn().mockResolvedValue(mockUpdatedChallenge),
          },
          aIAnalysis: {
            update: jest.fn().mockResolvedValue({}),
          },
          challengeTimeline: {
            create: jest.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
          notification: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return await callback(tx);
      });

      const req: any = {
        params: { id: 'chal-review-123' },
        user: { id: 'officer-1', role: UserRole.GOVERNMENT_OFFICER },
        body: {
          decision: 'APPROVE',
          severity: 'SEVERE',
          priority: 'HIGH',
          reason: 'Inspected by municipal engineer; heavy truck traffic warrants high priority.',
          rootCauseValidations: [
            { cause: 'Inadequate subgrade drainage', status: 'GOVERNMENT_VALIDATED' },
          ],
        },
        header: jest.fn().mockReturnValue('req-123'),
        headers: { 'x-request-id': 'req-123' },
        ip: '127.0.0.1',
      };

      const res: any = {
        locals: { requestId: 'req-123' },
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn((err) => {
        if (err) console.error("REVIEW CHALLENGE ERROR:", err);
      });

      await GovernmentController.reviewChallenge(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.challenge.status).toBe(ChallengeStatus.APPROVED);
      expect(responseData.data.governmentReview.authoritativeSeverity).toBe('SEVERE');
      expect(responseData.data.governmentReview.decision).toBe('APPROVE');
      expect(responseData.data.governmentReview.aiSeverityRecommendation).toBe('MODERATE');
      expect(responseData.data.governmentReview.rootCauseValidations[0].status).toBe('GOVERNMENT_VALIDATED');
    });
  });
});
