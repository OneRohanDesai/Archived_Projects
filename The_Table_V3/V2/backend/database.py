# In-memory state
from typing import Dict, List
import json
from .models import MenuItem

MENU: List[MenuItem] = []
MENU_MAP: Dict[str, MenuItem] = {}

# Load menu
with open("data/menu.json") as f:
    raw = json.load(f)
    MENU = [MenuItem(**item) for item in raw]
    MENU_MAP = {item.id: item for item in MENU}

# Runtime state
orders: Dict[str, dict] = {}
tables: Dict[str, dict] = {f"T{i}": {"status": "free", "order_id": None, "bill": 0} for i in range(1, 13)}
chef_queues: Dict[str, List[dict]] = {s: [] for s in ["dosa", "idli", "vada", "beverage"]}
ready_items: List[dict] = []
bills: Dict[str, float] = {}
