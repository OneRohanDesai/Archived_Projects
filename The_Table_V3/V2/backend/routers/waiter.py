from fastapi import APIRouter, HTTPException
from ..database import ready_items, orders, tables
from ..events import broadcast

router = APIRouter(prefix="/waiter")


@router.get("/ready")
async def get_ready_items():
    """Return all items that are ready for delivery."""
    return {"items": ready_items}


@router.post("/deliver")
async def deliver_item(item: dict):
    """
    Expected payload:
    {
        "order_id": "...",
        "item_id": "...",
        "qty": 1
    }
    """
    order_id = item.get("order_id")
    item_id = item.get("item_id")
    qty = item.get("qty", 0)

    # Find the matching ready item
    for ready in ready_items[:]:
        if (ready["order_id"] == order_id and
                ready["item_id"] == item_id and
                ready["qty"] >= qty):

            # ---- Mark as delivered in the order ----
            order = orders[order_id]
            order["delivered"].append({
                "item_id": item_id,
                "qty": qty
            })

            # ---- Reduce the ready quantity ----
            ready["qty"] -= qty
            if ready["qty"] <= 0:
                ready_items.remove(ready)

            # ---- Check if the whole order is now delivered ----
            all_delivered = all(
                any(d["item_id"] == i["item_id"] and d["qty"] >= i["qty"]
                    for d in order["delivered"])
                for i in order["items"]
            )
            if all_delivered:
                table = order["table"]
                tables[table]["status"] = "free"
                tables[table]["order_id"] = None

            await broadcast({"type": "delivery_update"})
            return {"status": "delivered"}

    raise HTTPException(status_code=404, detail="Item not ready")