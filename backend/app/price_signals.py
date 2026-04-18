"""
Daily price snapshots per product for “price dropped” proactive hints.
"""
import json
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

PATH = Path(__file__).resolve().parent.parent / "data" / "product_price_history.json"
_store: Optional[Dict[str, Any]] = None


def _today() -> str:
    return date.today().isoformat()


def _load() -> Dict[str, Any]:
    global _store
    if _store is not None:
        return _store
    if not PATH.exists():
        _store = {"products": {}}
        return _store
    try:
        with open(PATH, "r", encoding="utf-8") as f:
            _store = json.load(f)
        if "products" not in _store:
            _store["products"] = {}
    except Exception:
        _store = {"products": {}}
    return _store


def _save() -> None:
    global _store
    if _store is None:
        return
    PATH.parent.mkdir(parents=True, exist_ok=True)
    try:
        with open(PATH, "w", encoding="utf-8") as f:
            json.dump(_store, f, indent=2)
    except Exception:
        pass


def record_current_price(product_id: str, price: float) -> None:
    """Call on product view — keeps last two distinct calendar days for drop detection."""
    data = _load()
    products = data.setdefault("products", {})
    today = _today()
    entry = products.setdefault(product_id, {"by_day": {}})
    by_day = entry.setdefault("by_day", {})
    prev = by_day.get(today)
    if prev is None:
        by_day[today] = float(price)
    else:
        # Track lowest seen today (catalog price can refresh)
        by_day[today] = min(float(prev), float(price))
    # Keep last 14 days max
    keys = sorted(by_day.keys())[-14:]
    entry["by_day"] = {k: by_day[k] for k in keys}
    _save()


def price_change_since_yesterday(product_id: str, current_price: float) -> Optional[Tuple[float, float]]:
    """
    If we have a prior calendar day's snapshot and price dropped vs that day, return (old_price, drop_amount).
    """
    data = _load()
    entry = data.get("products", {}).get(product_id)
    if not entry:
        return None
    by_day = entry.get("by_day") or {}
    today = _today()
    dates = sorted(by_day.keys())
    prior_prices = [by_day[d] for d in dates if d < today]
    if not prior_prices:
        return None
    yesterday_price = prior_prices[-1]
    if current_price >= yesterday_price - 0.01:
        return None
    drop = yesterday_price - current_price
    if drop < 1:
        return None
    return (yesterday_price, drop)
