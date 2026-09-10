from typing import TypedDict, List, Dict, Any, Optional
from backend.app.schemas.scorecard import FinalScorecardSchema


class GradingState(TypedDict):
    task_id: str
    thread_id: Optional[str]
    raw_transcript: str
    parsed_turns: List[Dict[str, str]]
    rubric_criteria: List[str]
    
    clarity_evaluation: Optional[Dict[str, Any]]
    actionability_evaluation: Optional[Dict[str, Any]]
    grounding_evaluation: Optional[Dict[str, Any]]
    
    final_scorecard: Optional[Dict[str, Any]]
    
    current_node: str
    status: str
    error: Optional[str]
