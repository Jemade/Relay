import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class GradingTask(Base):
    __tablename__ = "grading_tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    thread_id = Column(String(36), ForeignKey("threads.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(32), nullable=False, default="queued", index=True)  # queued, processing, completed, failed
    current_node = Column(String(64), nullable=True)
    raw_transcript = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)

    thread = relationship("Thread", back_populates="grading_tasks")
    scorecard = relationship("Scorecard", back_populates="task", uselist=False, cascade="all, delete-orphan")
