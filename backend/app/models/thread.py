import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Thread(Base):
    __tablename__ = "threads"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False, default="New thread")
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    meta_info = Column(JSON, nullable=True, default=dict)

    messages = relationship("Message", back_populates="thread", cascade="all, delete-orphan", order_by="Message.created_at")
    grading_tasks = relationship("GradingTask", back_populates="thread", cascade="all, delete-orphan")
    scorecards = relationship("Scorecard", back_populates="thread", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    thread_id = Column(String(36), ForeignKey("threads.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(32), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    token_count = Column(Integer, default=0)

    thread = relationship("Thread", back_populates="messages")
