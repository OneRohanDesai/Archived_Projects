import asyncio
import random
import json
import uuid
from datetime import datetime
from typing import Dict, List, Any
from enum import Enum

import numpy as np
import yaml
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import uvicorn

from nats.aio.client import Client as NATS

# ======================
# CONFIG & ENUMS
# ======================

with open("config/simulator.yaml") as f:
    CONFIG = yaml.safe_load(f)

SPEED = CONFIG["speed_factor"]

class TableState(str, Enum):
    EMPTY = "empty"
    DECIDING = "deciding"
    ORDERED = "ordered"
    SERVING = "serving"
    EATING = "eating"
    PAYING = "paying"

class ChefState(str, Enum):
    IDLE = "idle"
    COOKING = "cooking"
    PLATING = "plating"

class WaiterState(str, Enum):
    FREE = "free"
    TAKING_ORDER = "taking_order"
    DELIVERING = "delivering"
    CLEARING = "clearing"

# ======================
# MODELS
# ======================

class Table:
    def __init__(self, id: int):
        self.id = id
        self.state = TableState.EMPTY
        self.order = None
        self.customer_group_size = 0
        self.arrival_time = None
        self.order_time = None
        self.serve_time = None
        self.depart_time = None

    def to_dict(self):
        return {
            "id": self.id,
            "state": self.state.value,
            "group_size": self.customer_group_size,
            "order": self.order.to_dict() if self.order else None
        }

class Order:
    def __init__(self, table_id: int, items: List[str]):
        self.id = str(uuid.uuid4())[:8]
        self.table_id = table_id
        self.items = items
        self.status = "placed"
        self.placed_at = datetime.utcnow()
        self.cooking_started = None
        self.ready_at = None
        self.delivered_at = None

    def to_dict(self):
        return {
            "id": self.id,
            "table_id": self.table_id,
            "items": self.items,
            "status": self.status,
            "placed_at": self.placed_at.isoformat(),
            "cooking_started": self.cooking_started.isoformat() if self.cooking_started else None,
            "ready_at": self.ready_at.isoformat() if self.ready_at else None,
            "delivered_at": self.delivered_at.isoformat() if self.delivered_at else None,
        }

class Chef:
    def __init__(self, id: int):
        self.id = id
        self.state = ChefState.IDLE
        self.current_order = None

    def to_dict(self):
        return {
            "id": self.id,
            "state": self.state.value,
            "order_id": self.current_order.id if self.current_order else None
        }

class Waiter:
    def __init__(self, id: int):
        self.id = id
        self.state = WaiterState.FREE
        self.current_table = None

    def to_dict(self):
        return {
            "id": self.id,
            "state": self.state.value,
            "table_id": self.current_table
        }

class OrderTaker:
    def __init__(self, id: int):
        self.id = id
        self.state = "free"  # free, busy

    def to_dict(self):
        return {"id": self.id, "state": self.state}

# ======================
# SIMULATOR CORE
# ======================

class RajniDosaSimulator:
    def __init__(self):
        self.tables: List[Table] = [Table(i) for i in range(CONFIG["tables"])]
        self.chefs: List[Chef] = [Chef(i) for i in range(CONFIG["chefs"])]
        self.waiters: List[Waiter] = [Waiter(i) for i in range(CONFIG["waiters"])]
        self.order_takers = [OrderTaker(i) for i in range(CONFIG["order_takers"])]
        self.orders: Dict[str, Order] = {}
        self.running = False
        self.nc = NATS()

    async def connect_nats(self):
        await self.nc.connect("nats://localhost:4222")

    async def publish(self, subject: str, data: dict):
        await self.nc.publish(subject, json.dumps(data).encode())

    def sample(self, dist: dict):
        if "mean" in dist and "std" in dist:
            return max(1, int(np.random.normal(dist["mean"], dist["std"])))
        elif "min" in dist and "max" in dist:
            return random.uniform(dist["min"], dist["max"])
        return 60

    def get_empty_table(self) -> Table:
        empty = [t for t in self.tables if t.state == TableState.EMPTY]
        return random.choice(empty) if empty else None

    def get_free_waiter(self) -> Waiter:
        free = [w for w in self.waiters if w.state == WaiterState.FREE]
        return random.choice(free) if free else None

    def get_idle_chef(self) -> Chef:
        idle = [c for c in self.chefs if c.state == ChefState.IDLE]
        return random.choice(idle) if idle else None

    async def customer_arrival_loop(self):
        print("[SIM] Customer arrival loop started")
        while self.running:
            await asyncio.sleep(self.sample(CONFIG["distributions"]["customer_arrival"]) / SPEED)
            table = self.get_empty_table()
            if not table:
                continue
            print(f"[SIM] New group arriving at table {table.id}")
            # ... rest of code
            group_size = random.randint(1, 4)
            table.customer_group_size = group_size
            table.state = TableState.DECIDING
            table.arrival_time = datetime.utcnow()
            await self.publish("table.update", table.to_dict())

            # Decide menu
            await asyncio.sleep(self.sample(CONFIG["distributions"]["menu_decision"]) / SPEED)
            if table.state != TableState.DECIDING:
                continue

            waiter = self.get_free_waiter()
            if not waiter:
                continue
            waiter.state = WaiterState.TAKING_ORDER
            waiter.current_table = table.id
            await self.publish("waiter.update", waiter.to_dict())

            # Order taking
            await asyncio.sleep(self.sample(CONFIG["distributions"]["serving"]) / SPEED)
            items = random.choices(
                list(CONFIG["menu_items"].keys()),
                weights=[1, 0.7, 0.8],
                k=random.randint(1, 3)
            )
            order = Order(table.id, items)
            self.orders[order.id] = order
            table.order = order
            table.state = TableState.ORDERED
            table.order_time = datetime.utcnow()

            waiter.state = WaiterState.FREE
            waiter.current_table = None
            await self.publish("waiter.update", waiter.to_dict())
            await self.publish("table.update", table.to_dict())
            await self.publish("order.placed", order.to_dict())

            # Assign to chef
            asyncio.create_task(self.assign_to_chef(order))

    async def assign_to_chef(self, order: Order):
        chef = self.get_idle_chef()
        if not chef:
            await asyncio.sleep(5 / SPEED)
            return await self.assign_to_chef(order)

        chef.state = ChefState.COOKING
        chef.current_order = order
        order.cooking_started = datetime.utcnow()
        order.status = "cooking"
        await self.publish("chef.update", chef.to_dict())
        await self.publish("order.update", order.to_dict())

        # Cook each item
        total_cook = 0
        for item in order.items:
            cook_time = self.sample(CONFIG["menu_items"][item]["cooking"])
            total_cook += cook_time
            await asyncio.sleep(cook_time / SPEED / len(order.items))

        chef.state = ChefState.PLATING
        await self.publish("chef.update", chef.to_dict())
        await asyncio.sleep(10 / SPEED)  # plating

        chef.state = ChefState.IDLE
        chef.current_order = None
        order.ready_at = datetime.utcnow()
        order.status = "ready"
        await self.publish("chef.update", chef.to_dict())
        await self.publish("order.update", order.to_dict())

        # Deliver
        asyncio.create_task(self.deliver_order(order))

    async def deliver_order(self, order: Order):
        table = next(t for t in self.tables if t.id == order.table_id)
        waiter = self.get_free_waiter()
        if not waiter:
            await asyncio.sleep(5 / SPEED)
            return await self.deliver_order(order)

        waiter.state = WaiterState.DELIVERING
        waiter.current_table = table.id
        await self.publish("waiter.update", waiter.to_dict())

        await asyncio.sleep(self.sample(CONFIG["distributions"]["serving"]) / SPEED)

        table.state = TableState.EATING
        table.serve_time = datetime.utcnow()
        order.delivered_at = datetime.utcnow()
        order.status = "delivered"

        waiter.state = WaiterState.FREE
        waiter.current_table = None

        await self.publish("table.update", table.to_dict())
        await self.publish("order.update", order.to_dict())
        await self.publish("waiter.update", waiter.to_dict())

        # Eating
        eat_time = self.sample(CONFIG["distributions"]["eating"])
        await asyncio.sleep(eat_time / SPEED)

        # Paying
        table.state = TableState.PAYING
        await self.publish("table.update", table.to_dict())
        await asyncio.sleep(self.sample(CONFIG["distributions"]["payment"]) / SPEED)

        # Clear
        waiter = self.get_free_waiter()
        if waiter:
            waiter.state = WaiterState.CLEARING
            waiter.current_table = table.id
            await self.publish("waiter.update", waiter.to_dict())
            await asyncio.sleep(15 / SPEED)
            waiter.state = WaiterState.FREE
            waiter.current_table = None
            await self.publish("waiter.update", waiter.to_dict())

        # Reset table
        table.state = TableState.EMPTY
        table.customer_group_size = 0
        table.order = None
        table.arrival_time = None
        table.order_time = None
        table.serve_time = None
        await self.publish("table.update", table.to_dict())

    def get_state(self):
        return {
            "tables": [t.to_dict() for t in self.tables],
            "chefs": [c.to_dict() for c in self.chefs],
            "waiters": [w.to_dict() for w in self.waiters],
            "order_takers": [ot.to_dict() for ot in self.order_takers],
            "stats": {
                "occupied": sum(1 for t in self.tables if t.state != TableState.EMPTY),
                "pending_orders": sum(1 for o in self.orders.values() if o.status in ["placed", "cooking"]),
                "orders_per_hour": 0,  # TODO: track
            }
        }

# ======================
# FASTAPI APP
# ======================

app = FastAPI(title="Rajni Dosa Simulator")
app.mount("/static", StaticFiles(directory="static"), name="static")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

simulator = RajniDosaSimulator()
connected_clients: List[WebSocket] = []

@app.on_event("startup")
async def startup():
    await simulator.connect_nats()
    simulator.running = True
    asyncio.create_task(simulator.customer_arrival_loop())

@app.on_event("shutdown")
async def shutdown():
    simulator.running = False
    await simulator.nc.drain()

@app.get("/", response_class=HTMLResponse)
async def root():
    with open("static/index.html") as f:
        return f.read()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    print(f"[WS] Client connected. Total: {len(connected_clients)}")
    try:
        while True:
            await websocket.receive_text()  # keepalive
    except WebSocketDisconnect:
        connected_clients.remove(websocket)
        print(f"[WS] Client disconnected. Total: {len(connected_clients)}")

async def broadcast_state():
    if not connected_clients:
        return
    state = simulator.get_state()
    print(f"[BROADCAST] Sending state: {len(state['tables'])} tables, {len(connected_clients)} clients")
    for client in connected_clients[:]:
        try:
            await client.send_json(state)
        except Exception as e:
            print(f"[WS] Send failed: {e}")
            connected_clients.remove(client)

# Broadcast every 0.5s (real-time feel)
async def state_broadcaster():
    while True:
        await broadcast_state()
        await asyncio.sleep(0.5)

app.add_event_handler("startup", lambda: asyncio.create_task(state_broadcaster()))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)