import asyncio
from fastapi import WebSocket
from .database import chef_queues, ready_items, orders, tables
from typing import List

connections: List[WebSocket] = []

async def broadcast(event: dict):
    for conn in list(connections):
        try:
            await conn.send_json(event)
        except:
            connections.remove(conn)

async def simulate_cooking():
    while True:
        for specialty, queue in chef_queues.items():
            for task in queue:
                if task["status"] == "pending":
                    task["status"] = "cooking"
                    await broadcast({"type": "chef_update"})
                    await asyncio.sleep(task["prep_time"])
                    task["status"] = "ready"
                    ready_items.append(task)
                    queue.remove(task)
                    await broadcast({"type": "ready_items"})
        await asyncio.sleep(1)
