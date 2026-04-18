"""
Event-driven proactive hints for Aura AI (not only reactive chat).
"""
from collections import Counter
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx

from app.data_store import get_cart, get_events, get_product, load_products
from app.models import EventType
from app.price_signals import price_change_since_yesterday, record_current_price
from app.user_preferences import get_preferences


def _count_recent_views(session_id: str, product_id: str, limit: int = 25) -> int:
    ev = get_events(session_id, limit=limit)
    n = 0
    for e in ev:
        if e.get("product_id") != product_id:
            continue
        if e.get("event_type") in (EventType.PRODUCT_CLICK.value, EventType.PAGE_VIEW.value):
            n += 1
    return n


def _cart_idle_hours(prefs: Dict[str, Any]) -> Optional[float]:
    raw = prefs.get("last_cart_activity")
    if not raw:
        return None
    try:
        t = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return (datetime.utcnow() - t.replace(tzinfo=None)).total_seconds() / 3600.0
    except Exception:
        return None


def _fetch_mumbai_rain_mm() -> Optional[float]:
    """Open-Meteo: precipitation sum current day (mm) for Mumbai."""
    try:
        url = (
            "https://api.open-meteo.com/v1/forecast?"
            "latitude=19.0760&longitude=72.8777&current=precipitation&timezone=Asia%2FKolkata"
        )
        with httpx.Client(timeout=4.0) as client:
            r = client.get(url)
            r.raise_for_status()
            data = r.json()
            cur = data.get("current") or {}
            # precipitation rate mm/h — treat >0.3 as "rainy enough"
            pr = cur.get("precipitation")
            if pr is None:
                return 0.0
            return float(pr)
    except Exception:
        return None


def get_proactive_hints(session_id: str, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Returns 0–3 hint objects: { id, text, product_ids?, actions? }
    """
    hints: List[Dict[str, Any]] = []
    prefs = get_preferences(user_id, session_id)
    cart_ids = get_cart(session_id)

    # 1) Repeated product views + optional price drop
    viewed = [
        e.get("product_id")
        for e in get_events(session_id, 40)
        if e.get("event_type") == EventType.PRODUCT_CLICK.value and e.get("product_id")
    ]
    if viewed:
        top = Counter(viewed).most_common(1)[0]
        pid, cnt = top[0], top[1]
        if cnt >= 3:
            p = get_product(pid)
            if p:
                record_current_price(pid, p.price)
                drop = price_change_since_yesterday(pid, p.price)
                if drop:
                    old, amt = drop
                    hints.append(
                        {
                            "id": "repeat_view_price",
                            "text": f"**Price update:** {p.name} was around ₹{old:.0f} — it's down about **₹{amt:.0f}** now. Open chat and say **add {pid} to cart** or tap the card.",
                            "product_ids": [pid],
                            "actions": [],
                        }
                    )
                else:
                    hints.append(
                        {
                            "id": "repeat_view",
                            "text": f"You've checked **{p.name}** a few times — still thinking? I can add **{pid}** to your cart or find similar items.",
                            "product_ids": [pid],
                            "actions": [],
                        }
                    )

    # 2) Cart idle — coupon nudge (10% off messaging is marketing; real coupon validation stays on checkout)
    if cart_ids:
        idle_h = _cart_idle_hours(prefs)
        if idle_h is not None and idle_h >= 1.0:
            hints.append(
                {
                    "id": "cart_idle_coupon",
                    "text": "You still have items in your cart. Want a **10% off** stackable coupon? I can take you to discounts — or say **apply coupon** in chat.",
                    "product_ids": cart_ids[:4],
                    "actions": [
                        {"type": "navigate", "label": "Get discounts", "payload": "/discounts"},
                    ],
                }
            )

    # 3) Rain → umbrellas / waterproof footwear
    rain = _fetch_mumbai_rain_mm()
    if rain is not None and rain > 0.25:
        products = load_products()
        umb = [p for p in products if p.category and "umbrella" in (p.name or "").lower()][:2]
        wet_shoes = [
            p
            for p in products
            if p.category == "Footwear" and any(x in (p.name or "").lower() for x in ("water", "rain", "proof"))
        ][:2]
        pids = [p.id for p in umb + wet_shoes][:4]
        if pids:
            hints.append(
                {
                    "id": "weather_rain",
                    "text": "**Looks rainy in Mumbai** — need an umbrella or waterproof shoes? Here are quick picks.",
                    "product_ids": pids,
                    "actions": [],
                }
            )

    return hints[:3]
