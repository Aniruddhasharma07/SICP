from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ChallengeEntitySchema(BaseModel):
    id: str
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=5)
    category: str
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    rootCause: Optional[str] = None
    severity: Optional[str] = "MODERATE"
    durationMonths: Optional[int] = None
    evidenceCount: Optional[int] = 0

class RelationshipAnalysisRequest(BaseModel):
    subjectChallenge: ChallengeEntitySchema
    candidateChallenge: ChallengeEntitySchema
    candidateTypePreference: Optional[str] = None

class RelationshipAnalysisResponse(BaseModel):
    relationshipType: str = Field(
        ...,
        description="One of: DUPLICATE, RELATED, SYSTEMIC_ROOT_CAUSE, RECURRING, INDEPENDENT"
    )
    confidenceScore: float = Field(..., ge=0.0, le=1.0)
    problemSimilarity: float = Field(..., ge=0.0, le=100.0)
    rootCauseSimilarity: float = Field(..., ge=0.0, le=100.0)
    geographicRelationship: float = Field(..., ge=0.0, le=100.0)
    infrastructureRelationship: float = Field(..., ge=0.0, le=100.0)
    temporalRelationship: float = Field(..., ge=0.0, le=100.0)
    evidenceConsistency: float = Field(..., ge=0.0, le=100.0)
    explanation: str
    sharedInfrastructure: Optional[str] = None
    recommendedAction: str
    requiresHumanReview: bool
    limitations: Optional[str] = "AI relationship estimation based on semantic text and available spatial metadata. Final consolidation requires human officer authorization."
    modelVersion: str = "gemini-1.5-pro-preview"
