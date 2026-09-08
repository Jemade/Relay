import traceback
from datetime import datetime, timezone
from sqlalchemy import select
from backend.app.database import AsyncSessionLocal
from backend.app.models.grading_task import GradingTask
from backend.app.models.scorecard import Scorecard
from backend.app.pipeline.graph import grading_pipeline
from backend.app.queue.broadcaster import broadcaster


async def run_grading_task(task_id: str, thread_id: str | None, transcript: str, rubric_criteria: list[str] | None = None):
    """Executes the LangGraph multi-agent grading pipeline in the background off the request/response cycle."""
    async with AsyncSessionLocal() as session:
        # Mark task as processing
        result = await session.execute(select(GradingTask).where(GradingTask.id == task_id))
        task = result.scalar_one_or_none()
        if not task:
            return

        task.status = "processing"
        task.current_node = "intake"
        await session.commit()
        await broadcaster.broadcast(task_id, "node_start", {"node": "intake", "status": "processing"})

    initial_state = {
        "task_id": task_id,
        "thread_id": thread_id,
        "raw_transcript": transcript,
        "parsed_turns": [],
        "rubric_criteria": rubric_criteria or [],
        "clarity_evaluation": None,
        "actionability_evaluation": None,
        "grounding_evaluation": None,
        "final_scorecard": None,
        "current_node": "intake",
        "status": "processing",
        "error": None,
    }

    try:
        current_state = dict(initial_state)
        async for output in grading_pipeline.astream(initial_state):
            for node_name, node_state in output.items():
                current_state.update(node_state)
                
                async with AsyncSessionLocal() as session:
                    res = await session.execute(select(GradingTask).where(GradingTask.id == task_id))
                    t = res.scalar_one_or_none()
                    if t:
                        t.current_node = node_name
                        await session.commit()

                await broadcaster.broadcast(
                    task_id,
                    "node_complete",
                    {
                        "node": node_name,
                        "status": "processing",
                        "summary": f"Completed evaluation step: {node_name}"
                    }
                )

        final_sc_data = current_state.get("final_scorecard")
        if not final_sc_data:
            raise ValueError("Pipeline finished without producing a final scorecard")

        # Persist completed task and structured scorecard
        async with AsyncSessionLocal() as session:
            res = await session.execute(select(GradingTask).where(GradingTask.id == task_id))
            t = res.scalar_one_or_none()
            if t:
                t.status = "completed"
                t.current_node = "scorecard_synthesizer"
                t.completed_at = datetime.now(timezone.utc)

            # Insert or replace scorecard
            scorecard_entry = Scorecard(
                task_id=task_id,
                thread_id=thread_id,
                overall_score=final_sc_data["overall_score"],
                grade_letter=final_sc_data["grade_letter"],
                headline=final_sc_data["headline"],
                momentum_factor=final_sc_data["momentum_factor"],
                calm_index=final_sc_data.get("calm_index", 92.0),
                structured_json=final_sc_data
            )
            session.add(scorecard_entry)
            await session.commit()

        await broadcaster.broadcast(
            task_id,
            "pipeline_completed",
            {
                "task_id": task_id,
                "status": "completed",
                "scorecard": final_sc_data
            }
        )

    except Exception as e:
        err_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(f"Error in grading background task {task_id}: {err_msg}")
        async with AsyncSessionLocal() as session:
            res = await session.execute(select(GradingTask).where(GradingTask.id == task_id))
            t = res.scalar_one_or_none()
            if t:
                t.status = "failed"
                t.error_message = str(e)
                t.completed_at = datetime.now(timezone.utc)
                await session.commit()

        await broadcaster.broadcast(
            task_id,
            "pipeline_failed",
            {
                "task_id": task_id,
                "status": "failed",
                "error": str(e)
            }
        )
