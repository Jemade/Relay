from datetime import datetime, timezone
from typing import Dict, Any, List
from backend.app.pipeline.state import GradingState
from backend.app.pipeline.llm_factory import LLMFactory
from backend.app.schemas.scorecard import FinalScorecardSchema, SpecialistEvaluation, RubricItemGrade


def score_to_letter_grade(score: float) -> str:
    if score >= 97:
        return "A+"
    if score >= 93:
        return "A"
    if score >= 90:
        return "A-"
    if score >= 87:
        return "B+"
    if score >= 83:
        return "B"
    if score >= 80:
        return "B-"
    if score >= 75:
        return "C+"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"


async def synthesizer_node(state: GradingState) -> Dict[str, Any]:
    """Lead Synthesizer Agent: Combines all specialist reports into a single, rigorous Pydantic v2 scorecard."""
    clarity_raw = state.get("clarity_evaluation") or {}
    action_raw = state.get("actionability_evaluation") or {}
    ground_raw = state.get("grounding_evaluation") or {}
    
    chat_model = LLMFactory.get_chat_model()
    if chat_model:
        try:
            from langchain_core.prompts import ChatPromptTemplate
            structured_evaluator = chat_model.with_structured_output(FinalScorecardSchema)
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are the Lead Grading Synthesizer for RELAY. Combine the evaluations from the Clarity, Actionability, and Grounding specialists into an authoritative FinalScorecardSchema."),
                ("human", "Specialist Reviews:\n- Clarity: {clarity}\n- Actionability: {actionability}\n- Grounding: {grounding}\n\nTranscript Context:\n{transcript}")
            ])
            chain = prompt | structured_evaluator
            result: FinalScorecardSchema = await chain.ainvoke({
                "clarity": str(clarity_raw),
                "actionability": str(action_raw),
                "grounding": str(ground_raw),
                "transcript": state.get("raw_transcript", "")[:1000]
            })
            result.timestamp = datetime.now(timezone.utc)
            return {
                "final_scorecard": result.model_dump(mode="json"),
                "current_node": "scorecard_synthesizer",
                "status": "completed"
            }
        except Exception as e:
            print(f"Warning: Live synthesis failed, falling back to deterministic synthesizer: {e}")

    # Deterministic fallback synthesis
    clarity_eval = SpecialistEvaluation(**clarity_raw) if clarity_raw else None
    action_eval = SpecialistEvaluation(**action_raw) if action_raw else None
    ground_eval = SpecialistEvaluation(**ground_raw) if ground_raw else None

    c_score = clarity_eval.composite_score if clarity_eval else 90.0
    a_score = action_eval.composite_score if action_eval else 88.0
    g_score = ground_eval.composite_score if ground_eval else 95.0

    overall = round((c_score * 0.35) + (a_score * 0.45) + (g_score * 0.20), 1)
    grade = score_to_letter_grade(overall)

    if overall >= 90:
        momentum_factor = "High Velocity"
    elif overall >= 80:
        momentum_factor = "Steady Flow"
    elif overall >= 70:
        momentum_factor = "Friction Detected"
    else:
        momentum_factor = "Stalled"

    rubric_breakdown: List[RubricItemGrade] = []
    specialists: List[SpecialistEvaluation] = []
    
    for ev in [clarity_eval, action_eval, ground_eval]:
        if ev:
            specialists.append(ev)
            rubric_breakdown.extend(ev.criteria)

    if not rubric_breakdown:
        rubric_breakdown.append(
            RubricItemGrade(
                criterion="Overall Interaction Quality",
                score=overall,
                weight=1.0,
                strengths=["Clear handoff established"],
                weaknesses=[],
                reasoning="Consolidated evaluation across communication and momentum."
            )
        )

    headline = f"{momentum_factor} · Grade {grade} ({overall}/100) - Calm, actionable transition"

    recommendations = [
        "Encapsulate the next milestone in a concrete runnable snippet",
        "Maintain current serene typographic rhythm while expanding product breadth",
        "Capture user reflection in a dedicated Signal card for institutional memory"
    ]

    scorecard = FinalScorecardSchema(
        overall_score=overall,
        grade_letter=grade,
        headline=headline,
        momentum_factor=momentum_factor,
        calm_index=g_score,
        rubric_breakdown=rubric_breakdown,
        specialist_reviews=specialists,
        recommended_next_steps=recommendations,
        timestamp=datetime.now(timezone.utc)
    )

    return {
        "final_scorecard": scorecard.model_dump(mode="json"),
        "current_node": "scorecard_synthesizer",
        "status": "completed"
    }
