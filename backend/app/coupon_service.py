"""
Coupon validation and first-time-only usage tracking.
Coupons from the discounts list; each code works only once per user.
"""
import json
from pathlib import Path
from typing import Optional, List, Tuple

COUPON_USAGE_PATH = Path(__file__).resolve().parent.parent / "data" / "coupon_usage.json"

# Same list as in main.py list_discounts (single source of truth for codes and rules)
COUPONS = [
    {"code": "WELCOME10", "discount": 10, "type": "percent", "min_order": 500, "title": "Welcome 10% off", "category": None},
    {"code": "FLAT200", "discount": 200, "type": "flat", "min_order": 999, "title": "₹200 off", "category": None},
    {"code": "ELECTRONICS15", "discount": 15, "type": "percent", "min_order": 2000, "title": "15% off Electronics", "category": "Electronics"},
    {"code": "FASHION20", "discount": 20, "type": "percent", "min_order": 1500, "title": "20% off Fashion", "category": "Clothing"},
    {"code": "GAME1000", "discount": 1000, "type": "flat", "min_order": 50000, "title": "₹1000 off (Spin win)", "category": None},
    {"code": "JACKPOT2K", "discount": 2000, "type": "flat", "min_order": 50000, "title": "₹2000 off (Jackpot)", "category": None},
    {"code": "SCRATCH500", "discount": 500, "type": "flat", "min_order": 50000, "title": "₹500 off (Scratch)", "category": None},
    {"code": "FIRSTORDER", "discount": 15, "type": "percent", "min_order": 300, "title": "First order 15% off", "category": None},
    {"code": "FREESHIP", "discount": 0, "type": "shipping", "min_order": 499, "title": "Free shipping", "category": None},
    {"code": "WEEKEND25", "discount": 25, "type": "percent", "min_order": 2000, "title": "Weekend 25% off", "category": None},
]


def _load_usage() -> dict:
    """Load { user_id: [code, ...] } from file."""
    if not COUPON_USAGE_PATH.exists():
        return {}
    try:
        with open(COUPON_USAGE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_usage(usage: dict) -> None:
    COUPON_USAGE_PATH.parent.mkdir(parents=True, exist_ok=True)
    try:
        with open(COUPON_USAGE_PATH, "w", encoding="utf-8") as f:
            json.dump(usage, f, indent=2)
    except Exception:
        pass


def get_used_coupons(user_id: str) -> List[str]:
    """Return list of coupon codes already used by this user (first-time-only)."""
    usage = _load_usage()
    return list(usage.get(user_id, []))


def is_coupon_used_by_user(user_id: str, code: str) -> bool:
    code_upper = (code or "").strip().upper()
    return code_upper in get_used_coupons(user_id)


def mark_coupon_used(user_id: str, code: str) -> None:
    """Record that this user has used this coupon (first time only)."""
    code_upper = (code or "").strip().upper()
    if not code_upper or not user_id:
        return
    usage = _load_usage()
    used = usage.get(user_id, [])
    if code_upper not in used:
        used.append(code_upper)
        usage[user_id] = used
        _save_usage(usage)


def get_discount_amount(code: str, order_total: float) -> Optional[Tuple[float, str]]:
    """
    Validate coupon against order total and return (discount_amount, title) or None.
    Does not check first-time usage; that is done in validate_coupon.
    """
    code_upper = (code or "").strip().upper()
    for c in COUPONS:
        if c["code"] == code_upper:
            min_order = c.get("min_order", 0)
            if order_total < min_order:
                return None
            typ = c.get("type", "percent")
            discount_val = c.get("discount", 0)
            title = c.get("title", code_upper)
            if typ == "percent":
                amount = round(order_total * discount_val / 100.0, 2)
            elif typ == "flat":
                amount = min(float(discount_val), order_total)
            else:
                amount = 0.0  # e.g. shipping
            return (amount, title)
    return None


def validate_coupon(
    code: str,
    order_total: float,
    user_id: Optional[str] = None,
) -> Tuple[Optional[float], Optional[str], Optional[str]]:
    """
    Validate coupon: first-time-only per user, then rules.
    Returns (discount_amount, title, error_reason).
    If valid: (amount, title, None). If invalid: (None, None, reason).
    """
    if not (code or "").strip():
        return (None, None, "Invalid code")
    code_upper = (code or "").strip().upper()
    if user_id and is_coupon_used_by_user(user_id, code_upper):
        return (None, None, "already_used")
    result = get_discount_amount(code, order_total)
    if result is None:
        return (None, None, "invalid_or_min_order")
    return (result[0], result[1], None)
