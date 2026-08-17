import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    HF_TOKEN: str = ""
    USE_LOCAL_EMBEDDINGS: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"
    VECTOR_DB_PATH: str = "./vector_store"
    UPLOAD_DIR: str = "./uploads"

    # Go up one level from 'backend' to read the root .env file
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

settings = Settings()
