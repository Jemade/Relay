import os
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, func, select

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.pipeline.llm_factory import LLMFactory
from backend.app.models.thread import Thread, Message
from backend.app.models.scorecard import Scorecard

router = APIRouter(prefix="/api", tags=["System & Health"])


class ApiKeysUpdate(BaseModel):
    api_key: Optional[str] = Field(None, description="Universal API key for any model provider")
    provider: Optional[str] = Field(None, description="Optional provider override")
    base_url: Optional[str] = Field(None, description="Optional custom base URL endpoint")
    model: Optional[str] = Field(None, description="Optional model identifier")
    openai_api_key: Optional[str] = Field(None, description="API Key")
    anthropic_api_key: Optional[str] = Field(None, description="API Key")
    google_api_key: Optional[str] = Field(None, description="API Key")


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    db_ok = False
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        print(f"DB health check error: {e}")

    live_llm_ready = LLMFactory.is_live_llm_ready()

    return {
        "status": "operational",
        "app": settings.app_name,
        "version": settings.app_version,
        "database": "connected" if db_ok else "disconnected",
        "database_url": settings.database_url.split("@")[-1] if "@" in settings.database_url else settings.database_url[:24] + "...",
        "llm_engine": {
            "live_llm_ready": live_llm_ready,
            "status": "operational" if live_llm_ready else "standby"
        },
        "pipeline": {
            "orchestration": "LangGraph StateGraph",
            "agents": ["intake", "clarity_evaluator", "actionability_evaluator", "grounding_evaluator", "scorecard_synthesizer"],
            "schema": "Pydantic v2 (FinalScorecardSchema)"
        }
    }


@router.get("/metrics")
async def get_real_metrics(db: AsyncSession = Depends(get_db)):
    """Derives actual usage and counts directly from the underlying database."""
    threads_count = (await db.execute(select(func.count(Thread.id)))).scalar() or 0
    messages_count = (await db.execute(select(func.count(Message.id)))).scalar() or 0
    total_tokens = (await db.execute(select(func.coalesce(func.sum(Message.token_count), 0)))).scalar() or 0
    scorecards_count = (await db.execute(select(func.count(Scorecard.id)))).scalar() or 0

    capacity_limit = 100000
    capacity_used_pct = round(min(100.0, (total_tokens / capacity_limit) * 100), 1)

    return {
        "threads_count": threads_count,
        "messages_count": messages_count,
        "total_tokens": total_tokens,
        "scorecards_count": scorecards_count,
        "capacity_limit": capacity_limit,
        "capacity_used_pct": capacity_used_pct
    }


@router.post("/settings/keys")
async def update_api_keys(payload: ApiKeysUpdate):
    """Dynamically activates live AI engine when API key is provided for any model."""
    key = payload.api_key.strip() if payload.api_key else None

    if payload.base_url:
        settings.custom_api_base = payload.base_url.strip()
        os.environ["CUSTOM_API_BASE"] = payload.base_url.strip()
        os.environ["OPENAI_BASE_URL"] = payload.base_url.strip()

    if payload.model:
        settings.custom_model_name = payload.model.strip()
        os.environ["CUSTOM_MODEL_NAME"] = payload.model.strip()

    if key:
        if payload.provider:
            prov = payload.provider.lower()
        elif key.startswith("sk-ant-"):
            prov = "anthropic"
        elif key.startswith("gsk_"):
            prov = "openai"
            if not settings.custom_api_base:
                settings.custom_api_base = "https://api.groq.com/openai/v1"
        elif key.startswith("sk-"):
            prov = "openai"
        elif key.startswith("AIza") or key.startswith("AQ."):
            prov = "gemini"
        else:
            prov = "openai" if (settings.custom_api_base or payload.base_url) else "gemini"

        if prov == "anthropic":
            settings.anthropic_api_key = key
            settings.default_provider = "anthropic"
            os.environ["ANTHROPIC_API_KEY"] = key
        elif prov == "openai":
            settings.openai_api_key = key
            settings.default_provider = "openai"
            os.environ["OPENAI_API_KEY"] = key
        else:
            settings.google_api_key = key
            settings.default_provider = "gemini"
            os.environ["GOOGLE_API_KEY"] = key
            os.environ["GEMINI_API_KEY"] = key

    if payload.openai_api_key:
        settings.openai_api_key = payload.openai_api_key
        settings.default_provider = "openai"
        os.environ["OPENAI_API_KEY"] = payload.openai_api_key
    if payload.anthropic_api_key:
        settings.anthropic_api_key = payload.anthropic_api_key
        settings.default_provider = "anthropic"
        os.environ["ANTHROPIC_API_KEY"] = payload.anthropic_api_key
    if payload.google_api_key:
        settings.google_api_key = payload.google_api_key
        settings.default_provider = "gemini"
        os.environ["GOOGLE_API_KEY"] = payload.google_api_key
        os.environ["GEMINI_API_KEY"] = payload.google_api_key

    ready = LLMFactory.is_live_llm_ready()
    return {
        "message": "AI key configured successfully",
        "live_llm_ready": ready
    }

