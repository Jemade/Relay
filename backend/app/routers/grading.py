import asyncio
import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from backend.app.database import get_db
from backend.app.models.thread import Thread, Message
from backend.app.models.grading_task import GradingTask
from backend.app.models.scorecard import Scorecard
from backend.app.schemas.grading import GradingTaskRequest, GradingTaskResponse, TaskStatusResponse
from backend.app.schemas.scorecard import FinalScorecardSchema
from backend.app.queue.task_manager import run_grading_task
from backend.app.queue.broadcaster import broadcaster

router = APIRouter(prefix="/api/grading", tags=["Multi-Agent Grading Pipeline"])


@router.post("/evaluate", response_model=GradingTaskResponse, status_code=status.HTTP_202_ACCEPTED)
async def evaluate_transcript(
    request: GradingTaskRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Enqueues multi-agent grading in the background, keeping grading off the request/response cycle."""
    transcript = request.transcript_text or ""
    thread_id = request.thread_id

    if thread_id:
        result = await db.execute(
            select(Thread)
            .options(selectinload(Thread.messages))
            .where(Thread.id == thread_id)
        )
        thread = result.scalar_one_or_none()
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")

        formatted_messages = []
        for m in thread.messages:
            formatted_messages.append({"role": m.role, "content": m.content, "timestamp": str(m.created_at)})
        transcript = json.dumps(formatted_messages, indent=2)

    if not transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript content cannot be empty")

    task = GradingTask(
        thread_id=thread_id,
        status="queued",
        current_node="queued",
        raw_transcript=transcript
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    background_tasks.add_task(
        run_grading_task,
        task_id=task.id,
        thread_id=thread_id,
        transcript=transcript,
        rubric_criteria=request.custom_criteria
    )

    return GradingTaskResponse(
        task_id=task.id,
        thread_id=thread_id,
        status=task.status,
        created_at=task.created_at
    )


@router.get("/tasks/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieves current execution state of a grading pipeline task."""
    result = await db.execute(
        select(GradingTask)
        .options(selectinload(GradingTask.scorecard))
        .where(GradingTask.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    scorecard_schema = None
    if task.scorecard and task.scorecard.structured_json:
        scorecard_schema = FinalScorecardSchema.model_validate(task.scorecard.structured_json)

    return TaskStatusResponse(
        task_id=task.id,
        thread_id=task.thread_id,
        status=task.status,
        current_node=task.current_node,
        created_at=task.created_at,
        completed_at=task.completed_at,
        error_message=task.error_message,
        scorecard=scorecard_schema
    )


@router.get("/tasks/{task_id}/events")
async def stream_task_events(task_id: str):
    """Server-Sent Events (SSE) streaming state graph transitions in real-time."""
    queue = await broadcaster.subscribe(task_id)

    async def event_generator():
        try:
            yield f": keepalive\n\n"
            while True:
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {message}\n\n"
                    parsed = json.loads(message)
                    if parsed.get("event") in ("pipeline_completed", "pipeline_failed"):
                        break
                except asyncio.TimeoutError:
                    yield f": ping\n\n"
        finally:
            await broadcaster.unsubscribe(task_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/scorecards", response_model=List[FinalScorecardSchema])
async def list_scorecards(db: AsyncSession = Depends(get_db)):
    """Lists all structured scorecards persisted in the database."""
    result = await db.execute(
        select(Scorecard).order_by(desc(Scorecard.created_at)).limit(50)
    )
    scorecards = result.scalars().all()
    return [FinalScorecardSchema.model_validate(s.structured_json) for s in scorecards if s.structured_json]
