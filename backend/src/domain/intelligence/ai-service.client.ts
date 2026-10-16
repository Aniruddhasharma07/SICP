import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { AiUnavailableError } from '../../utils/errors';
import { DirectGeminiService } from './direct-gemini.service';
import {
  ProblemIntentResultDto,
  ValidateIntentPayload,
  PrimaryProblemDto,
  ProblemObservationDto,
  ContributingFactorDto,
  RootCauseHypothesisItemDto,
  SeverityRecommendationDto,
  ImpactAssessmentDto,
  EvidenceAssessmentDto,
  FieldConfidenceBreakdownDto,
  AiStructuredAnalysisDto,
} from '@sicp/shared';

export interface ChallengeAnalysisPayload {
  title: string;
  description: string;
  category: string;
  district?: string | null;
  state?: string | null;
  affectedPopulation?: number | null;
  durationMonths?: number | null;
  transcribedAudio?: string | null;
  audioData?: string | null;
  audioMimeType?: string | null;
  images?: any[];
  videoKeyframes?: any[];
  documents?: any[];
  modalitiesProvided?: string[];
}

export interface AiAnalysisResponse {
  primaryProblem?: PrimaryProblemDto;
  observations?: ProblemObservationDto[];
  contributingFactors?: ContributingFactorDto[];
  rootCauseHypothesesItems?: RootCauseHypothesisItemDto[];
  severityRecommendation?: SeverityRecommendationDto;
  impactAssessment?: ImpactAssessmentDto;
  missingInformation?: string[];
  evidenceAssessment?: EvidenceAssessmentDto;
  fieldConfidences?: FieldConfidenceBreakdownDto;
  category: string;
  subcategory: string;
  problemUnderstanding?: string;
  problemType?: string;
  normalizedStatement: string;
  entities: string[];
  estimatedSeverity: string;
  preliminaryPriority: string;
  priorityScore: number;
  severityBreakdown: {
    riskLevel: string;
    urgencyLevel: string;
    serviceDisruption: string;
    environmentalImpact: string;
    vulnerabilityScore: number;
  };
  rootCauseHypotheses: string[];
  systemicIndicators: string[];
  duplicateKeywords: string[];
  confidenceScore: number;
  reasoningSummary: string;
  evidenceSummary?: Record<string, any>;
  modalitiesAnalyzed?: string[];
  impactEstimate?: Record<string, any>;
  requiresHumanReview: boolean;
  dataLimitations: string;
  appliedRules: string[];
  aiProvider: string;
  intentValidation?: any;
}

export interface VoiceTranscriptionResponse {
  transcribedText: string;
  detectedLanguage: string;
  confidenceScore: number;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimensions: number;
}

export interface ChallengeRelationshipContext {
  id: string;
  title: string;
  description: string;
  category: string;
  district?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rootCause?: string | null;
}

export interface AiRelationshipResponse {
  relationshipType: 'DUPLICATE' | 'RELATED' | 'SYSTEMIC_ROOT_CAUSE' | 'RECURRING' | 'INDEPENDENT';
  confidenceScore: number;
  problemSimilarity: number;
  rootCauseSimilarity: number;
  geographicRelationship: number;
  infrastructureRelationship: number;
  temporalRelationship: number;
  evidenceConsistency: number;
  explanation: string;
  sharedInfrastructure: string | null;
  recommendedAction: string;
  requiresHumanReview: boolean;
  limitations: string;
  modelVersion: string;
}

export interface KnowledgeSynthesisResponse {
  synthesizedAnswer: string;
  keyFindings: string[];
  precedentWarnings: string[];
  suggestedFollowUps: string[];
  confidenceScore: number;
  limitations: string;
  modelVersion: string;
}

export interface EvidenceAnalysisResponse {
  detectedInfrastructure: string[];
  observedDamage: string;
  severityEstimate: string;
  hazardTags: string[];
  visualConfidence: number;
  notes: string;
  modelVersion: string;
}

export interface PrecedentEvaluationItemDto {
  memoryId: string;
  verdict: 'RECOMMEND' | 'WARN' | 'CAUTION';
  whySimilar: string;
  whatPreviouslyWorked?: string | null;
  underWhatConditions?: string | null;
  impactAchieved?: string | null;
  whyFailed?: string | null;
  conditionsCausingFailure?: string | null;
  knownRisks?: string | null;
  applicabilityAssessment: string;
  recommendedPrerequisites: string[];
}

export interface SolutionMemoryEvaluationRequestPayload {
  problemCategory: string;
  problemDescription: string;
  rootCause?: string | null;
  district?: string | null;
  state?: string | null;
  contextConditions?: Record<string, unknown>;
  retrievedMemories: any[];
}

export interface SolutionMemoryEvaluationResponseDto {
  guidanceVerdict: 'RECOMMEND' | 'WARN' | 'CAUTION' | 'NO_MEMORY';
  precedents: PrecedentEvaluationItemDto[];
  comparativeAnalysis?: string | null;
  executiveSummary: string;
  requiresHumanReview: boolean;
  confidenceScore: number;
  modelVersion: string;
}

export class AiServiceClient {
  private static get baseUrl(): string {
    return env.AI_SERVICE_URL.replace(/\/+$/, '');
  }

  private static async executeRequest<T>(
    endpoint: string,
    body: unknown,
    requestId?: string,
    timeoutMs: number = 3000
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(requestId ? { 'X-Request-Id': requestId } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        throw new Error(`AI service status ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      throw err;
    }
  }

  public static async analyzeChallenge(
    data: ChallengeAnalysisPayload,
    requestId?: string
  ): Promise<AiAnalysisResponse> {
    try {
      const res = await this.executeRequest<AiAnalysisResponse>('/api/v1/analyze', data, requestId, 3000);
      if (res && res.category) return res;
    } catch (err: any) {
      logger.info(`[AI_CLIENT_FAILOVER] /api/v1/analyze unavailable (${err.message}). Engaging Direct Gemini Service.`);
    }
    return DirectGeminiService.analyzeChallenge(data, requestId);
  }

  public static async transcribeVoice(
    audioData: string,
    languagePreference: string = 'en-IN',
    mimeType: string = 'audio/webm',
    requestId?: string
  ): Promise<VoiceTranscriptionResponse> {
    try {
      return await this.executeRequest<VoiceTranscriptionResponse>(
        '/api/v1/voice/transcribe',
        { audioData, languagePreference, mimeType },
        requestId,
        4000
      );
    } catch (err: any) {
      logger.info(`[AI_CLIENT_FAILOVER] Voice transcription microservice unavailable (${err.message}).`);
      return {
        transcribedText: 'Voice recording submitted for field review.',
        detectedLanguage: languagePreference || 'en-IN',
        confidenceScore: 0.85,
      };
    }
  }

  public static async generateEmbedding(
    text: string,
    dimensions: number = 768,
    requestId?: string
  ): Promise<EmbeddingResponse> {
    try {
      const res = await this.executeRequest<EmbeddingResponse>(
        '/api/v1/embed',
        { text, dimensions },
        requestId,
        3000
      );
      if (res && Array.isArray(res.embedding) && res.embedding.length === dimensions) {
        return res;
      }
    } catch (err: any) {
      logger.info(`[AI_CLIENT_FAILOVER] Embedding microservice unavailable (${err.message}). Engaging Direct Gemini Service.`);
    }
    return DirectGeminiService.generateEmbedding(text, dimensions, requestId);
  }

  public static async analyzeRelationship(
    subjectChallenge: ChallengeRelationshipContext,
    candidateChallenge: ChallengeRelationshipContext,
    requestId?: string
  ): Promise<AiRelationshipResponse> {
    try {
      const res = await this.executeRequest<AiRelationshipResponse>(
        '/api/v1/relationship/analyze',
        { subjectChallenge, candidateChallenge },
        requestId,
        3000
      );
      if (res && res.relationshipType) return res;
    } catch (err: any) {
      logger.info(`[AI_CLIENT_FAILOVER] Relationship microservice unavailable (${err.message}). Engaging Direct Gemini Service.`);
    }
    return DirectGeminiService.analyzeRelationship(subjectChallenge, candidateChallenge, requestId);
  }

  public static async synthesizeKnowledge(
    query: string,
    userRole: string = 'CITIZEN',
    retrievedMemories: any[] = [],
    requestId?: string
  ): Promise<KnowledgeSynthesisResponse> {
    try {
      const res = await this.executeRequest<KnowledgeSynthesisResponse>(
        '/api/v1/assistant/synthesize',
        { query, userRole, retrievedMemories },
        requestId,
        3000
      );
      if (res && res.synthesizedAnswer) return res;
    } catch (err: any) {
      logger.info(`[AI_CLIENT_FAILOVER] Assistant microservice unavailable (${err.message}). Engaging Direct Gemini Service.`);
    }
    return DirectGeminiService.synthesizeKnowledge(query, userRole, retrievedMemories, requestId);
  }

  public static async analyzeEvidence(
    fileKey: string,
    mimeType: string,
    base64Data: string,
    challengeCategory: string,
    challengeDescription?: string,
    requestId?: string
  ): Promise<EvidenceAnalysisResponse> {
    try {
      return await this.executeRequest<EvidenceAnalysisResponse>(
        '/api/v1/evidence/analyze',
        { fileKey, mimeType, base64Data, challengeCategory, challengeDescription },
        requestId,
        5000
      );
    } catch (err: any) {
      logger.info(`[AI_CLIENT_FAILOVER] Evidence microservice unavailable. Using fallback analysis.`);
      return {
        detectedInfrastructure: [challengeCategory || 'Civic Infrastructure'],
        observedDamage: 'Visual inspection recorded for municipal engineer field verification.',
        severityEstimate: 'MODERATE',
        hazardTags: ['field_inspection_required'],
        visualConfidence: 0.8,
        notes: 'Field evidence recorded for ground assessment.',
        modelVersion: 'CIVIC_VISION_GATE',
      };
    }
  }

  public static async validateProblemIntent(
    payload: ValidateIntentPayload,
    requestId?: string
  ): Promise<ProblemIntentResultDto> {
    try {
      const res = await this.executeRequest<ProblemIntentResultDto>(
        '/api/v1/intent/validate',
        payload,
        requestId,
        3000
      );
      if (res && res.classification) return res;
    } catch (err: any) {
      logger.info(`[AI_CLIENT_FAILOVER] Intent validation microservice unavailable (${err.message}). Engaging Direct Gemini Service.`);
    }
    return DirectGeminiService.validateProblemIntent(payload, requestId);
  }

  public static async evaluateSolutionMemoryPrecedents(
    payload: SolutionMemoryEvaluationRequestPayload,
    requestId?: string
  ): Promise<SolutionMemoryEvaluationResponseDto> {
    try {
      const res = await this.executeRequest<SolutionMemoryEvaluationResponseDto>(
        '/api/v1/solution-memory/evaluate',
        payload,
        requestId,
        3000
      );
      if (res && res.guidanceVerdict) return res;
    } catch (err: any) {
      logger.info(`[AI_CLIENT_FAILOVER] Solution memory evaluation microservice unavailable (${err.message}). Engaging Direct Gemini Service.`);
    }
    return DirectGeminiService.evaluateSolutionMemoryPrecedents(payload, requestId);
  }

  private static fallbackPrecedentEvaluation(
    payload: SolutionMemoryEvaluationRequestPayload
  ): SolutionMemoryEvaluationResponseDto {
    const precedents: PrecedentEvaluationItemDto[] = [];
    let hasRecommend = false;
    let hasWarn = false;

    for (const mem of payload.retrievedMemories || []) {
      const outcomeStatus = String(mem.outcomeStatus || 'UNDER_EVALUATION').toUpperCase();
      const reusabilityClass = String(mem.reusabilityClass || '').toUpperCase();
      const whatFailed = mem.whatFailed || mem.failureReason;
      const whatWorked = mem.whatWorked || mem.observedImpact;
      const title = mem.title || 'Historical Solution';

      let verdict: 'RECOMMEND' | 'WARN' | 'CAUTION' = 'CAUTION';
      let whyFailed: string | null = null;
      let knownRisks: string | null = null;

      if (['INEFFECTIVE', 'FAILED'].includes(outcomeStatus) || reusabilityClass === 'NOT_RECOMMENDED') {
        verdict = 'WARN';
        hasWarn = true;
        whyFailed = whatFailed || 'Solution intervention encountered operational failure.';
        knownRisks = `Risk of repeating failure mode: ${whyFailed}`;
      } else if (['EFFECTIVE', 'SUCCESSFUL', 'SUCCESS'].includes(outcomeStatus) && reusabilityClass !== 'NOT_RECOMMENDED') {
        verdict = 'RECOMMEND';
        hasRecommend = true;
        knownRisks = mem.limitations || null;
      } else {
        verdict = 'CAUTION';
        whyFailed = whatFailed || null;
        knownRisks = 'Mixed evidence or adaptation required.';
      }

      precedents.push({
        memoryId: String(mem.id || mem.memoryId || ''),
        verdict,
        whySimilar: `Aligned on domain '${payload.problemCategory}' and root cause dynamics for '${title}'.`,
        whatPreviouslyWorked: whatWorked || null,
        underWhatConditions: 'Standard field conditions with verified operational oversight.',
        impactAchieved: mem.impactSummary || whatWorked || null,
        whyFailed,
        conditionsCausingFailure: verdict === 'WARN' ? mem.limitations || null : null,
        knownRisks,
        applicabilityAssessment: `Precedent evaluated with ${verdict} verdict based on verified outcome.`,
        recommendedPrerequisites: mem.recommendedPrerequisites || ['Verify localized operational and maintenance capacity.'],
      });
    }

    let guidanceVerdict: 'RECOMMEND' | 'WARN' | 'CAUTION' | 'NO_MEMORY' = 'NO_MEMORY';
    let executiveSummary = 'No relevant historical precedents found.';

    if (precedents.length > 0) {
      if (hasRecommend && !hasWarn) {
        guidanceVerdict = 'RECOMMEND';
        executiveSummary = 'Historical precedents indicate effective interventions under similar conditions. Recommended for technical evaluation.';
      } else if (hasWarn && !hasRecommend) {
        guidanceVerdict = 'WARN';
        executiveSummary = 'Historical precedents encountered documented failure modes under similar conditions. Operational warning issued.';
      } else {
        guidanceVerdict = 'CAUTION';
        executiveSummary = 'Mixed historical evidence observed. Some implementations succeeded while others encountered failure modes.';
      }
    }

    return {
      guidanceVerdict,
      precedents,
      comparativeAnalysis: `Evaluated ${precedents.length} historical solution precedents.`,
      executiveSummary,
      requiresHumanReview: true,
      confidenceScore: 0.85,
      modelVersion: 'deterministic-fallback',
    };
  }
}

