import os
import re
from typing import Optional, Any
from backend.app.config import settings


class LLMFactory:
    @classmethod
    def is_live_llm_ready(cls) -> bool:
        return bool(
            (settings.google_api_key and settings.google_api_key.strip()) or
            (settings.openai_api_key and settings.openai_api_key.strip()) or
            (settings.anthropic_api_key and settings.anthropic_api_key.strip())
        )

    @classmethod
    def get_chat_model(cls):
        """Returns configured live LangChain chat model for any active provider."""
        provider = (settings.default_provider or "").lower()
        custom_base = settings.custom_api_base or os.getenv("OPENAI_BASE_URL", None)
        custom_model = settings.custom_model_name

        # Provider routing and fallback
        if custom_base and (settings.openai_api_key or settings.google_api_key):
            try:
                from langchain_openai import ChatOpenAI
                return ChatOpenAI(
                    api_key=settings.openai_api_key or "sk-dummy-custom",
                    base_url=custom_base,
                    model=custom_model or os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                    temperature=0.3
                )
            except Exception as e:
                print(f"Warning: Failed to instantiate custom ChatOpenAI: {e}")

        if (provider == "anthropic" or (not settings.google_api_key and not settings.openai_api_key)) and settings.anthropic_api_key:
            try:
                from langchain_anthropic import ChatAnthropic
                return ChatAnthropic(
                    api_key=settings.anthropic_api_key,
                    model=custom_model or os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"),
                    temperature=0.3
                )
            except Exception as e:
                print(f"Warning: Failed to instantiate ChatAnthropic: {e}")

        if (provider == "openai" or not settings.google_api_key) and settings.openai_api_key:
            try:
                from langchain_openai import ChatOpenAI
                return ChatOpenAI(
                    api_key=settings.openai_api_key,
                    base_url=custom_base,
                    model=custom_model or os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                    temperature=0.3
                )
            except Exception as e:
                print(f"Warning: Failed to instantiate ChatOpenAI: {e}")

        if settings.google_api_key:
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                return ChatGoogleGenerativeAI(
                    model=custom_model or settings.default_model or "models/gemini-3.6-flash",
                    google_api_key=settings.google_api_key,
                    temperature=0.3,
                    max_retries=1
                )
            except Exception as e:
                print(f"Warning: Failed to instantiate ChatGoogleGenerativeAI: {e}")

        if settings.anthropic_api_key:
            try:
                from langchain_anthropic import ChatAnthropic
                return ChatAnthropic(
                    api_key=settings.anthropic_api_key,
                    model=custom_model or os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"),
                    temperature=0.3
                )
            except Exception:
                pass

        if settings.openai_api_key:
            try:
                from langchain_openai import ChatOpenAI
                return ChatOpenAI(
                    api_key=settings.openai_api_key,
                    base_url=custom_base,
                    model=custom_model or os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                    temperature=0.3
                )
            except Exception:
                pass

        return None



def extract_text_from_ai_response(content: Any) -> str:
    """Safely extracts plain string text from diverse LangChain message content formats."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and "text" in item:
                parts.append(item["text"])
        return "".join(parts)
    return str(content)


def calculate_lexical_metrics(text: str) -> dict:
    """Helper to compute deterministic readability & tone metrics."""
    words = re.findall(r"\b\w+\b", text.lower())
    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]

    word_count = len(words)
    sentence_count = max(len(sentences), 1)
    avg_sentence_len = word_count / sentence_count

    momentum_keywords = {"next", "step", "clarify", "build", "create", "ship", "implement", "handoff", "run", "execute", "focus", "direction", "prioritize", "start"}
    calm_keywords = {"calm", "quiet", "simple", "focused", "human", "legible", "clear", "balance", "pace", "steady", "clean"}
    hype_keywords = {"revolutionary", "game-changer", "hyper-scale", "10x", "synergy", "paradigm", "insane", "magic"}

    momentum_matches = sum(1 for w in words if w in momentum_keywords)
    calm_matches = sum(1 for w in words if w in calm_keywords)
    hype_matches = sum(1 for w in words if w in hype_keywords)

    return {
        "word_count": word_count,
        "sentence_count": sentence_count,
        "avg_sentence_len": avg_sentence_len,
        "momentum_density": min(100.0, (momentum_matches / max(word_count, 1)) * 500),
        "calm_score": max(50.0, min(99.0, 95.0 + (calm_matches * 2) - (hype_matches * 10))),
        "clarity_score": max(60.0, min(98.0, 94.0 - abs(avg_sentence_len - 14) * 1.5))
    }
