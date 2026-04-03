from fastapi import APIRouter
from ..database import tables, orders, MENU_MAP

router = APIRouter(prefix="/manager")

@router.get("/state")
async def get_state():
    return {
        "tables": tables,
        "orders": orders,
        "revenue": sum(t["bill"] for t in tables.values() if t["status"] == "free")
    }

@router.get("/menu")
async def get_menu():
    return {"menu": [m.dict() for m in MENU_MAP.values()]}
