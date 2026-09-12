from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.endpoints import router as v1_router

app = FastAPI(
    title="SICP AI Service",
    version="1.0.0",
    description="FastAPI Service providing structured AI problem analysis with Gemini guardrails"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "UP",
        "service": "sicp-ai-service",
        "environment": settings.ENVIRONMENT,
        "geminiConfigured": bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY.strip()) > 0)
    }

app.include_router(v1_router, prefix="/api/v1")
