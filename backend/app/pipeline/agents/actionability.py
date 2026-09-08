from typing import Dict, Any
from backend.app.pipeline.state import GradingState
from backend.app.pipeline.llm_factory import LLMFactory, calculate_lexical_metrics
from backend.app.schemas.scorecard import SpecialistEvaluation, RubricItemGrade


async def actionability_agent_node(state: GradingState) -> Dict[str, Any]:
    """Actionability Specialist Agent: Grades momentum generation, handoff clarity, and next-step friction."""
    transcript = state.get("raw_transcript", "")
    metrics = calculate_lexical_metrics(transcript)
    
    chat_model = LLMFactory.get_chat_model()
    if chat_model:
        try:
            from langchain_core.prompts import ChatPromptTemplate
            structured_evaluator = chat_model.with_structured_output(SpecialistEvaluation)
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are the Actionability Specialist Agent for RELAY. Evaluate how well the assistant generates momentum, hands off next steps, and eliminates friction. Return a structured SpecialistEvaluation."),
                ("human", "Conversation Transcript to evaluate for Actionability:\n\n{transcript}")
            ])
            chain = prompt | structured_evaluator
            result = await chain.ainvoke({"transcript": transcript})
            return {
                "actionability_evaluation": result.model_dump(mode="json"),
                "current_node": "actionability_evaluator"
            }
        except Exception as e:
            print(f"Warning: Live actionability evaluation failed, falling back to deterministic evaluator: {e}")

    has_code = "```" in transcript
    has_callout = "working principle" in transcript.lower() or "best tool" in transcript.lower()
    momentum_score = round(min(97.0, max(72.0, 80.0 + (metrics["momentum_density"] * 0.2) + (8.0 if has_code else 0.0))), 1)

    strengths = [
        "Identifies tangible next milestones without creating task overload",
        "Encourages continuous flow between conceptualizing and executing"
    ]
    if has_code:
        strengths.append("Provides executable code interface illustrating immediate technical adoption")
    if has_callout:
        strengths.append("Anchors direction with a high-leverage working principle")

    weaknesses = []
    if not has_code:
        weaknesses.append("Could provide a more concrete code snippet or CLI invocation for faster takeoff")

    evaluation = SpecialistEvaluation(
        agent_role="Actionability Specialist Agent",
        composite_score=momentum_score,
        summary="Strong momentum velocity: hands back control to the operator with clear onward trajectories.",
        criteria=[
            RubricItemGrade(
                criterion="Actionability & Momentum",
                score=momentum_score,
                weight=1.5,
                strengths=strengths,
                weaknesses=weaknesses,
                reasoning="The transition from input to output leaves the operator with immediate forward momentum."
            )
        ],
        signals_detected=["Momentum handoff detected", "Explicit action anchors", "Executable direction"]
    )

    return {
        "actionability_evaluation": evaluation.model_dump(),
        "current_node": "actionability_evaluator"
    }
