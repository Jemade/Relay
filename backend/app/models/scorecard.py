import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Scorecard(Base):
    __tablename__ = "scorecards"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String(36), ForeignKey("grading_tasks.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    thread_id = Column(String(36), ForeignKey("threads.id", ondelete="SET NULL"), nullable=True, index=True)
    
    overall_score = Column(Float, nullable=False)
    grade_letter = Column(String(8), nullable=False)
    headline = Column(String(255), nullable=False)
    momentum_factor = Column(String(64), nullable=False)
    calm_index = Column(Float, nullable=False, default=100.0)
    
    structured_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    task = relationship("GradingTask", back_populates="scorecard")
    thread = relationship("Thread", back_populates="scorecards")
