from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import datetime


class RubricItemGrade(BaseModel):
    criterion: str = Field(..., description="Name of rubric criterion (e.g., 'Clarity & Signal-to-Noise')")
    score: float = Field(..., ge=0.0, le=100.0, description="Score on 0-100 scale")
    weight: float = Field(default=1.0, ge=0.1, le=5.0, description="Weight multiplier")
    strengths: List[str] = Field(default_factory=list, description="Specific strengths identified")
    weaknesses: List[str] = Field(default_factory=list, description="Areas where friction or ambiguity was found")
    reasoning: str = Field(..., description="Evidence-backed reasoning for this score")


class SpecialistEvaluation(BaseModel):
    agent_role: str = Field(..., description="Role of the specialist agent (e.g., 'Clarity Agent')")
    composite_score: float = Field(..., ge=0.0, le=100.0, description="Specialist composite grade")
    summary: str = Field(..., description="High-level executive evaluation from this specialist")
    criteria: List[RubricItemGrade] = Field(default_factory=list, description="Detailed sub-criteria")
    signals_detected: List[str] = Field(default_factory=list, description="Key signals or notable patterns detected")


class FinalScorecardSchema(BaseModel):
    overall_score: float = Field(..., ge=0.0, le=100.0, description="Composite weighted grade from 0 to 100")
    grade_letter: Literal["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "D", "F"] = Field(
        ..., description="Standardized academic/enterprise grade letter"
    )
    headline: str = Field(..., description="One-line executive synthesis of the scorecard")
    momentum_factor: Literal["High Velocity", "Steady Flow", "Friction Detected", "Stalled"] = Field(
        ..., description="Momentum state assessment"
    )
    calm_index: float = Field(
        default=92.0, ge=0.0, le=100.0, description="Calm and focus index (lack of synthetic noise/hype)"
    )
    rubric_breakdown: List[RubricItemGrade] = Field(..., description="Composite rubric scores across all dimensions")
    specialist_reviews: List[SpecialistEvaluation] = Field(..., description="Individual reports from each specialist agent")
    recommended_next_steps: List[str] = Field(..., description="Concrete, actionable recommendations for momentum")
    timestamp: Optional[datetime] = None
