from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime


class MessageBase(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1)


class MessageCreate(MessageBase):
    pass


class MessageResponse(MessageBase):
    id: str
    thread_id: str
    created_at: datetime
    token_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ThreadCreate(BaseModel):
    title: Optional[str] = Field(default="New thread")
    meta_info: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ThreadUpdate(BaseModel):
    title: Optional[str] = None
    meta_info: Optional[Dict[str, Any]] = None


class ThreadResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    meta_info: Optional[Dict[str, Any]] = None
    messages: List[MessageResponse] = Field(default_factory=list)
    message_count: int = 0

    model_config = ConfigDict(from_attributes=True)
