"""
Append-only chat / intent analytics (JSON lines).
"""
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

PATH = Path(__file__).resolve().parent.parent / "data" / "chat_analytics.jsonl"


def log_event(
    event_type: str,
    session_id: str,
    payload: Optional[dict] = None,
    user_id: Optional[str] = None,
) -> None:
    PATH.parent.mkdir(parents=True, exist_ok=True)
    line = {
        "ts": datetime.utcnow().isoformat(),
        "type": event_type,
        "session_id": session_id,
        "user_id": user_id,
        **(payload or {}),
    }
    try:
        with open(PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(line, default=str) + "\n")
    except Exception:
        pass
