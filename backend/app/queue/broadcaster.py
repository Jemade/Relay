import asyncio
import json
from typing import Dict, Set, Any


class EventBroadcaster:
    def __init__(self):
        # task_id -> set of asyncio.Queue
        self._subscribers: Dict[str, Set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, task_id: str) -> asyncio.Queue:
        async with self._lock:
            queue = asyncio.Queue()
            if task_id not in self._subscribers:
                self._subscribers[task_id] = set()
            self._subscribers[task_id].add(queue)
            return queue

    async def unsubscribe(self, task_id: str, queue: asyncio.Queue):
        async with self._lock:
            if task_id in self._subscribers:
                self._subscribers[task_id].discard(queue)
                if not self._subscribers[task_id]:
                    del self._subscribers[task_id]

    async def broadcast(self, task_id: str, event_type: str, data: Dict[str, Any]):
        message = json.dumps({"event": event_type, "data": data})
        async with self._lock:
            queues = list(self._subscribers.get(task_id, []))
        for q in queues:
            await q.put(message)


broadcaster = EventBroadcaster()
