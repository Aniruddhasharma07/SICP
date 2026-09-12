from fastapi import APIRouter, HTTPException, status
from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    TranscriptionRequest,
    TranscriptionResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    KnowledgeSynthesisRequest,
    KnowledgeSynthesisResponse,
    EvidenceAnalysisRequest,
    EvidenceAnalysisResponse,
    SolutionMemoryEvaluationRequest,
    SolutionMemoryEvaluationResponse
)
from app.schemas.relationship import (
    RelationshipAnalysisRequest,
    RelationshipAnalysisResponse
)
from app.schemas.intent import (
    IntentValidationRequest,
    IntentValidationResponse
)
from app.services.gemini_adapter import GeminiAdapter, AiUnavailableException

router = APIRouter()

@router.post("/intent/validate", response_model=IntentValidationResponse)
async def validate_problem_intent(request: IntentValidationRequest):
    try:
        result = await GeminiAdapter.validate_problem_intent(request)
        return result
    except AiUnavailableException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AI_UNAVAILABLE",
                "message": str(e)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "AI_INTENT_VALIDATION_FAILED",
                "message": f"Intent validation failed: {str(e)}"
            }
        )

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_challenge(request: AnalysisRequest):
    try:
        result = await GeminiAdapter.analyze_challenge(request)
        return result
    except AiUnavailableException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AI_UNAVAILABLE",
                "message": str(e)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "AI_ANALYSIS_FAILED",
                "message": f"AI analysis failed: {str(e)}"
            }
        )

@router.post("/voice/transcribe", response_model=TranscriptionResponse)
async def transcribe_voice(request: TranscriptionRequest):
    try:
        result = await GeminiAdapter.transcribe_voice(request)
        return result
    except AiUnavailableException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AI_UNAVAILABLE",
                "message": str(e)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "VOICE_TRANSCRIPTION_FAILED",
                "message": f"Transcription failed: {str(e)}"
            }
        )

@router.post("/relationship/analyze", response_model=RelationshipAnalysisResponse)
async def analyze_relationship(request: RelationshipAnalysisRequest):
    try:
        result = await GeminiAdapter.analyze_relationship(request)
        return result
    except AiUnavailableException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AI_UNAVAILABLE",
                "message": str(e)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "AI_RELATIONSHIP_ANALYSIS_FAILED",
                "message": f"AI relationship analysis failed: {str(e)}"
            }
        )

@router.post("/embed", response_model=EmbeddingResponse)
async def generate_embedding(request: EmbeddingRequest):
    try:
        result = await GeminiAdapter.generate_embedding(request)
        return result
    except AiUnavailableException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AI_UNAVAILABLE",
                "message": str(e)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "AI_EMBEDDING_FAILED",
                "message": f"AI embedding generation failed: {str(e)}"
            }
        )

@router.post("/assistant/synthesize", response_model=KnowledgeSynthesisResponse)
async def synthesize_knowledge(request: KnowledgeSynthesisRequest):
    try:
        result = await GeminiAdapter.synthesize_knowledge_assistant(request)
        return result
    except AiUnavailableException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AI_UNAVAILABLE",
                "message": str(e)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "AI_ASSISTANT_SYNTHESIS_FAILED",
                "message": f"Knowledge synthesis failed: {str(e)}"
            }
        )

@router.post("/evidence/analyze", response_model=EvidenceAnalysisResponse)
async def analyze_evidence(request: EvidenceAnalysisRequest):
    try:
        result = await GeminiAdapter.analyze_evidence(request)
        return result
    except AiUnavailableException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AI_UNAVAILABLE",
                "message": str(e)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "AI_EVIDENCE_ANALYSIS_FAILED",
                "message": f"Evidence analysis failed: {str(e)}"
            }
        )

@router.post("/solution-memory/evaluate", response_model=SolutionMemoryEvaluationResponse)
async def evaluate_solution_memory(request: SolutionMemoryEvaluationRequest):
    try:
        result = await GeminiAdapter.evaluate_solution_memory_precedents(request)
        return result
    except AiUnavailableException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AI_UNAVAILABLE",
                "message": str(e)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "AI_SOLUTION_MEMORY_EVALUATION_FAILED",
                "message": f"Solution memory evaluation failed: {str(e)}"
            }
        )


