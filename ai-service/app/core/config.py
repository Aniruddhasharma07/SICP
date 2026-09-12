from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"
    DEFAULT_CONFIDENCE_THRESHOLD: float = 0.80
    HIGH_STAKES_CONFIDENCE_THRESHOLD: float = 0.90

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
