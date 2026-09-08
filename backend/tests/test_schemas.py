import pytest
from pydantic import ValidationError
from backend.app.schemas.scorecard import RubricItemGrade, SpecialistEvaluation, FinalScorecardSchema


def test_rubric_item_valid():
    item = RubricItemGrade(
        criterion="Signal-to-Noise",
        score=94.5,
        weight=1.2,
        strengths=["Succinct pacing"],
        weaknesses=[],
        reasoning="Exemplary focus."
    )
    assert item.score == 94.5
    assert item.criterion == "Signal-to-Noise"


def test_rubric_item_invalid_score():
    with pytest.raises(ValidationError):
        RubricItemGrade(
            criterion="Test",
            score=150.0,  # exceeds 100
            reasoning="Invalid"
        )


def test_final_scorecard_validation():
    scorecard = FinalScorecardSchema(
        overall_score=91.0,
        grade_letter="A-",
        headline="High Velocity · Grade A-",
        momentum_factor="High Velocity",
        calm_index=95.0,
        rubric_breakdown=[
            RubricItemGrade(criterion="Clarity", score=92.0, reasoning="Very clear")
        ],
        specialist_reviews=[
            SpecialistEvaluation(
                agent_role="Clarity Agent",
                composite_score=92.0,
                summary="Clear and concise."
            )
        ],
        recommended_next_steps=["Deploy immediately"]
    )
    assert scorecard.grade_letter == "A-"
    assert scorecard.momentum_factor == "High Velocity"
