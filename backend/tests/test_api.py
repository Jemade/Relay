import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.database import init_db


@pytest.fixture(autouse=True)
async def setup_database():
    await init_db()
    yield


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "operational"
        assert "database" in data
        assert "pipeline" in data


@pytest.mark.asyncio
async def test_threads_crud():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/api/threads", json={"title": "Test Thread", "meta_info": {}})
        assert res.status_code == 201
        created = res.json()
        thread_id = created["id"]
        assert created["title"] == "Test Thread"

        res_list = await ac.get("/api/threads")
        assert res_list.status_code == 200
        threads = res_list.json()
        assert any(t["id"] == thread_id for t in threads)

        res_msg = await ac.post(f"/api/threads/{thread_id}/messages", json={"role": "user", "content": "How do we scale?"})
        assert res_msg.status_code == 200
        msgs = res_msg.json()
        assert len(msgs) == 2

@pytest.mark.asyncio
async def test_grading_pipeline_api():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/api/grading/evaluate", json={
            "transcript_text": "User: Let's build a calm interface.\nRelay: 1. Keep hierarchy clear.\n2. Respect attention."
        })
        assert res.status_code == 202
        task_data = res.json()
        task_id = task_data["task_id"]
        assert task_data["status"] == "queued"

        status_data = {}
        for _ in range(50):
            await asyncio.sleep(0.8)
            res_status = await ac.get(f"/api/grading/tasks/{task_id}")
            if res_status.status_code == 200:
                status_data = res_status.json()
                if status_data.get("status") == "completed":
                    break

        assert status_data.get("task_id") == task_id
        assert status_data.get("status") == "completed"
        assert status_data.get("scorecard") is not None
        assert "overall_score" in status_data["scorecard"]
