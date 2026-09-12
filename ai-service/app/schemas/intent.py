from pydantic import BaseModel, Field
from typing import List, Optional

class IntentSignals(BaseModel):
    meaningfulLanguage: bool = Field(default=True)
    societalContext: bool = Field(default=False)
    problemStatement: bool = Field(default=False)
    affectedPopulation: bool = Field(default=False)
    locationContext: bool = Field(default=False)
    actionableIssue: bool = Field(default=False)

class IntentValidationRequest(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    category: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    languageHint: Optional[str] = None

class IntentValidationResponse(BaseModel):
    classification: str
    confidence: float = Field(ge=0.0, le=1.0)
    problemIntent: bool
    qualityScore: float = Field(ge=0.0, le=1.0)
    reason: str
    missingContext: List[str] = Field(default_factory=list)
    signals: IntentSignals
    suggestedClarification: Optional[str] = None
    validationMode: str = "ai"
    nextAction: str
