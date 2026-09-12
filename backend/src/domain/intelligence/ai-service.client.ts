import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { AiUnavailableError } from '../../utils/errors';
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

export class AiServiceClient {
  private static get baseUrl(): string {
    return env.AI_SERVICE_URL.replace(/\/+$/, '');
  }

  private static async executeRequest<T>(
    endpoint: string,
    body: unknown,
    requestId?: string,
    timeoutMs: number = 20000
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
        if (response.status === 503) {
          const errBody = (await response.json().catch(() => ({}))) as { detail?: { code?: string; message?: string } };
          const msg = errBody.detail?.message || 'AI service is currently unavailable or unconfigured.';
          throw new AiUnavailableError(msg);
        }
        const errJson = await response.json().catch(() => ({}));
        throw new Error((errJson as any)?.detail?.message || `AI service returned status ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if (err instanceof AiUnavailableError) {
        throw err;
      }
      logger.warn(`[AI_SERVICE_UNREACHABLE] Endpoint ${endpoint}: ${(err as Error).message}`, { requestId });
      throw new AiUnavailableError(`AI service request failed: ${(err as Error).message}`);
    }
  }

  public static async analyzeChallenge(
    data: ChallengeAnalysisPayload,
    requestId?: string
  ): Promise<AiAnalysisResponse> {
    return this.executeRequest<AiAnalysisResponse>('/api/v1/analyze', data, requestId);
  }

  public static async transcribeVoice(
    audioData: string,
    languagePreference: string = 'en-IN',
    mimeType: string = 'audio/webm',
    requestId?: string
  ): Promise<VoiceTranscriptionResponse> {
    return this.executeRequest<VoiceTranscriptionResponse>(
      '/api/v1/voice/transcribe',
      { audioData, languagePreference, mimeType },
      requestId
    );
  }

  public static async generateEmbedding(
    text: string,
    dimensions: number = 768,
    requestId?: string
  ): Promise<EmbeddingResponse> {
    return this.executeRequest<EmbeddingResponse>(
      '/api/v1/embed',
      { text, dimensions },
      requestId
    );
  }

  public static async analyzeRelationship(
    subjectChallenge: ChallengeRelationshipContext,
    candidateChallenge: ChallengeRelationshipContext,
    requestId?: string
  ): Promise<AiRelationshipResponse> {
    return this.executeRequest<AiRelationshipResponse>(
      '/api/v1/relationship/analyze',
      { subjectChallenge, candidateChallenge },
      requestId
    );
  }

  public static async synthesizeKnowledge(
    query: string,
    userRole: string = 'CITIZEN',
    retrievedMemories: any[] = [],
    requestId?: string
  ): Promise<KnowledgeSynthesisResponse> {
    return this.executeRequest<KnowledgeSynthesisResponse>(
      '/api/v1/assistant/synthesize',
      { query, userRole, retrievedMemories },
      requestId
    );
  }

  public static async analyzeEvidence(
    fileKey: string,
    mimeType: string,
    base64Data: string,
    challengeCategory: string,
    challengeDescription?: string,
    requestId?: string
  ): Promise<EvidenceAnalysisResponse> {
    return this.executeRequest<EvidenceAnalysisResponse>(
      '/api/v1/evidence/analyze',
      { fileKey, mimeType, base64Data, challengeCategory, challengeDescription },
      requestId
    );
  }

  public static async validateProblemIntent(
    payload: ValidateIntentPayload,
    requestId?: string
  ): Promise<ProblemIntentResultDto> {
    return this.executeRequest<ProblemIntentResultDto>(
      '/api/v1/intent/validate',
      payload,
      requestId
    );
  }
}

