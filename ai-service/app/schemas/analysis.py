from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class AnalysisRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=250)
    description: Optional[str] = Field(default="", description="Citizen text description")
    category: Optional[str] = Field(default="Infrastructure")
    district: Optional[str] = None
    state: Optional[str] = None
    affectedPopulation: Optional[int] = None
    durationMonths: Optional[int] = None
    transcribedAudio: Optional[str] = Field(default=None, description="Transcribed voice testimony")
    audioData: Optional[str] = Field(default=None, description="Base64 encoded audio bytes")
    audioMimeType: Optional[str] = Field(default="audio/webm", description="MIME type of recorded audio (e.g. audio/webm, audio/mp3, audio/wav)")
    images: Optional[List[Any]] = Field(default_factory=list, description="Base64 encoded images or {data, mimeType}")
    videoKeyframes: Optional[List[Any]] = Field(default_factory=list, description="Extracted video keyframes")
    documents: Optional[List[Any]] = Field(default_factory=list, description="Document excerpts or {name, text, mimeType}")
    modalitiesProvided: Optional[List[str]] = Field(default_factory=list, description="Explicit list of modalities submitted")

class SeverityBreakdown(BaseModel):
    riskLevel: str = "MODERATE"
    urgencyLevel: str = "MEDIUM"
    serviceDisruption: str = "Local access impacted"
    environmentalImpact: str = "Low to moderate"
    vulnerabilityScore: float = 0.5

class PrimaryProblem(BaseModel):
    domain: str = "Infrastructure"
    category: str = "Road Infrastructure"
    problemType: str = "ROAD_USAGE"
    normalizedStatement: str = ""
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)

class ProblemObservation(BaseModel):
    description: str
    evidenceSource: str = "TEXT"
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)

class ContributingFactor(BaseModel):
    factor: str
    evidence: str = ""
    confidence: float = Field(default=0.80, ge=0.0, le=1.0)
    status: str = "AI_HYPOTHESIS"

class RootCauseHypothesisItem(BaseModel):
    cause: str
    reasoning: str = ""
    supportingEvidence: str = ""
    confidence: float = Field(default=0.75, ge=0.0, le=1.0)
    validationStatus: str = "AI_HYPOTHESIS"

class SeverityRecommendation(BaseModel):
    level: str = "MODERATE"
    reasoning: str = ""
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)

class ImpactAssessment(BaseModel):
    affectedGroups: List[str] = Field(default_factory=list)
    affectedAssets: List[str] = Field(default_factory=list)
    geographicScope: str = "LOCAL"
    estimatedScale: int = 100
    basis: str = "ESTIMATED"
    confidence: float = Field(default=0.80, ge=0.0, le=1.0)
    dataLimitations: str = "Preliminary assessment based on citizen narrative and multimodal evidence."

class EvidenceAssessment(BaseModel):
    availableEvidence: List[str] = Field(default_factory=list)
    limitations: str = "Preliminary self-reported citizen evidence."
    evidenceQuality: str = "MODERATE"

class FieldConfidenceBreakdown(BaseModel):
    categoryConfidence: float = 0.90
    problemTypeConfidence: float = 0.85
    severityConfidence: float = 0.85
    impactConfidence: float = 0.80
    rootCauseConfidence: float = 0.75
    duplicateConfidence: float = 0.70
    systemicConfidence: float = 0.72

class AnalysisResponse(BaseModel):
    # Core domain separation models
    primaryProblem: Optional[PrimaryProblem] = None
    observations: List[ProblemObservation] = Field(default_factory=list)
    contributingFactors: List[ContributingFactor] = Field(default_factory=list)
    rootCauseHypothesesItems: List[RootCauseHypothesisItem] = Field(default_factory=list)
    severityRecommendation: Optional[SeverityRecommendation] = None
    impactAssessment: Optional[ImpactAssessment] = None
    missingInformation: List[str] = Field(default_factory=list)
    evidenceAssessment: Optional[EvidenceAssessment] = None
    fieldConfidences: Optional[FieldConfidenceBreakdown] = None

    # Backward-compatible fields
    category: str
    subcategory: str = "General"
    problemUnderstanding: str = ""
    problemType: str = "UNKNOWN"
    normalizedStatement: str = ""
    entities: List[str] = []
    estimatedSeverity: str
    preliminaryPriority: str
    priorityScore: float = Field(default=50.0, ge=0.0, le=100.0)
    severityBreakdown: SeverityBreakdown = Field(default_factory=SeverityBreakdown)
    rootCauseHypotheses: List[str] = []
    systemicIndicators: List[str] = []
    duplicateKeywords: List[str] = []
    confidenceScore: float = Field(..., ge=0.0, le=1.0)
    reasoningSummary: str
    evidenceSummary: Dict[str, Any] = Field(default_factory=dict)
    modalitiesAnalyzed: List[str] = Field(default_factory=list)
    impactEstimate: Dict[str, Any] = Field(default_factory=dict)
    requiresHumanReview: bool = False
    dataLimitations: str = "Preliminary assessment based solely on citizen-submitted narrative and local context."
    appliedRules: List[str] = []
    aiProvider: str = "GEMINI"

class TranscriptionRequest(BaseModel):
    audioData: str = Field(..., description="Base64 encoded audio bytes or data URI")
    languagePreference: Optional[str] = "en-IN"
    mimeType: Optional[str] = Field(default="audio/webm", description="MIME type of recorded audio (e.g. audio/webm, audio/mp3)")

class TranscriptionResponse(BaseModel):
    transcribedText: str
    detectedLanguage: str = "en"
    confidenceScore: float = 0.90

class EmbeddingRequest(BaseModel):
    text: str = Field(..., min_length=3, description="Text string to generate dense vector representation for")
    dimensions: Optional[int] = Field(default=768, description="Output dimensionality for pgvector")

class EmbeddingResponse(BaseModel):
    embedding: List[float] = Field(..., description="768-dimensional dense float vector")
    model: str = "text-embedding-004"
    dimensions: int = 768

class KnowledgeSynthesisRequest(BaseModel):
    query: str = Field(..., min_length=3)
    userRole: Optional[str] = "CITIZEN"
    retrievedMemories: List[Dict[str, Any]] = Field(default_factory=list)

class KnowledgeSynthesisResponse(BaseModel):
    synthesizedAnswer: str
    keyFindings: List[str] = Field(default_factory=list)
    precedentWarnings: List[str] = Field(default_factory=list)
    suggestedFollowUps: List[str] = Field(default_factory=list)
    confidenceScore: float = Field(default=0.85, ge=0.0, le=1.0)
    limitations: str = "Synthesized exclusively from verified institutional records in SICP Solution Memory."
    modelVersion: str = "gemini-1.5-flash"

class EvidenceAnalysisRequest(BaseModel):
    fileKey: str
    mimeType: str = "image/jpeg"
    base64Data: str = Field(..., description="Base64 encoded image data")
    challengeCategory: str
    challengeDescription: Optional[str] = ""

class EvidenceAnalysisResponse(BaseModel):
    detectedInfrastructure: List[str] = Field(default_factory=list)
    observedDamage: str
    severityEstimate: str = "MODERATE"
    hazardTags: List[str] = Field(default_factory=list)
    visualConfidence: float = Field(default=0.80, ge=0.0, le=1.0)
    notes: str = "Visual inspection preliminary finding. Physical municipal site inspection required."
    modelVersion: str = "gemini-1.5-flash"

