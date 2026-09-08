import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from backend.app.database import get_db
from backend.app.models.thread import Thread, Message
from backend.app.schemas.thread import (
    ThreadCreate,
    ThreadUpdate,
    ThreadResponse,
    MessageCreate,
    MessageResponse
)

router = APIRouter(prefix="/api/threads", tags=["Threads"])


@router.get("", response_model=List[ThreadResponse])
async def list_threads(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Thread)
        .options(selectinload(Thread.messages))
        .order_by(desc(Thread.updated_at))
    )
    threads = result.scalars().all()
    out = []
    for t in threads:
        out.append(ThreadResponse(
            id=t.id,
            title=t.title,
            created_at=t.created_at,
            updated_at=t.updated_at,
            meta_info=t.meta_info,
            messages=[MessageResponse.model_validate(m) for m in t.messages],
            message_count=len(t.messages)
        ))
    return out


@router.post("", response_model=ThreadResponse, status_code=status.HTTP_201_CREATED)
async def create_thread(data: ThreadCreate, db: AsyncSession = Depends(get_db)):
    thread = Thread(
        title=data.title or "New thread",
        meta_info=data.meta_info or {}
    )
    db.add(thread)
    await db.commit()
    await db.refresh(thread)
    return ThreadResponse(
        id=thread.id,
        title=thread.title,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
        meta_info=thread.meta_info,
        messages=[],
        message_count=0
    )


@router.get("/{thread_id}", response_model=ThreadResponse)
async def get_thread(thread_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Thread)
        .options(selectinload(Thread.messages))
        .where(Thread.id == thread_id)
    )
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    return ThreadResponse(
        id=thread.id,
        title=thread.title,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
        meta_info=thread.meta_info,
        messages=[MessageResponse.model_validate(m) for m in thread.messages],
        message_count=len(thread.messages)
    )


@router.patch("/{thread_id}", response_model=ThreadResponse)
async def update_thread(thread_id: str, data: ThreadUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Thread).where(Thread.id == thread_id))
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    if data.title is not None:
        thread.title = data.title
    if data.meta_info is not None:
        thread.meta_info = data.meta_info
    thread.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(thread)

    result_msgs = await db.execute(
        select(Message).where(Message.thread_id == thread_id).order_by(Message.created_at)
    )
    msgs = result_msgs.scalars().all()

    return ThreadResponse(
        id=thread.id,
        title=thread.title,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
        meta_info=thread.meta_info,
        messages=[MessageResponse.model_validate(m) for m in msgs],
        message_count=len(msgs)
    )


@router.delete("/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_thread(thread_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Thread).where(Thread.id == thread_id))
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    await db.delete(thread)
    await db.commit()


@router.post("/{thread_id}/messages", response_model=List[MessageResponse])
async def add_message(thread_id: str, message: MessageCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Thread).where(Thread.id == thread_id))
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    user_msg = Message(
        thread_id=thread_id,
        role=message.role,
        content=message.content,
        token_count=len(message.content.split())
    )
    db.add(user_msg)

    history_res = await db.execute(
        select(Message)
        .where(Message.thread_id == thread_id)
        .order_by(Message.created_at)
    )
    prior_messages = history_res.scalars().all()

    from backend.app.pipeline.llm_factory import LLMFactory, extract_text_from_ai_response
    chat_model = LLMFactory.get_chat_model()
    
    if chat_model:
        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
        langchain_msgs = [
            SystemMessage(content=(
                "You are RELAY, a calm, focused AI partner in motion. "
                "Your role is to turn unfinished thoughts into useful next steps. "
                "Format responses cleanly with headings, concise bullet points, and code blocks where helpful. "
                "Avoid corporate platitudes and synthetic hype. Provide real momentum."
            ))
        ]
        for m in prior_messages[-10:]:
            if m.role == "user":
                langchain_msgs.append(HumanMessage(content=m.content))
            elif m.role == "assistant":
                langchain_msgs.append(AIMessage(content=m.content))

        langchain_msgs.append(HumanMessage(content=message.content))

        try:
            ai_response = await chat_model.ainvoke(langchain_msgs)
            assistant_content = extract_text_from_ai_response(ai_response.content)
        except Exception as e:
            import json
            import re
            err_str = str(e)
            is_429 = "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower()
            is_auth = "401" in err_str or "403" in err_str or "API_KEY_INVALID" in err_str or "unauthorized" in err_str.lower()
            
            retry_match = re.search(r'retry in ([0-9]+(?:\.[0-9]+)?)s', err_str, re.IGNORECASE)
            retry_delay = int(float(retry_match.group(1))) if retry_match else (20 if is_429 else 0)
            
            error_data = {
                "__relay_error": True,
                "error_type": "quota_exceeded" if is_429 else ("auth_error" if is_auth else "model_error"),
                "status_code": 429 if is_429 else (401 if is_auth else 500),
                "title": "API Rate Limit Exceeded (429)" if is_429 else ("API Key Authentication Error" if is_auth else "Live Model Generation Failed"),
                "message": (
                    f"Daily request limit reached for the active API key. Please retry in ~{retry_delay or 20}s, or configure an alternative key in Settings."
                    if is_429 else
                    ("The configured API key is invalid or unauthorized. Please verify your API key." if is_auth else f"Unable to generate response: {err_str[:160]}")
                ),
                "retry_delay": retry_delay,
                "raw_details": err_str
            }
            assistant_content = json.dumps(error_data)
    else:
        assistant_content = "No live LLM configured. Please configure an API key."

    assistant_msg = Message(
        thread_id=thread_id,
        role="assistant",
        content=assistant_content,
        token_count=len(assistant_content.split())
    )
    db.add(assistant_msg)

    if thread.title in ("New thread", "New thread copy", ""):
        snippet = message.content.strip().split("\n")[0][:40]
        thread.title = snippet or "Conversation"

    thread.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)

    return [
        MessageResponse.model_validate(user_msg),
        MessageResponse.model_validate(assistant_msg)
    ]


@router.delete("/{thread_id}/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(thread_id: str, message_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Message).where(Message.thread_id == thread_id, Message.id == message_id)
    )
    msg = result.scalar_one_or_none()
    if msg:
        await db.delete(msg)
        await db.commit()


@router.post("/{thread_id}/regenerate", response_model=List[MessageResponse])
async def regenerate_message(thread_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Thread).where(Thread.id == thread_id))
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    history_res = await db.execute(
        select(Message).where(Message.thread_id == thread_id).order_by(Message.created_at)
    )
    msgs = history_res.scalars().all()
    if not msgs:
        raise HTTPException(status_code=400, detail="Thread has no messages to regenerate")

    last_msg = msgs[-1]
    if last_msg.role == "assistant":
        await db.delete(last_msg)
        await db.commit()
        msgs = msgs[:-1]

    user_msgs = [m for m in msgs if m.role == "user"]
    if not user_msgs:
        raise HTTPException(status_code=400, detail="No user message found to regenerate for")

    last_user_msg = user_msgs[-1]

    from backend.app.pipeline.llm_factory import LLMFactory, extract_text_from_ai_response
    chat_model = LLMFactory.get_chat_model()

    if chat_model:
        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
        langchain_msgs = [
            SystemMessage(content=(
                "You are RELAY, a calm, focused AI partner in motion. "
                "Your role is to turn unfinished thoughts into useful next steps. "
                "Format responses cleanly with headings, concise bullet points, and code blocks where helpful. "
                "Avoid corporate platitudes and synthetic hype. Provide real momentum."
            ))
        ]
        for m in msgs[-10:]:
            if m.role == "user":
                langchain_msgs.append(HumanMessage(content=m.content))
            elif m.role == "assistant":
                langchain_msgs.append(AIMessage(content=m.content))

        try:
            ai_response = await chat_model.ainvoke(langchain_msgs)
            assistant_content = extract_text_from_ai_response(ai_response.content)
        except Exception as e:
            import json
            import re
            err_str = str(e)
            is_429 = "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower()
            is_auth = "401" in err_str or "403" in err_str or "API_KEY_INVALID" in err_str or "unauthorized" in err_str.lower()
            retry_match = re.search(r'retry in ([0-9]+(?:\.[0-9]+)?)s', err_str, re.IGNORECASE)
            retry_delay = int(float(retry_match.group(1))) if retry_match else (20 if is_429 else 0)

            error_data = {
                "__relay_error": True,
                "error_type": "quota_exceeded" if is_429 else ("auth_error" if is_auth else "model_error"),
                "status_code": 429 if is_429 else (401 if is_auth else 500),
                "title": "API Rate Limit Exceeded (429)" if is_429 else ("API Key Authentication Error" if is_auth else "AI Service Error"),
                "message": (
                    f"The active API key has reached its request or quota rate limit. Please retry in ~{retry_delay or 20}s, or configure an alternative key in settings."
                    if is_429 else
                    ("The configured API key is invalid or unauthorized. Please verify your API key." if is_auth else f"Unable to generate response: {err_str[:160]}")
                ),
                "retry_delay": retry_delay,
                "raw_details": err_str
            }
            assistant_content = json.dumps(error_data)
    else:
        assistant_content = "No live LLM configured. Please configure an API key."

    assistant_msg = Message(
        thread_id=thread_id,
        role="assistant",
        content=assistant_content,
        token_count=len(assistant_content.split())
    )
    db.add(assistant_msg)
    thread.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(assistant_msg)

    all_msgs_res = await db.execute(
        select(Message).where(Message.thread_id == thread_id).order_by(Message.created_at)
    )
    all_msgs = all_msgs_res.scalars().all()
    return [MessageResponse.model_validate(m) for m in all_msgs]

