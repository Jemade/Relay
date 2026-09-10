from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import os


class Settings(BaseSettings):
    app_name: str = "RELAY AI Engine"
    app_version: str = "2.0.0"
    debug: bool = False

    database_url: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./relay.db")

    openai_api_key: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    anthropic_api_key: Optional[str] = os.getenv("ANTHROPIC_API_KEY", None)
    google_api_key: Optional[str] = os.getenv(
        "GOOGLE_API_KEY",
        os.getenv("GEMINI_API_KEY", None)
    )
    custom_api_base: Optional[str] = os.getenv("CUSTOM_API_BASE", os.getenv("OPENAI_BASE_URL", None))
    custom_model_name: Optional[str] = os.getenv("CUSTOM_MODEL_NAME", None)

    default_provider: str = os.getenv("DEFAULT_PROVIDER", "gemini")
    default_model: str = os.getenv("DEFAULT_MODEL", "models/gemini-3.6-flash")

    cors_origins: List[str] = ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
