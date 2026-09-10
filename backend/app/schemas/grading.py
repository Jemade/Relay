from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from backend.app.schemas.scorecard import FinalScorecardSchema


class GradingTaskRequest(BaseModel):
    thread_id: Optional[str] = Field(None, description="ID of thread to evaluate")
    transcript_text: Optional[str] = Field(None, description="Explicit transcript or prompt to evaluate if no thread_id")
    custom_criteria: Optional[List[str]] = Field(None, description="Optional custom evaluation criteria")


class GradingTaskResponse(BaseModel):
    task_id: str
    thread_id: Optional[str] = None
    status: str
    created_at: datetime


class TaskStatusResponse(BaseModel):
    task_id: str
    thread_id: Optional[str] = None
    status: str
    current_node: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    scorecard: Optional[FinalScorecardSchema] = None
