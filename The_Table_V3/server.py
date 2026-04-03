# server.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import asyncio
import json
import os
from utils.json_db import JSONDB
from typing import Set

app = FastAPI()

# Mount static
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

# WebSocket connections
connections: Set[WebSocket] = set()

# Broadcast to all
async def broadcast(event: str, data: dict):
    payload = json.dumps({"event": event, "data": data}, ensure_ascii=False)
    disconnected = []
    for conn in connections:
        try:
            await conn.send_text(payload)
        except:
            disconnected.append(conn)
    for conn in disconnected:
        connections.remove(conn)

# GET any JSON file
@app.get("/data/{file}")
async def get_data(file: str):
    return JSONDB.load(file)

# POST update any JSON file
@app.post("/data/{file}")
async def update_data(file: str, request: Request):
    try:
        new_data = await request.json()
        JSONDB.save(file, new_data)
        event = f"{file.replace('.json', '')}_updated"
        await broadcast(event, new_data)  # This triggers sub_chef.js
        return {"status": "saved"}
    except Exception as e:
        return {"error": str(e)}, 500

# WebSocket
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connections.add(websocket)
    try:
        initial_data = {
            "menu.json": "menu_updated",
            "tables.json": "tables_updated",
            "orders.json": "orders_updated",
            "users.json": "users_updated",
            "assignments.json": "assignments_updated",
            "analytics.json": "analytics_updated"
        }
        for file, event in initial_data.items():
            data = JSONDB.load(file)
            await websocket.send_text(json.dumps({
                "event": event,
                "data": data
            }, ensure_ascii=False))
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        connections.remove(websocket)
    except Exception as e:
        print(f"WS Error: {e}")
        connections.discard(websocket)

# Pages
@app.get("/")
async def root():
    return FileResponse("frontend/index.html")

@app.get("/executive")
async def executive():
    return FileResponse("frontend/executive.html")

@app.get("/head_chef")
async def head_chef():
    return FileResponse("frontend/head_chef.html")

@app.get("/deputy_chef")
async def deputy_chef():
    return FileResponse("frontend/deputy_chef.html")

@app.get("/sub_chef")
async def sub_chef():
    return FileResponse("frontend/sub_chef.html")

@app.get("/waiter")
async def waiter():
    return FileResponse("frontend/waiter.html")

if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    uvicorn.run(app, host="0.0.0.0", port=8000)