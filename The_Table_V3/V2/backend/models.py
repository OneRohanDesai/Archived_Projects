from pydantic import BaseModel
from typing import List, Optional

class MenuItem(BaseModel):
    id: str
    name: str
    price: int
    specialty: str
    prep_time_sec: int

class OrderItem(BaseModel):
    item_id: str
    qty: int

class OrderSubmit(BaseModel):
    table: str
    items: List[OrderItem]

class ChefTask(BaseModel):
    order_id: str
    item_id: str
    name: str
    qty: int
    table: str
    status: str  # pending, cooking, ready
    prep_time: int

class ReadyItem(BaseModel):
    order_id: str
    item_id: str
    name: str
    qty: int
    table: str
