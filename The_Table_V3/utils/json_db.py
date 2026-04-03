# utils/json_db.py
import json
import os
from threading import Lock
from datetime import datetime
from typing import Any

class JSONDB:
    _locks = {}
    _cache = {}

    @staticmethod
    def _get_lock(file: str):
        if file not in JSONDB._locks:
            JSONDB._locks[file] = Lock()
        return JSONDB._locks[file]

    @staticmethod
    def load(file: str) -> Any:
        path = f"data/{file}"
        if file in JSONDB._cache:
            return JSONDB._cache[file]

        if not os.path.exists(path):
            default = [] if file not in ['analytics.json'] else {}
            JSONDB.save(file, default)
            return default

        with JSONDB._get_lock(file):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    JSONDB._cache[file] = data
                    return data
            except json.JSONDecodeError:
                print(f"Corrupted {file}, resetting...")
                default = [] if file not in ['analytics.json'] else {}
                JSONDB.save(file, default)
                return default

    @staticmethod
    def save(file: str, data: Any):
        path = f"data/{file}"
        backup_path = f"data/backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file}"

        # Backup on first save of day
        today = datetime.now().strftime('%Y%m%d')
        backups = [f for f in os.listdir('data') if f.startswith(f"backup_{today}")]
        if not backups and os.path.exists(path):
            import shutil
            shutil.copy(path, backup_path)

        JSONDB._cache[file] = data
        with JSONDB._get_lock(file):
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)