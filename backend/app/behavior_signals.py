"""
Aggregate user behavior for ranking boosts: views, add-to-cart, purchases.
"""
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

PATH = Path(__file__).resolve().parent.parent / "data" / "behavior_signals.json"
_store: Optional[Dict[str, Any]] = None


def _load() -> Dict[str, Any]:
    global _store
    if _store is not None:
        return _store
    if not PATH.exists():
        _store = {"users": {}}
        return _store
    try:
        with open(PATH, "r", encoding="utf-8") as f:
            _store = json.load(f)
        if "users" not in _store:
            _store["users"] = {}
    except Exception:
        _store = {"users": {}}
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


def _key(user_id: Optional[str], session_id: str) -> str:
    return (user_id or "").strip().lower() or session_id


def _user_bucket(user_id: Optional[str], session_id: str) -> Dict[str, Any]:
    data = _load()
    k = _key(user_id, session_id)
    return data["users"].setdefault(k, {"clicks": {}, "adds": {}, "purchases": {}})


def record_product_view(user_id: Optional[str], session_id: str, product_id: str) -> None:
    b = _user_bucket(user_id, session_id)
    c = b.setdefault("clicks", {})
    c[product_id] = c.get(product_id, 0) + 1
    _save()


def record_cart_add(user_id: Optional[str], session_id: str, product_id: str) -> None:
    b = _user_bucket(user_id, session_id)
    a = b.setdefault("adds", {})
    a[product_id] = a.get(product_id, 0) + 1
    _save()


def record_purchase(user_id: Optional[str], session_id: str, product_ids: List[str]) -> None:
    b = _user_bucket(user_id, session_id)
    p = b.setdefault("purchases", {})
    for pid in product_ids:
        p[pid] = p.get(pid, 0) + 1
    _save()


def conversion_score(user_id: Optional[str], session_id: str, product_id: str) -> float:
    """Higher = more likely to convert for this user."""
    b = _user_bucket(user_id, session_id)
    clicks = (b.get("clicks") or {}).get(product_id, 0)
    adds = (b.get("adds") or {}).get(product_id, 0)
    buys = (b.get("purchases") or {}).get(product_id, 0)
    return 1.0 + 0.08 * min(clicks, 20) + 0.25 * min(adds, 10) + 1.2 * min(buys, 5)


def brand_affinity_bonus(user_id: Optional[str], session_id: str, brand: Optional[str]) -> float:
    if not brand:
        return 1.0
    from app.user_preferences import get_preferences

    prefs = get_preferences(user_id, session_id)
    brands = [b.lower() for b in (prefs.get("preferred_brands") or [])]
    if brand.lower() in brands:
        return 1.35
    return 1.0


def rank_products_with_behavior(
    user_id: Optional[str],
    session_id: str,
    product_ids: List[str],
    trending_boost: Optional[Dict[str, float]] = None,
) -> List[str]:
    """Re-rank product IDs by conversion probability × brand × optional global trending."""
    from app.data_store import get_product

    trending_boost = trending_boost or {}
    scored: List[tuple] = []
    for pid in product_ids:
        p = get_product(pid)
        if not p:
            continue
        base = conversion_score(user_id, session_id, pid)
        base *= brand_affinity_bonus(user_id, session_id, p.brand)
        base *= 1.0 + 0.15 * trending_boost.get(pid, 0.0)
        scored.append((base, pid))
    scored.sort(key=lambda x: -x[0])
    return [pid for _, pid in scored]
