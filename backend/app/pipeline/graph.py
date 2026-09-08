from langgraph.graph import StateGraph, START, END
from backend.app.pipeline.state import GradingState
from backend.app.pipeline.agents import (
    intake_node,
    clarity_agent_node,
    actionability_agent_node,
    grounding_agent_node,
    synthesizer_node,
)


def create_grading_graph():
    """Builds and compiles the multi-agent grading pipeline as an explicit LangGraph StateGraph."""
    workflow = StateGraph(GradingState)

    # Register nodes
    workflow.add_node("intake", intake_node)
    workflow.add_node("clarity_evaluator", clarity_agent_node)
    workflow.add_node("actionability_evaluator", actionability_agent_node)
    workflow.add_node("grounding_evaluator", grounding_agent_node)
    workflow.add_node("scorecard_synthesizer", synthesizer_node)

    # Transitions
    workflow.add_edge(START, "intake")
    workflow.add_edge("intake", "clarity_evaluator")
    workflow.add_edge("clarity_evaluator", "actionability_evaluator")
    workflow.add_edge("actionability_evaluator", "grounding_evaluator")
    workflow.add_edge("grounding_evaluator", "scorecard_synthesizer")
    workflow.add_edge("scorecard_synthesizer", END)

    return workflow.compile()


grading_pipeline = create_grading_graph()
