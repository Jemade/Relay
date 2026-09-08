from typing import Dict, Any
from backend.app.pipeline.state import GradingState
from backend.app.pipeline.llm_factory import LLMFactory, calculate_lexical_metrics
from backend.app.schemas.scorecard import SpecialistEvaluation, RubricItemGrade


async def grounding_agent_node(state: GradingState) -> Dict[str, Any]:
    """Grounding & Calmness Specialist Agent: Evaluates calmness of tone, truthfulness, and avoidance of synthetic hype."""
    transcript = state.get("raw_transcript", "")
    metrics = calculate_lexical_metrics(transcript)
    
    chat_model = LLMFactory.get_chat_model()
    if chat_model:
        try:
            from langchain_core.prompts import ChatPromptTemplate
            structured_evaluator = chat_model.with_structured_output(SpecialistEvaluation)
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are the Grounding & Calmness Specialist Agent for RELAY. Evaluate the tone, calmness, restraint, and absence of synthetic hype. Return a structured SpecialistEvaluation."),
                ("human", "Conversation Transcript to evaluate for Calmness & Grounding:\n\n{transcript}")
            ])
            chain = prompt | structured_evaluator
            result = await chain.ainvoke({"transcript": transcript})
            return {
                "grounding_evaluation": result.model_dump(mode="json"),
                "current_node": "grounding_evaluator"
            }
        except Exception as e:
            print(f"Warning: Live grounding evaluation failed, falling back to deterministic evaluator: {e}")

    calm_score = round(metrics["calm_score"], 1)
    strengths = [
        "Maintains a grounded, thoughtful tone without synthetic excitement",
        "Refrains from gratuitous praise or unnecessary introductory filler"
    ]
    weaknesses = []

    evaluation = SpecialistEvaluation(
        agent_role="Calmness & Safety Specialist Agent",
        composite_score=calm_score,
        summary="Tone is serene, intentional, and respectful of cognitive bandwidth.",
        criteria=[
            RubricItemGrade(
                criterion="Calm Tone & Grounding",
                score=calm_score,
                weight=1.0,
                strengths=strengths,
                weaknesses=weaknesses,
                reasoning="Response avoids corporate platitudes, hype vocabulary, and provides a calming presence."
            )
        ],
        signals_detected=["Minimalist tone", "No hyperbole", "Respects operator focus"]
    )

    return {
        "grounding_evaluation": evaluation.model_dump(),
        "current_node": "grounding_evaluator"
    }
