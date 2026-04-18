"""
Persistent user preferences (JSON) — brands, sizes, budget, cart activity.
Keyed by user email when logged in, else session_id.
"""
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

PREFS_PATH = Path(__file__).resolve().parent.parent / "data" / "user_preferences.json"
_store: Optional[Dict[str, Any]] = None


def _load() -> Dict[str, Any]:
    global _store
    if _store is not None:
        return _store
    if not PREFS_PATH.exists():
        _store = {"users": {}}
        return _store
    try:
        with open(PREFS_PATH, "r", encoding="utf-8") as f:
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
    PREFS_PATH.parent.mkdir(parents=True, exist_ok=True)
    try:
        with open(PREFS_PATH, "w", encoding="utf-8") as f:
            json.dump(_store, f, indent=2)
    except Exception:
        pass


def _key(user_id: Optional[str], session_id: str) -> str:
    return (user_id or "").strip().lower() or session_id


def get_preferences(user_id: Optional[str], session_id: str) -> Dict[str, Any]:
    k = _key(user_id, session_id)
    data = _load()
    u = data["users"].get(k)
    if u:
        return dict(u)
    return {
        "preferred_brands": [],
        "shoe_size": None,
        "clothing_size": None,
        "budget_min": None,
        "budget_max": None,
        "category_affinity": {},
        "last_cart_activity": None,
    }


def merge_purchase(user_id: Optional[str], session_id: str, items: List[Dict[str, Any]]) -> None:
    """Update prefs from order line items (product_id, category, brand from catalog)."""
    from app.data_store import get_product

    data = _load()
    k = _key(user_id, session_id)
    u = data["users"].setdefault(k, {})
    brands = list(u.get("preferred_brands") or [])
    aff = dict(u.get("category_affinity") or {})
    for it in items:
        pid = it.get("product_id") if isinstance(it, dict) else getattr(it, "product_id", None)
        if not pid:
            continue
        p = get_product(pid)
        if not p:
            continue
        if p.brand and p.brand not in brands:
            brands.append(p.brand)
        cat = p.category or ""
        aff[cat] = aff.get(cat, 0) + 1
    u["preferred_brands"] = brands[-15:]
    u["category_affinity"] = aff
    _save()


def merge_quick_order_attrs(user_id: Optional[str], session_id: str, attrs: Dict[str, Any]) -> None:
    data = _load()
    k = _key(user_id, session_id)
    u = data["users"].setdefault(k, {})
    if attrs.get("size") is not None:
        cat = attrs.get("category") or ""
        if "Footwear" in cat or attrs.get("product_type"):
            u["shoe_size"] = attrs["size"]
    if attrs.get("budget_max"):
        u["budget_max"] = attrs["budget_max"]
    if attrs.get("gender"):
        u["gender_pref"] = attrs["gender"]
    _save()


def touch_cart_activity(user_id: Optional[str], session_id: str) -> None:
    from datetime import datetime

    data = _load()
    k = _key(user_id, session_id)
    u = data["users"].setdefault(k, {})
    u["last_cart_activity"] = datetime.utcnow().isoformat()
    _save()


def preference_summary_for_prompt(user_id: Optional[str], session_id: str) -> str:
    u = get_preferences(user_id, session_id)
    parts = []
    if u.get("shoe_size"):
        parts.append(f"usual shoe size: {u['shoe_size']}")
    if u.get("preferred_brands"):
        parts.append(f"preferred brands: {', '.join(u['preferred_brands'][:5])}")
    if u.get("budget_max"):
        parts.append(f"typical budget cap: ₹{u['budget_max']}")
    aff = u.get("category_affinity") or {}
    if aff:
        top = sorted(aff.items(), key=lambda x: -x[1])[:3]
        parts.append(f"often buys: {', '.join(f'{c} ({n}x)' for c, n in top)}")
    return "; ".join(parts) if parts else ""


def enrich_context(base: Dict[str, Any], user_id: Optional[str], session_id: str) -> Dict[str, Any]:
    out = dict(base)
    u = get_preferences(user_id, session_id)
    out["persisted_prefs"] = u
    out["preference_summary"] = preference_summary_for_prompt(user_id, session_id)
    out["active_user_id"] = user_id
    return out
