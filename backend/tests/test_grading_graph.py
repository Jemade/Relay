import pytest
from backend.app.pipeline.graph import grading_pipeline
from backend.app.schemas.scorecard import FinalScorecardSchema


@pytest.mark.asyncio
async def test_langgraph_pipeline_execution():
    initial_state = {
        "task_id": "test-task-123",
        "thread_id": "thread-abc",
        "raw_transcript": "User: How do we simplify the handoff?\nRelay: 1. Keep it legible.\n2. Give momentum back.",
        "parsed_turns": [],
        "rubric_criteria": [],
        "clarity_evaluation": None,
        "actionability_evaluation": None,
        "grounding_evaluation": None,
        "final_scorecard": None,
        "current_node": "",
        "status": "queued",
        "error": None
    }

    result = await grading_pipeline.ainvoke(initial_state)

    assert result["status"] == "completed"
    assert result["current_node"] == "scorecard_synthesizer"
    assert result["final_scorecard"] is not None
    
    scorecard = FinalScorecardSchema.model_validate(result["final_scorecard"])
    assert 0.0 <= scorecard.overall_score <= 100.0
    assert scorecard.grade_letter in ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "D", "F"]
    assert len(scorecard.specialist_reviews) >= 3
