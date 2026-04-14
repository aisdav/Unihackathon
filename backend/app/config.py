from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    openai_api_key: str = ""
    database_url: str = "postgresql+asyncpg://tzanalyzer:tzpassword@localhost:5432/tzanalyzer"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    chroma_path: str = "./chroma_data"
    data_path: str = "./data"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
