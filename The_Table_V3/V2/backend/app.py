from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .routers import order_taker, chef, waiter, manager
from .events import connections, broadcast, simulate_cooking
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

app.include_router(order_taker.router)
app.include_router(chef.router)
app.include_router(waiter.router)
app.include_router(manager.router)

@app.get("/", response_class=HTMLResponse)
async def manager():
    with open("frontend/templates/manager.html") as f:
        return f.read()

@app.get("/order-taker", response_class=HTMLResponse)
async def order_taker():
    with open("frontend/templates/order-taker.html") as f:
        return f.read()

@app.get("/chef/{specialty}", response_class=HTMLResponse)
async def chef(specialty: str):
    with open("frontend/templates/chef.html") as f:
        return f.read().replace("{{specialty}}", specialty.title())

@app.get("/waiter", response_class=HTMLResponse)
async def waiter():
    with open("frontend/templates/waiter.html") as f:
        return f.read()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connections.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        connections.remove(websocket)
    except Exception as e:
        print(f"WS Error: {e}")
        connections.remove(websocket)

@app.on_event("startup")
async def startup():
    asyncio.create_task(simulate_cooking())