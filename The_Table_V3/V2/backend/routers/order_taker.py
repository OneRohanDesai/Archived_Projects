from fastapi import APIRouter, HTTPException
from ..models import OrderSubmit
from ..database import MENU_MAP, orders, tables, chef_queues
import uuid

router = APIRouter()

@router.post("/submit-order")
async def submit_order(order: OrderSubmit):
    if tables[order.table]["status"] != "free" and tables[order.table]["order_id"] is not None:
        raise HTTPException(400, "Table already has an active order")

    order_id = str(uuid.uuid4())[:8]
    total = 0
    items_detail = []

    for item in order.items:
        menu_item = MENU_MAP.get(item.item_id)
        if not menu_item:
            raise HTTPException(404, f"Item {item.item_id} not found")
        subtotal = menu_item.price * item.qty
        total += subtotal
        items_detail.append({
            "item_id": item.item_id,
            "name": menu_item.name,
            "qty": item.qty,
            "price": menu_item.price,
            "subtotal": subtotal
        })

        # Route to chef
        chef_queues[menu_item.specialty].append({
            "order_id": order_id,
            "item_id": item.item_id,
            "name": menu_item.name,
            "qty": item.qty,
            "table": order.table,
            "status": "pending",
            "prep_time": menu_item.prep_time_sec
        })

    orders[order_id] = {
        "table": order.table,
        "items": items_detail,
        "total": total,
        "status": "cooking",
        "delivered": []
    }
    tables[order.table] = {"status": "occupied", "order_id": order_id, "bill": total}

    from ..events import broadcast
    await broadcast({"type": "new_order", "order_id": order_id})
    return {"order_id": order_id, "total": total}
