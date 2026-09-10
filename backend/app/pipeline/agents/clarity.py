from typing import Dict, Any
from backend.app.pipeline.state import GradingState
from backend.app.pipeline.llm_factory import LLMFactory, calculate_lexical_metrics
from backend.app.schemas.scorecard import SpecialistEvaluation, RubricItemGrade


async def clarity_agent_node(state: GradingState) -> Dict[str, Any]:
    """Clarity Specialist Agent: Grades structural hierarchy, conciseness, and legibility."""
    transcript = state.get("raw_transcript", "")
    metrics = calculate_lexical_metrics(transcript)
    
    chat_model = LLMFactory.get_chat_model()
    if chat_model:
        try:
            from langchain_core.prompts import ChatPromptTemplate
            structured_evaluator = chat_model.with_structured_output(SpecialistEvaluation)
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are the Clarity Specialist Agent for RELAY. Evaluate structural hierarchy, signal-to-noise ratio, and legibility. Return a structured SpecialistEvaluation."),
                ("human", "Conversation Transcript to evaluate for Clarity:\n\n{transcript}")
            ])
            chain = prompt | structured_evaluator
            result = await chain.ainvoke({"transcript": transcript})
            return {
                "clarity_evaluation": result.model_dump(),
                "current_node": "clarity_evaluator"
            }
        except Exception as e:
            print(f"Warning: Live clarity evaluation failed, falling back to deterministic evaluator: {e}")

    clarity_score = round(metrics["clarity_score"], 1)
    has_numbered_list = "1." in transcript or "2." in transcript
    has_bullets = "- " in transcript or "* " in transcript
    has_emphasis = "**" in transcript or "<em>" in transcript

    strengths = []
    if has_numbered_list or has_bullets:
        strengths.append("Crisp structural separation using sequential bullet points")
    if has_emphasis:
        strengths.append("Effective typographic emphasis highlighting primary principles")
    if metrics["avg_sentence_len"] <= 18:
        strengths.append("High sentence legibility with concise syntactic cadences")

    weaknesses = []
    if metrics["word_count"] > 350:
        weaknesses.append("Slight density overhead; consider condensing secondary explanations")
    if not strengths:
        strengths.append("Direct, unpretentious communication style")

    evaluation = SpecialistEvaluation(
        agent_role="Clarity Specialist Agent",
        composite_score=clarity_score,
        summary="Communication exhibits high signal density with clean typographical hierarchy and minimal noise.",
        criteria=[
            RubricItemGrade(
                criterion="Clarity & Signal-to-Noise",
                score=clarity_score,
                weight=1.2,
                strengths=strengths,
                weaknesses=weaknesses,
                reasoning=f"Analyzed {metrics['word_count']} tokens across {metrics['sentence_count']} sentences. Structural pacing is legible and accessible."
            )
        ],
        signals_detected=["Calm cadence", "Clear typographic accents", "Readable sentence length"]
    )

    return {
        "clarity_evaluation": evaluation.model_dump(),
        "current_node": "clarity_evaluator"
    }
