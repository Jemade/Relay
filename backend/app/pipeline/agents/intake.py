import json
from typing import Dict, Any, List
from backend.app.pipeline.state import GradingState


DEFAULT_RUBRIC_CRITERIA = [
    "Clarity & Signal-to-Noise",
    "Actionability & Momentum",
    "Calm Tone & Grounding",
    "Continuation Readiness"
]


async def intake_node(state: GradingState) -> Dict[str, Any]:
    """Parses raw conversation transcript, identifies turns, and sets initial evaluation rubric."""
    raw = state.get("raw_transcript", "")
    turns: List[Dict[str, str]] = []

    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            for msg in parsed:
                if isinstance(msg, dict):
                    role = msg.get("role", "unknown")
                    content = msg.get("content", "")
                    turns.append({"role": role, "content": content})
    except Exception:
        pass

    if not turns:
        lines = raw.strip().split("\n")
        current_role = "user"
        current_text: List[str] = []
        for line in lines:
            line_str = line.strip()
            if line_str.lower().startswith("you:") or line_str.lower().startswith("user:"):
                if current_text:
                    turns.append({"role": current_role, "content": "\n".join(current_text)})
                    current_text = []
                current_role = "user"
                current_text.append(line_str.split(":", 1)[1].strip())
            elif line_str.lower().startswith("relay:") or line_str.lower().startswith("assistant:"):
                if current_text:
                    turns.append({"role": current_role, "content": "\n".join(current_text)})
                    current_text = []
                current_role = "assistant"
                current_text.append(line_str.split(":", 1)[1].strip())
            else:
                current_text.append(line_str)
        if current_text:
            turns.append({"role": current_role, "content": "\n".join(current_text)})

    if not turns and raw.strip():
        turns.append({"role": "user", "content": raw.strip()})

    rubric = state.get("rubric_criteria") or DEFAULT_RUBRIC_CRITERIA

    return {
        "parsed_turns": turns,
        "rubric_criteria": rubric,
        "current_node": "intake",
        "status": "processing"
    }
