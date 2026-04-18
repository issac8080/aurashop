"""
AI layer: OpenAI-powered recommendation engine and chat assistant.
Uses prompt engineering for structured recommendations and natural chat.
"""
import json
import hashlib
from typing import List, Optional, Dict, Any
from app.config import OPENAI_API_KEY, USE_BUILTIN_CHAT
from app.data_store import (
    load_products,
    get_product,
    get_session_context,
    get_cached_recommendations,
    cache_recommendations,
    add_to_cart,
    clear_cart,
)
from app.models import Product

# Optional OpenAI client (graceful if no key)
try:
    from openai import OpenAI
    _client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
except Exception:
    _client = None

# Only log once when OpenAI key is invalid (avoid terminal spam)
_openai_invalid_logged = False


def _is_grocery_product(p: Product) -> bool:
    """Matches frontend getProductsByCategory('groceries') / getNonGroceryProducts split."""
    slug = (getattr(p, "category_slug", None) or "").lower()
    if slug == "groceries":
        return True
    cat = (p.category or "").lower()
    if cat in ("groceries", "grocery") or "grocery" in cat:
        return True
    blob = f"{(p.name or '')} {' '.join(getattr(p, 'tags', None) or [])} {cat}".lower()
    if any(
        t in blob
        for t in (
            "grocery",
            "staple",
            "fresh milk",
            "organic food",
            "beverage",
        )
    ):
        return True
    return False


def _filter_products_by_store_mode(all_products: List[Product], store_mode: Optional[str]) -> List[Product]:
    if not store_mode:
        return all_products
    sm = store_mode.lower()
    if sm == "groceries":
        return [p for p in all_products if _is_grocery_product(p)]
    if sm == "general":
        return [p for p in all_products if not _is_grocery_product(p)]
    return all_products


def _grocery_mode_system_block() -> str:
    return (
        "\n\n**STORE MODE: GROCERIES** — The customer is in the **Groceries** (food & essentials) store. "
        "Use **only** grocery-relevant product IDs from the list above. "
        "Do not suggest electronics, fashion, or other non-grocery products. If they request those, they can switch to **Aura** (general) in the site header.\n"
        "If they ask **how to cook** or for a **recipe** (e.g. biryani), give **brief cooking guidance** and suggest **only ingredient-like items** from the product list that match the dish "
        "(e.g. rice, spices, oil, yogurt, meat, onions). **Never** answer with unrelated “trending” snacks, random fruit, or bottled water unless the user asked for hydration."
    )


def _is_recipe_or_cooking_query(msg_lower: str) -> bool:
    cues = (
        "cook", "recipe", "how to make", "how to prepare", "how do i make", "biryani", "biriyani", "biryan",
        "curry", "ingredient", "marinate", "simmer", "boil", "fry", "roast", "bake",
    )
    return any(c in msg_lower for c in cues)


def _grocery_cooking_response(message: str, profile_name: str, products: List[Product]) -> tuple:
    """Recipe / how-to-cook in grocery mode: short tips + ingredient-matched SKUs only."""
    msg_l = (message or "").lower()
    ingredient_tokens = (
        "rice", "basmati", "biryani", "masala", "spice", "garam", "onion", "garlic", "ginger",
        "tomato", "yoghurt", "yogurt", "curd", "oil", "ghee", "chicken", "mutton", "meat", "beef",
        "salt", "chili", "chilli", "turmeric", "cumin", "cardamom", "cinnamon", "clove", "bay",
        "mint", "coriander", "saffron", "cream", "butter", "milk", "paneer", "lentil", "dal",
        "wheat", "atta", "flour", "stock", "broth",
    )
    scored: List[tuple] = []
    for p in products:
        blob = f"{p.name} {p.category} {' '.join(getattr(p, 'tags', None) or [])}".lower()
        score = sum(1 for t in ingredient_tokens if t in blob)
        if score > 0:
            scored.append((score, p.rating, p))
    scored.sort(key=lambda x: (-x[0], -x[1]))
    picks = [x[2] for x in scored[:6]]
    if not picks:
        picks = sorted(products, key=lambda p: (-p.rating, -p.review_count))[:4]
    dish_hint = (
        "Here’s a **compact biryani-style path** (adjust to what you have):"
        if ("biryani" in msg_l or "biriyani" in msg_l or "biryan" in msg_l)
        else "Here’s a **quick cooking outline** for your dish (adapt steps as needed):"
    )
    lines = [
        f"Hi {profile_name}! {dish_hint}",
        "• **Marinate** protein with yogurt + ginger-garlic + a pinch of turmeric; rest 20–30 min.",
        "• **Par-cook rice** (basmati) until ~70% done; drain.",
        "• **Layer** fried onions, protein, rice, warm spices; **dum** (tight lid / sealed) on low heat ~20 min.",
        "",
        "From our **Groceries** aisle, these items can help — tap a card to view details:",
    ]
    for i, p in enumerate(picks, 1):
        lines.append(f"{i}. **{p.id}** — {p.name} (₹{p.price:,.0f})")
    content = "\n".join(lines)
    return content, [p.id for p in picks[:6]]


def _normalize_store_mode_from_context(ctx: Optional[dict]) -> Optional[str]:
    if not ctx:
        return None
    v = (ctx.get("store_mode") or "").strip().lower()
    if v in ("groceries", "general"):
        return v
    return None


def _classify_intent(message: str) -> str:
    """
    Classify user message into: quick_order | order | recommend | faq | general.
    quick_order = conversational "order any X for me" (product by description). order = cart/checkout.
    """
    msg_lower = (message or "").strip().lower()
    if not msg_lower:
        return "general"
    # Quick order: "order any black shoe mens for me", "order me a shirt", "get me shoes", "buy me ..."
    quick_order_triggers = [
        "order any ", "order me ", "get me ", "buy me ",
        "order any ", "order a ", "order some ", "order black ", "order white ",
    ]
    product_words = ["shoe", "shoes", "footwear", "shirt", "dress", "watch", "bag", "laptop", "phone", "jeans", "sneaker", "formal", "casual"]
    if any(t in msg_lower for t in quick_order_triggers) and any(w in msg_lower for w in product_words):
        return "quick_order"
    if msg_lower.startswith(("order ", "buy ", "get me ", "purchase ")) and any(w in msg_lower for w in product_words):
        return "quick_order"
    # Order: buy, purchase, order, checkout, pay (and not asking "what is order")
    order_words = ["buy", "purchase", "order for me", "checkout", "pay for", "complete my order", "place order"]
    if any(w in msg_lower for w in order_words):
        return "order"
    if msg_lower.startswith(("order ", "buy ", "purchase ")) or " my cart" in msg_lower and ("checkout" in msg_lower or "buy" in msg_lower):
        return "order"
    # FAQ: how, what is, can i, return, refund, delivery, wallet, track, cancel, secure
    faq_triggers = [
        "how do i", "how can i", "what is ", "what are ", "can i ", "can we ",
        "return", "refund", "delivery", "wallet", "aurapoints", "track my order",
        "cancel order", "secure", "payment secure", "where is my order",
    ]
    if any(t in msg_lower for t in faq_triggers) and not any(w in msg_lower for w in ["recommend", "suggest", "find", "show me", "best ", "good "]):
        return "faq"
    # Recommend: recommend, suggest, find, show, best, good products, etc.
    rec_words = ["recommend", "suggest", "find me", "show me", "best ", "good ", "top ", "trending", "popular", "look for"]
    if any(w in msg_lower for w in rec_words) and "order" not in msg_lower:
        return "recommend"
    # Compare products
    if "compare" in msg_lower or " vs " in msg_lower or " versus " in msg_lower:
        return "compare"
    # Gift assistant ("do it for me" style)
    if any(
        t in msg_lower
        for t in [
            "birthday gift",
            "gift for",
            "present for",
            "gift under",
            "need a gift",
            "gift idea",
            "something for my",
        ]
    ):
        return "gift_assistant"
    return "general"


# Quick order via chat: session_id -> draft { step, attributes, product_id, product, candidates? }
_quick_order_drafts: Dict[str, dict] = {}
# Guided gift flow: session_id -> { step, budget_max?, style? }
_gift_drafts: Dict[str, dict] = {}


def _parse_quick_order_attributes(message: str) -> Dict[str, Any]:
    """Extract category, gender, color, size, budget_max, product_type from message."""
    import re
    msg = (message or "").strip().lower()
    out = {"category": None, "gender": None, "color": None, "size": None, "budget_max": None, "product_type": None}
    # Category: shoe/shoes/footwear -> Footwear; shirt -> Clothing; etc.
    if any(w in msg for w in ["shoe", "shoes", "footwear", "sneaker", "sneakers"]):
        out["category"] = "Footwear"
    elif any(w in msg for w in ["shirt", "shirts", "tshirt", "top", "dress", "jeans", "pant"]):
        out["category"] = "Clothing"
    elif any(w in msg for w in ["watch", "watches"]):
        out["category"] = "Accessories"
    elif any(w in msg for w in ["laptop", "phone", "electronics"]):
        out["category"] = "Electronics"
    elif any(w in msg for w in ["bag", "bags"]):
        out["category"] = "Accessories"
    # Gender
    if any(w in msg for w in ["men", "mens", "male", "man"]):
        out["gender"] = "men"
    elif any(w in msg for w in ["women", "womens", "female", "woman"]):
        out["gender"] = "women"
    # Color
    colors = ["black", "white", "blue", "red", "green", "grey", "gray", "brown", "navy", "beige"]
    for c in colors:
        if c in msg:
            out["color"] = c if c != "grey" else "gray"
            break
    # Size: 8, 9, 10, 11 from "size 10" or "10"
    size_match = re.search(r"\b(size\s*)?(8|9|10|11)\b", msg)
    if size_match:
        out["size"] = int(size_match.group(2))
    # Budget (handles "under ₹2500", "under 2500", "₹2500", "below Rs. 3000")
    if "no limit" in msg or ("any" in msg and "budget" not in msg):
        out["budget_max"] = None
    else:
        budget_match = re.search(
            r"(?:under|below|upto|up to|less than|max|within)\s+₹?\s*(\d{1,7})|₹\s*(\d{1,7})",
            msg,
        )
        if budget_match:
            g1, g2 = budget_match.group(1), budget_match.group(2)
            out["budget_max"] = int(g1 or g2)
        if "1000" in msg and "2000" in msg and out.get("budget_max") is None:
            out["budget_max"] = 2000
    # Type: running/jogging → sports; casual, formal, sports
    if "running" in msg or "jogging" in msg or "trainer" in msg:
        out["product_type"] = "sports"
    elif "casual" in msg:
        out["product_type"] = "casual"
    elif "formal" in msg:
        out["product_type"] = "formal"
    elif "sport" in msg:
        out["product_type"] = "sports"
    size_match2 = re.search(r"\b(?:size|uk)?\s*(8|9|10|11)\b", msg)
    if size_match2 and out.get("size") is None:
        out["size"] = int(size_match2.group(1))
    return out


def _merge_quick_order_from_message(message: str, attrs: Dict[str, Any]) -> Dict[str, Any]:
    """Parse button-style response (e.g. 'Size 10', 'Under ₹1000') into attributes."""
    import re

    msg = (message or "").strip().lower()
    out = dict(attrs)
    bm = re.search(r"(?:under|below|upto)\s+₹?\s*(\d{1,7})", msg)
    if bm and out.get("budget_max") is None:
        out["budget_max"] = int(bm.group(1))
    if "size" in msg or msg.strip() in ("8", "9", "10", "11"):
        for n in (8, 9, 10, 11):
            if str(n) in msg or f"size {n}" in msg:
                out["size"] = n
                break
    if "under ₹1000" in msg or "under 1000" in msg or "₹1000" in msg and "2000" not in msg:
        out["budget_max"] = 1000
    elif "1000" in msg and "2000" in msg or "₹1000–₹2000" in msg:
        out["budget_max"] = 2000
    elif "no limit" in msg:
        out["budget_max"] = 999999
    if "casual" in msg:
        out["product_type"] = "casual"
    elif "formal" in msg:
        out["product_type"] = "formal"
    elif "sport" in msg:
        out["product_type"] = "sports"
    return out


def _select_product_for_quick_order(attrs: Dict[str, Any], products: List[Product]) -> Optional[Product]:
    """Select best product: category/color/budget match, in-stock, highest rating."""
    category = attrs.get("category")
    color = attrs.get("color")
    budget_max = attrs.get("budget_max")
    product_type = attrs.get("product_type")

    def _pool(use_type: bool) -> List[Product]:
        pt = product_type if use_type else None
        candidates = list(products)
        if category:
            cat_l = category.lower()
            candidates = [
                p
                for p in candidates
                if cat_l in (p.category or "").lower()
                or (p.name and cat_l in p.name.lower())
                or (category == "Footwear" and "shoe" in (p.name or "").lower())
                or (category == "Clothing" and any(
                    x in (p.category or "").lower() for x in ("cloth", "fashion", "shirt", "dress")
                ))
            ]
        if color:
            candidates = [
                p
                for p in candidates
                if (p.colors and any(color in c.lower() for c in p.colors)) or (p.name and color in p.name.lower())
            ]
        if budget_max is not None:
            candidates = [p for p in candidates if p.price <= budget_max]
        candidates = [p for p in candidates if getattr(p, "in_stock", True)]
        if pt:
            narrowed = [
                p
                for p in candidates
                if pt in (p.name or "").lower()
                or pt in (p.category or "").lower()
                or (p.tags and pt in " ".join(p.tags).lower())
            ]
            if narrowed:
                candidates = narrowed
        return candidates

    candidates = _pool(use_type=True)
    if not candidates and product_type:
        candidates = _pool(use_type=False)
    if not candidates:
        return None
    return max(candidates, key=lambda p: (p.rating, -p.price))


def _select_two_products_for_quick_order(attrs: Dict[str, Any], products: List[Product]) -> List[Product]:
    """Top two distinct matches for one-shot quick order (user picks A/B)."""

    def _filter(use_type: bool) -> List[Product]:
        category = attrs.get("category")
        color = attrs.get("color")
        budget_max = attrs.get("budget_max")
        product_type = attrs.get("product_type") if use_type else None
        candidates = list(products)
        if category:
            cat_l = category.lower()
            candidates = [
                p
                for p in candidates
                if cat_l in (p.category or "").lower()
                or (p.name and cat_l in p.name.lower())
                or (category == "Footwear" and "shoe" in (p.name or "").lower())
                or (category == "Clothing" and any(
                    x in (p.category or "").lower() for x in ("cloth", "fashion", "shirt", "dress")
                ))
            ]
        if color:
            candidates = [
                p
                for p in candidates
                if (p.colors and any(color in c.lower() for c in p.colors)) or (p.name and color in p.name.lower())
            ]
        if budget_max is not None:
            candidates = [p for p in candidates if p.price <= budget_max]
        candidates = [p for p in candidates if getattr(p, "in_stock", True)]
        if product_type:
            narrowed = [
                p
                for p in candidates
                if product_type in (p.name or "").lower()
                or product_type in (p.category or "").lower()
                or (p.tags and product_type in " ".join(p.tags).lower())
            ]
            if len(narrowed) >= 1:
                candidates = narrowed
        return candidates

    candidates = _filter(use_type=True)
    if len(candidates) < 2 and attrs.get("product_type"):
        candidates = _filter(use_type=False)
    if len(candidates) < 2:
        return candidates[:2]
    ranked = sorted(candidates, key=lambda p: (p.rating, -p.price))
    return [ranked[0], ranked[1]]


def _quick_order_one_shot_ready(attrs: Dict[str, Any]) -> bool:
    """True when user gave enough detail to skip size/budget steps."""
    c = attrs.get("category")
    if not c:
        return False
    if c == "Footwear":
        return attrs.get("size") is not None and attrs.get("budget_max") is not None
    return attrs.get("budget_max") is not None


def _parse_agent_intent(message: str, orders_info: List[dict], cart_count: int) -> Dict[str, Any]:
    """
    Use OpenAI to parse user message into agent intent + params.
    Returns {"intent": "cancel_order"|"reorder_last"|"book_at_store"|"deliver_cart"|"none", "order_id": "last"|"ORD-XXX" or null}.
    """
    if not _client or not OPENAI_API_KEY:
        return {"intent": "none", "order_id": None}
    msg = (message or "").strip().lower()
    if not msg:
        return {"intent": "none", "order_id": None}
    order_ids = [o["id"] for o in orders_info[:5]]
    prompt = f"""You are an intent parser for a shopping assistant. The user can ask to:
- cancel an order (e.g. "cancel this", "cancel my order", "cancel my last order", "cancel order ORD-XXX")
- reorder / repeat last order (e.g. "take my last order", "reorder", "repeat my last order", "order again")
- book cart at store / store pickup (e.g. "book me this at store", "store pickup", "I'll pick up at store")
- deliver cart / home delivery (e.g. "deliver me this", "deliver this product", "home delivery", "ship it")

User message: "{message}"

User's orders (newest first): {order_ids or "none"}
User's cart has {cart_count} items.

Reply with ONLY a JSON object, no other text:
{{"intent": "cancel_order"|"reorder_last"|"book_at_store"|"deliver_cart"|"none", "order_id": "last"|"ORD-XXX"|null}}

Rules:
- For cancel: use "cancel_order", order_id "last" means their most recent order, or use exact order ID if user said it.
- For reorder/repeat last order: use "reorder_last", order_id null.
- For store pickup/book at store: use "book_at_store", order_id null.
- For home delivery/deliver: use "deliver_cart", order_id null.
- If unclear or not an action request: use "none", order_id null."""
    try:
        resp = _client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=80,
        )
        text = (resp.choices[0].message.content or "").strip()
        # Extract JSON (handle markdown code blocks)
        if "```" in text:
            text = text.split("```")[1].replace("json", "").strip()
        data = json.loads(text)
        intent = (data.get("intent") or "none").strip().lower()
        if intent not in ("cancel_order", "reorder_last", "book_at_store", "deliver_cart", "none"):
            intent = "none"
        order_id = data.get("order_id")
        if order_id and isinstance(order_id, str):
            order_id = order_id.strip()
        else:
            order_id = None
        return {"intent": intent, "order_id": order_id}
    except Exception:
        return {"intent": "none", "order_id": None}


def _execute_agent_action(
    session_id: str,
    intent: str,
    order_id_param: Optional[str],
    orders_info: List[dict],
    cart_items: List[Product],
    profile_name: str,
    profile_address: Optional[str],
) -> Optional[tuple]:
    """
    Execute agent action: cancel_order, reorder_last, book_at_store, deliver_cart.
    Returns (content, product_ids) or None if action not taken.
    """
    from app.order_service import (
        get_user_orders,
        get_order,
        update_order_status,
        create_order,
        get_available_stores,
    )
    from app.models import OrderItem
    from app.models import OrderStatus, DeliveryMethod

    if intent == "cancel_order":
        order_id = order_id_param
        if order_id == "last" and orders_info:
            order_id = orders_info[0]["id"]
        if not order_id:
            return (f"Hi {profile_name}! I need to know which order to cancel. Say 'cancel my last order' or give the order ID (e.g. ORD-XXX).", [])
        order = get_order(order_id)
        if not order or order.user_id != session_id:
            return (f"Order {order_id} not found or it's not yours. I can only cancel your orders.", [])
        if order.status.value == "cancelled":
            return (f"Order {order_id} is already cancelled.", [])
        update_order_status(order_id, OrderStatus.CANCELLED)
        return (f"Done! I've cancelled your order **{order_id}**. You can place a new order anytime.", [])

    if intent == "reorder_last":
        if not orders_info:
            return (f"Hi {profile_name}! You don't have any previous orders to reorder.", [])
        last_order = get_order(orders_info[0]["id"])
        if not last_order or not last_order.items:
            return (f"Hi {profile_name}! Your last order has no items to add.", [])
        added = []
        for item in last_order.items:
            add_to_cart(session_id, item.product_id)
            added.append(item.product_id)
        return (f"I've added your last order items to the cart. You can checkout when ready. Go to [Cart](/cart) or say 'book at store' / 'deliver to me'.", list(dict.fromkeys(added))[:6])

    if intent == "book_at_store":
        if not cart_items:
            return (f"Hi {profile_name}! Your cart is empty. Add items first, then say 'book at store' or 'store pickup'.", [])
        stores = get_available_stores()
        store_id = stores[0]["id"] if stores else "store_1"
        store_name = stores[0]["name"] if stores else "Store"
        items = [OrderItem(product_id=p.id, quantity=1, price=p.price) for p in cart_items]
        order = create_order(
            user_id=session_id,
            items=items,
            delivery_method=DeliveryMethod.STORE_PICKUP,
            store_location=store_id,
        )
        clear_cart(session_id)
        return (f"Done! I've placed your order for **store pickup**. Order ID: **{order.id}**. Show the QR code at {store_name} to collect. View order: [Order {order.id}](/orders/{order.id})", [])

    if intent == "deliver_cart":
        if not cart_items:
            return (f"Hi {profile_name}! Your cart is empty. Add items first, then say 'deliver to me' or 'home delivery'.", [])
        address = profile_address or "Default address (update in Profile)"
        items = [OrderItem(product_id=p.id, quantity=1, price=p.price) for p in cart_items]
        order = create_order(
            user_id=session_id,
            items=items,
            delivery_method=DeliveryMethod.HOME_DELIVERY,
            delivery_address=address,
        )
        clear_cart(session_id)
        return (f"Done! I've placed your order for **home delivery**. Order ID: **{order.id}**. We'll deliver to {address[:30]}... View order: [Order {order.id}](/orders/{order.id})", [])

    return None


def _handle_faq_rag(message: str) -> Optional[str]:
    """RAG FAQ: search FAQ, then LLM answer from context. Returns content or None on failure."""
    try:
        from app.rag_store import search_faq
        chunks = search_faq(message, top_k=3)
        if not chunks:
            return None
        context = "\n\n".join([f"Q: {c.get('question', '')}\nA: {c.get('answer', '')}" for c in chunks])
        prompt = f"""Answer the user's question using ONLY the following FAQ excerpts. Be concise and friendly. If the answer is not in the excerpts, say "I don't have that specific information; please contact support or try asking about orders, wallet, or recommendations."

FAQ excerpts:
{context}

User question: {message}

Your answer (2-4 sentences):"""
        if _client and OPENAI_API_KEY:
            resp = _client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=200,
            )
            return (resp.choices[0].message.content or "").strip()
        # No OpenAI: return first matching FAQ answer
        return chunks[0].get("answer", "").strip() or None
    except Exception:
        return None


def _review_sentiment_line(p: Product) -> str:
    if p.rating >= 4.3:
        return f"Shoppers often mention **value** and satisfaction; **{p.rating}★** from {p.review_count}+ reviews."
    if p.rating >= 3.8:
        return f"Reviews lean positive on **day-to-day use**; **{p.rating}★** across {p.review_count}+ ratings."
    return f"Mixed notes in reviews — worth scanning details. **{p.rating}★** ({p.review_count} reviews)."


def _format_product_compare(
    message: str, profile_name: str, store_mode: Optional[str] = None
) -> Optional[tuple]:
    """Side-by-side compare: legacy P00 IDs or real catalog IDs (e.g. SHOEH4GRSUBJGZXE)."""
    import re

    raw = message or ""
    found_ids: List[str] = []

    for x in re.findall(r"\b(P\d{3,8})\b", raw, re.I):
        p = get_product(x.upper())
        if p and p.id not in found_ids:
            found_ids.append(p.id)

    if len(found_ids) < 2:
        # Flipkart-style IDs in products.json: letter + alphanumeric, ~10–18 chars
        for m in re.finditer(r"\b([A-Za-z][A-Za-z0-9]{9,17})\b", raw):
            token = m.group(1).upper()
            pr = get_product(token)
            if pr and pr.id not in found_ids:
                found_ids.append(pr.id)
            if len(found_ids) >= 2:
                break

    if len(found_ids) < 2:
        return None

    p1, p2 = get_product(found_ids[0]), get_product(found_ids[1])
    if not p1 or not p2:
        return (
            f"Hi {profile_name}! I couldn't load those product IDs. Open any product page and copy the **ID** from the URL or title, e.g. "
            f"**Compare SHOEH4GRSUBJGZXE vs SRTEH2FF9KEDEFGF** (use two different IDs from our catalog).",
            [],
        )
    if store_mode == "groceries" and (not _is_grocery_product(p1) or not _is_grocery_product(p2)):
        return (
            f"Hi {profile_name}! In **Groceries** mode I can only compare **grocery** items. "
            f"Switch the store to **Aura** in the header to compare fashion, electronics, and more.",
            [],
        )
    lines = [
        f"Hi {profile_name}! Here's a straight **comparison** (not generic search results).",
        "",
        f"| | **{p1.name[:42]}** | **{p2.name[:42]}** |",
        "|---|---|---|",
        f"| **Price** | ₹{p1.price:,.0f} | ₹{p2.price:,.0f} |",
        f"| **Rating** | {p1.rating}★ ({p1.review_count} reviews) | {p2.rating}★ ({p2.review_count} reviews) |",
        f"| **Category** | {p1.category} | {p2.category} |",
        "",
        f"**Reviews — {p1.id}:** {_review_sentiment_line(p1)}",
        f"**Reviews — {p2.id}:** {_review_sentiment_line(p2)}",
        "",
    ]
    if p1.rating != p2.rating:
        winner = p1 if p1.rating > p2.rating else p2
        lines.append(
            f"**Verdict:** **{winner.name[:48]}** wins on rating; pick the other if **₹{min(p1.price, p2.price):,.0f}** matters more."
        )
    else:
        lines.append("**Verdict:** Tie on rating — choose by **price** or **brand** preference.")
    return ("\n".join(lines), [p1.id, p2.id])


def _build_quick_order_confirm_content(
    session_id: str,
    product: Product,
    profile_name: str,
    wallet_info: dict,
    request_context: dict,
    attrs: Optional[Dict[str, Any]] = None,
) -> tuple:
    """Human copy + actions for quick-order confirm step."""
    from app.order_service import get_user_profile

    profile = None
    try:
        profile = get_user_profile(request_context.get("user_id") or session_id)
    except Exception:
        pass
    address = "Default address (update in Profile)"
    if profile and getattr(profile, "addresses", None):
        addrs = profile.addresses if isinstance(profile.addresses, list) else []
        if addrs:
            address = addrs[0]
    wallet_bal = wallet_info.get("balance", 0)
    size_hint = ""
    if attrs and attrs.get("size"):
        size_hint = f"\n_I can remember **size {attrs['size']}** for your next shoe order._\n"
    content = (
        f"Hi {profile_name}! Here's the best match right now:\n\n**{product.name}** — **₹{product.price}** ({product.rating}⭐){size_hint}"
        f"\n\n**Order summary:**\n• Product: {product.name}\n• Price: ₹{product.price}\n"
        f"• Delivery: {address[:50]}{'...' if len(address) > 50 else ''}\n• Payment: Card / UPI at checkout\n• Wallet: ₹{wallet_bal:.0f} available\n\n"
        f"Ready to place it?"
    )
    actions = [
        {"type": "quick_order_confirm", "label": "Confirm & Place Order", "payload": "confirm"},
        {"type": "quick_order_change", "label": "Change Details", "payload": "change"},
    ]
    return content, actions


def _process_gift_assistant(session_id: str, message: str, profile_name: str, products: List[Product]) -> Optional[tuple]:
    """Short guided flow: budget → recipient → 3 curated picks ('do it for me')."""
    import re

    global _gift_drafts
    msg = (message or "").strip().lower()
    d = _gift_drafts.get(session_id)

    if not d:
        bm = re.search(r"(?:under|below|upto|up to|₹)\s*(\d{3,6})", msg)
        budget = int(bm.group(1)) if bm else None
        if budget:
            _gift_drafts[session_id] = {"step": "who", "budget_max": budget}
            return (
                f"Got it — **under ₹{budget}**. Who's it for? Reply **kid**, **parent**, **partner**, or **friend** — I'll shortlist 3 ideas.",
                [],
            )
        _gift_drafts[session_id] = {"step": "budget", "budget_max": None}
        return (
            f"Let's nail a gift, {profile_name}. What's your **budget**? (e.g. **under ₹2000** — I'll remember it for next time.)",
            [],
        )

    if d.get("step") == "budget":
        bm = re.search(r"(?:under|below|₹)\s*(\d{3,6})", msg)
        if not bm:
            return ("What's your budget number? e.g. **under ₹1500**", [])
        budget = int(bm.group(1))
        d["budget_max"] = budget
        d["step"] = "who"
        _gift_drafts[session_id] = d
        return (
            f"**₹{budget}** — nice. Who's it for? **kid**, **parent**, **partner**, or **friend**?",
            [],
        )

    if d.get("step") == "who":
        budget = d.get("budget_max") or 3000
        tags = []
        if "kid" in msg or "child" in msg:
            tags = ["toy", "game", "fun", "color"]
        elif "parent" in msg or "mom" in msg or "dad" in msg:
            tags = ["classic", "comfort", "home"]
        elif "partner" in msg or "wife" in msg or "husband" in msg:
            tags = ["premium", "elegant", "gift"]
        else:
            tags = ["popular", "gift", "trending"]
        pool = [p for p in products if p.price <= budget and getattr(p, "in_stock", True)]
        pool = sorted(pool, key=lambda p: (-p.rating, -p.review_count))[:40]
        picked = pool[:3]
        if not picked:
            del _gift_drafts[session_id]
            return ("Nothing in stock in that range — try a slightly higher budget?", [])
        intro = (
            f"Here are **3 gift ideas** under ₹{budget} — picked for **{tags[0]}** vibes. "
            f"Tap a card to add, or say **deliver to me** after adding to cart."
        )
        lines = [f"Hi {profile_name}! {intro}", ""]
        for i, p in enumerate(picked, 1):
            lines.append(f"{i}. **{p.id}** — {p.name} (₹{p.price}) · {p.rating}⭐")
        del _gift_drafts[session_id]
        return ("\n".join(lines), [p.id for p in picked])


def _handle_recommend_rag(
    session_id: str, message: str, profile_name: str, context: dict, store_mode: Optional[str] = None
) -> Optional[tuple]:
    """
    RAG recommend: hybrid search -> top 15 -> LLM rerank top 5 -> preference boost.
    Returns (content, product_ids) or None on failure.
    """
    try:
        import math

        from app.behavior_signals import rank_products_with_behavior
        from app.rag_store import search_products_hybrid

        hybrid = search_products_hybrid(message, top_k=15)
        if not hybrid:
            return None
        product_ids = [h["product_id"] for h in hybrid]
        products = []
        for pid in product_ids:
            p = get_product(pid)
            if p:
                products.append(p)
        if store_mode == "groceries":
            products = [p for p in products if _is_grocery_product(p)]
        if not products:
            if store_mode == "groceries" and product_ids:
                return (
                    f"Hi {profile_name}! I didn't find **grocery** matches for that. Try **staples**, **dairy**, **snacks**, or a budget like **under ₹500**.",
                    [],
                )
            return None
        # Build product list for LLM
        product_list = "\n".join(
            [f"- {p.id}: {p.name}, ₹{p.price}, {p.category}, rating {p.rating}, tags: {', '.join(p.tags)}"
             for p in products[:15]]
        )
        user_pref = _build_user_summary(context)
        prompt = f"""You are a shopping recommendation assistant. The user asked: "{message}"

User context:
{user_pref}

Candidate products (from search):
{product_list}

Task: Pick the BEST 5 product IDs that match the user's request. Consider budget, category, and quality.
Respond with a JSON array only, no other text: [{{"product_id": "<id>", "reason": "<one short reason>"}}, ...]
Example: [{{"product_id": "P001", "reason": "Best value under budget"}}, ...]"""
        top5_ids = []
        content = ""
        if _client and OPENAI_API_KEY:
            try:
                resp = _client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3,
                    max_tokens=400,
                )
                text = (resp.choices[0].message.content or "").strip()
                if "```" in text:
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:]
                arr = json.loads(text)
                if isinstance(arr, list):
                    valid_ids = {p.id for p in products}
                    for r in arr:
                        if isinstance(r, dict) and r.get("product_id") and r["product_id"] in valid_ids:
                            top5_ids.append(r["product_id"])
                            if r.get("reason"):
                                content += f"• **{r['product_id']}**: {r['reason']}\n"
            except Exception:
                pass
        if not top5_ids:
            top5_ids = [p.id for p in products[:5]]
        # Re-rank by behavior (clicks/adds/purchases) + trending (review volume)
        uid = context.get("active_user_id")
        trending_boost = {}
        for pid in top5_ids:
            pr = get_product(pid)
            if pr:
                trending_boost[pid] = math.log(1 + max(pr.review_count, 0)) / 15.0
        top5_ids = rank_products_with_behavior(uid, session_id, list(dict.fromkeys(top5_ids)), trending_boost)[:8]
        # Preference boost: if user said "under X", move matching products up
        import re
        budget_match = re.search(r"under\s+₹?(\d+)|below\s+₹?(\d+)|<\s*₹?(\d+)", message.lower())
        budget = None
        if budget_match:
            for g in budget_match.groups():
                if g:
                    budget = int(g)
                    break
        if budget:
            def rank_key(pid: str) -> tuple:
                p = get_product(pid)
                if not p:
                    return (1, 0)
                in_budget = 0 if p.price <= budget else 1
                return (in_budget, -p.rating)
            top5_ids = sorted(top5_ids, key=rank_key)[:5]
        if not content:
            content = (
                f"Hi {profile_name}! I ranked these by **your past clicks/cart buys**, **trending reviews**, "
                f"and fit — the **top 3** below have the best chance you'll love them:\n\n"
            )
            for i, pid in enumerate(top5_ids[:5], 1):
                p = get_product(pid)
                if p:
                    content += f"{i}. **{p.id}** - {p.name}, ₹{p.price} | {p.rating}⭐\n"
            content += "\nTap a card — to **compare**, paste two catalog IDs: **Compare SHOEH4GRSUBJGZXE vs SRTEH2FF9KEDEFGF**."
        else:
            content = (
                f"Hi {profile_name}! Personalized with **behavior + trending** signals:\n\n"
                + content
                + "\nTap a card — or ask to **compare** two IDs."
            )
        return (content, top5_ids[:5])
    except Exception:
        return None


def _product_summary(p: Product) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "price": p.price,
        "category": p.category,
        "rating": p.rating,
        "colors": p.colors,
        "tags": p.tags,
    }


def _build_user_summary(context: dict) -> str:
    profile = context.get("profile", {}) or {}
    budget = profile.get("max_budget") or (context.get("budget_signals") or [None])[-1]
    categories = profile.get("preferred_categories") or context.get("categories_viewed", [])
    queries = context.get("search_queries", [])
    viewed = context.get("viewed_product_ids", [])
    cart = context.get("cart_ids", [])
    parts = []
    ps = (context.get("preference_summary") or "").strip()
    if ps:
        parts.append(f"Saved preferences: {ps}")
    if context.get("user_name"):
        parts.append(f"Logged-in user: {context['user_name']}")
    if context.get("order_categories"):
        parts.append(f"Past order categories: {', '.join(context['order_categories'][:5])}")
    if context.get("preferred_stores"):
        parts.append(f"Preferred stores: {', '.join(context['preferred_stores'][:3])}")
    if budget:
        parts.append(f"Budget signal: under ₹{budget}")
    if categories:
        parts.append(f"Categories of interest: {', '.join(categories[:5])}")
    if queries:
        parts.append(f"Recent searches: {', '.join(queries[:3])}")
    if viewed:
        parts.append(f"Recently viewed product IDs: {', '.join(viewed[:8])}")
    if cart:
        parts.append(f"Cart product IDs: {', '.join(cart)}")
    return "\n".join(parts) if parts else "New user, no history yet."


def get_recommendations(
    session_id: str,
    limit: int = 5,
    max_price: Optional[float] = None,
    category: Optional[str] = None,
    exclude_product_ids: Optional[List[str]] = None,
    user_id: Optional[str] = None,
) -> List[dict]:
    """
    Hybrid recommendation: rule-based + AI ranking.
    When user_id (email) is provided, enriches context with profile and order history for personalization.
    Returns list of { product_id, reason, confidence }.
    """
    context = get_session_context(session_id)
    if user_id:
        try:
            from app.order_service import get_user_profile, get_user_orders

            profile = get_user_profile(user_id)
            orders = get_user_orders(user_id)
            if profile:
                context["user_name"] = profile.name or user_id
                context["preferred_stores"] = profile.preferred_stores or []
            if orders:
                order_cats = []
                for o in orders[:20]:
                    for item in getattr(o, "items", []) or []:
                        pid = getattr(item, "product_id", None)
                        if pid:
                            from app.data_store import get_product
                            p = get_product(pid)
                            if p and p.category and p.category not in order_cats:
                                order_cats.append(p.category)
                context["order_categories"] = order_cats[:10]
        except Exception:
            pass
    try:
        from app.user_preferences import enrich_context

        context = enrich_context(context, user_id, session_id)
    except Exception:
        pass
    context_key = hashlib.md5(
        f"{limit}_{max_price}_{category}_{exclude_product_ids}_{user_id or ''}".encode()
    ).hexdigest()
    cached = get_cached_recommendations(session_id, context_key)
    if cached is not None:
        return cached

    products = load_products()
    exclude = set(exclude_product_ids or [])
    # Filter by category and price
    candidates = [
        p for p in products
        if p.id not in exclude
        and (category is None or p.category == category)
        and (max_price is None or p.price <= max_price)
    ]
    if not candidates:
        candidates = [p for p in products if p.id not in exclude][:20]

    user_summary = _build_user_summary(context)
    product_list = "\n".join(
        [f"- {p.id}: {p.name}, ₹{p.price}, {p.category}, rating {p.rating}, tags: {', '.join(p.tags)}"
         for p in candidates[:50]]
    )
    prompt = f"""You are a shopping recommendation engine. Given the user context and product list, recommend exactly {limit} products.

User context:
{user_summary}

Available products (id, name, price, category, rating, tags):
{product_list}

Respond with a JSON array only, no other text. Each item: {{ "product_id": "<id>", "reason": "<short reason in 1 line>", "confidence": <0-1 number> }}.
Order by relevance. Prefer products that match budget, category affinity, and high ratings."""

    result: List[dict] = []
    if _client and OPENAI_API_KEY:
        try:
            resp = _client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
            )
            text = (resp.choices[0].message.content or "").strip()
            # Extract JSON array (handle markdown code block)
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            result = json.loads(text)
            if not isinstance(result, list):
                result = [result]
            valid_ids = {p.id for p in candidates}
            valid = []
            for r in result:
                if isinstance(r, dict) and r.get("product_id") and r["product_id"] in valid_ids:
                    valid.append({
                        "product_id": r["product_id"],
                        "reason": r.get("reason", "Recommended for you"),
                        "confidence": float(r.get("confidence", 0.8)),
                    })
                if len(valid) >= limit:
                    break
            result = valid
        except Exception:
            pass

    # Fallback: rule-based ranking by rating and price match
    if not result:
        by_rating = sorted(candidates, key=lambda p: (-p.rating, p.price))[:limit]
        budget = (context.get("budget_signals") or [None])[-1]
        for p in by_rating:
            reason = f"High rating ({p.rating})"
            if budget and p.price <= budget:
                reason = f"Within your budget, high rating"
            result.append({
                "product_id": p.id,
                "reason": reason,
                "confidence": 0.75,
            })

    # Attach full product for frontend (product cards)
    out = []
    for r in result:
        prod = get_product(r["product_id"])
        if prod:
            out.append({
                **r,
                "product": prod.model_dump(),
            })
    cache_recommendations(session_id, context_key, out)
    return out


def chat(session_id: str, message: str, history: Optional[List[dict]] = None, context: Optional[dict] = None) -> dict:
    """
    Enhanced AI shopping assistant with FULL SYSTEM ACCESS - true agent capabilities.
    Returns { content, product_ids } for inline product cards.
    """
    from app.order_service import get_user_orders, get_user_profile
    from app.user_preferences import enrich_context
    from app.wallet_service import get_wallet_summary
    from app.data_store import get_categories

    request_context = context if isinstance(context, dict) else {}
    user_id_for_data = request_context.get("user_id") or session_id
    _store_mode = _normalize_store_mode_from_context(request_context)

    context = enrich_context(get_session_context(session_id), request_context.get("user_id"), session_id)
    products = _filter_products_by_store_mode(load_products(), _store_mode)

    # Get comprehensive user data
    cart_ids = context.get("cart_ids", [])
    cart_items = []
    cart_total = 0
    if cart_ids:
        cart_items = [get_product(pid) for pid in cart_ids]
        cart_items = [p for p in cart_items if p]
        cart_total = sum(p.price for p in cart_items)

    # Get orders
    orders_info = []
    try:
        orders = get_user_orders(user_id_for_data)
        for order in orders[:3]:
            orders_info.append({
                "id": order.id,
                "total": order.total,
                "status": order.status.value,
                "items_count": len(order.items)
            })
    except Exception:
        pass

    # Get wallet
    wallet_info = {"balance": 0, "pending_points": 0, "total_earned": 0}
    try:
        wallet_summary = get_wallet_summary(user_id_for_data)
        wallet_info = {
            "balance": wallet_summary.get("balance", 0),
            "pending_points": wallet_summary.get("pending_points", 0),
            "total_earned": wallet_summary.get("total_earned", 0),
            "expiring_soon": wallet_summary.get("expiring_soon", 0)
        }
    except Exception:
        pass

    # Get profile
    profile_name = "there"
    try:
        profile = get_user_profile(user_id_for_data)
        if profile and profile.name:
            profile_name = profile.name
    except Exception:
        pass
    
    # Sample products across categories
    by_cat: Dict[str, List[Product]] = {}
    for p in products:
        by_cat.setdefault(p.category, []).append(p)
    sampled = []
    for cat_products in by_cat.values():
        sampled.extend(cat_products[:10])
    sampled = (sampled + products)[:100]
    product_list = "\n".join(
        [f"- {p.id}: {p.name}, ₹{p.price}, {p.category}, {p.rating}⭐"
         for p in sampled]
    )
    
    user_context = _build_user_summary(context)
    cart_summary = ""
    if cart_items:
        cart_summary = f"Cart ({len(cart_items)} items, ₹{cart_total}): " + ", ".join([f"{p.name} (₹{p.price})" for p in cart_items[:3]])
        if len(cart_items) > 3:
            cart_summary += f" +{len(cart_items)-3} more"
    
    categories = get_categories()

    # Agent layer: parse intent with OpenAI and execute actions (cancel, reorder, book at store, deliver)
    agent_result = _parse_agent_intent(message, orders_info, len(cart_items))
    if agent_result.get("intent") and agent_result["intent"] != "none":
        profile_address = None
        try:
            profile = get_user_profile(user_id_for_data)
            if profile and getattr(profile, "addresses", None):
                addrs = profile.addresses if isinstance(profile.addresses, list) else []
                if addrs:
                    profile_address = addrs[0]
        except Exception:
            pass
        action_result = _execute_agent_action(
            session_id,
            agent_result["intent"],
            agent_result.get("order_id"),
            orders_info,
            cart_items,
            profile_name,
            profile_address,
        )
        if action_result:
            return {"content": action_result[0], "product_ids": action_result[1][:6]}

    # Intent-based routing: order -> agentic flow; recommend -> RAG; faq -> RAG; else general chat
    intent = _classify_intent(message)
    if intent == "compare":
        cmp_res = _format_product_compare(message, profile_name, _store_mode)
        if cmp_res and cmp_res[0]:
            return {"content": cmp_res[0], "product_ids": cmp_res[1][:6]}
        return {
            "content": "I need **two product IDs** — e.g. **Compare SHOEH4GRSUBJGZXE vs SRTEH2FF9KEDEFGF** (IDs match your catalog / product URLs).",
            "product_ids": [],
        }
    if intent == "gift_assistant" or session_id in _gift_drafts:
        gr = _process_gift_assistant(session_id, message, profile_name, products)
        if gr:
            return {"content": gr[0], "product_ids": gr[1][:6]}
    if intent == "order":
        if cart_items:
            content = f"Hi {profile_name}! I can help you complete your purchase.\n\n"
            content += f"Items in your cart: {len(cart_items)}\nTotal: **₹{cart_total}**\n"
            content += f"Estimated AuraPoints: ₹{(cart_total * (0.07 if cart_total >= 1000 else 0.05)):.0f}\n\n"
            content += "Go to [Checkout](/checkout) to finalize your order."
            return {"content": content, "product_ids": [p.id for p in cart_items[:6]]}
        content = f"Hi {profile_name}! Your cart is empty. Tell me what you're looking for and I'll recommend products!"
        return {"content": content, "product_ids": []}
    if intent == "faq":
        faq_content = _handle_faq_rag(message)
        if faq_content:
            return {"content": faq_content, "product_ids": []}
        return {"content": "I don't have that specific information. You can ask about orders, wallet, or product recommendations!", "product_ids": []}
    if intent == "recommend":
        rag_result = _handle_recommend_rag(session_id, message, profile_name, context, _store_mode)
        if rag_result:
            return {"content": rag_result[0], "product_ids": rag_result[1][:6]}

    msg_lower_chat = (message or "").lower()
    if _store_mode == "groceries" and _is_recipe_or_cooking_query(msg_lower_chat):
        cook_c, cook_pids = _grocery_cooking_response(message, profile_name, products)
        return {"content": cook_c, "product_ids": cook_pids}

    groc_extra = _grocery_mode_system_block() if _store_mode == "groceries" else ""
    system = f"""You are AuraShop's intelligent AI assistant with FULL SYSTEM ACCESS. You're a true agent!

🎯 YOUR CAPABILITIES:
1. SHOPPING: Search products, recommend, compare, suggest alternatives
2. ORDERS: Check status, track deliveries, help with cancellations  
3. WALLET: Check balance, explain AuraPoints (5% <₹1K, 7% ≥₹1K), show pending points
4. ACCOUNT: View profile, personalize recommendations

📊 CURRENT USER DATA:
Name: {profile_name}
Cart: {len(cart_items)} items, ₹{cart_total}
{cart_summary if cart_summary else "Cart is empty"}

Orders: {len(orders_info)} orders
{f"Latest: {orders_info[0]['id']} - {orders_info[0]['status']} (₹{orders_info[0]['total']})" if orders_info else "No orders yet"}

Wallet: ₹{wallet_info['balance']} available
{f"Pending: ₹{wallet_info['pending_points']} (after delivery)" if wallet_info['pending_points'] > 0 else ""}
{f"Total Earned: ₹{wallet_info['total_earned']}" if wallet_info['total_earned'] > 0 else ""}
{f"⚠️ ₹{wallet_info['expiring_soon']} expiring in 7 days!" if wallet_info.get('expiring_soon', 0) > 0 else ""}

Activity:
{user_context}

🏪 CATEGORIES: {', '.join(categories[:12])}

📦 PRODUCTS (use IDs when recommending):
{product_list}

💡 RESPONSE RULES:
- Friendly & conversational
- Use emojis sparingly (1-2 max)
- **ALWAYS mention product IDs (P00123)** for product cards
- Give 2-4 specific recommendations with prices
- Explain WHY (budget match, high-rated, trending)
- For wallet/orders, use ACTUAL user data above
- Ask clarifying questions: "Budget?", "Casual or formal?"
- Keep under 200 words
- Guide actions: "Add to cart?", "Want similar items?"

Remember: You have REAL user data. Use it for accurate, personalized help!{groc_extra}"""

    user_block = f"""User message: {message}"""

    messages = [{"role": "system", "content": system}]
    if history:
        for h in history[-8:]:
            role = "user" if h.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": h.get("content", "")})
    messages.append({"role": "user", "content": user_block})

    product_ids: List[str] = []
    content = f"Hi {profile_name}! ✨ I'm your AuraShop AI assistant. I can help you shop, check orders, manage your wallet, and more. What would you like to do?"

    # Try OpenAI first unless disabled; fallback to built-in intelligent assistant
    global _openai_invalid_logged

    if not USE_BUILTIN_CHAT and _client and OPENAI_API_KEY:
        try:
            resp = _client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.7,
                max_tokens=500,
            )
            content = (resp.choices[0].message.content or content).strip()
            import re
            product_ids = list(dict.fromkeys(re.findall(r"P\d{3,5}", content)))
        except Exception as e:
            err_str = str(e).lower()
            is_invalid_key = "401" in err_str or "invalid_api_key" in err_str or "incorrect api key" in err_str
            if is_invalid_key and not _openai_invalid_logged:
                print("OpenAI API key invalid or expired; using built-in AI assistant. Set USE_BUILTIN_CHAT=1 in .env to hide this.")
                _openai_invalid_logged = True
            elif not is_invalid_key:
                print(f"OpenAI chat error: {e}")
            content, product_ids = _intelligent_fallback(
                message, profile_name, cart_items, cart_total, wallet_info, orders_info, products, by_cat, user_context, _store_mode
            )
    else:
        content, product_ids = _intelligent_fallback(
            message, profile_name, cart_items, cart_total, wallet_info, orders_info, products, by_cat, user_context, _store_mode
        )

    return {"content": content, "product_ids": product_ids[:6]}


def _build_chat_actions(
    intent: str,
    has_cart: bool,
    cart_total: float,
    wallet_balance: float,
    current_page: Optional[str] = None,
    message_lower: str = "",
) -> List[dict]:
    """
    Build action buttons for Aura AI responses. Actions are shown in chat for quick actions.
    Returns list of {"type": "navigate"|"spin_wheel", "label": str, "payload": str}.
    """
    actions: List[dict] = []
    # Cart / checkout
    if has_cart:
        if intent in ("order", "general", ""):
            actions.append({"type": "navigate", "label": "Apply coupon", "payload": "/cart"})
            actions.append({"type": "navigate", "label": "Proceed to checkout", "payload": "/checkout"})
    # Wallet
    if "wallet" in message_lower or "aurapoint" in message_lower or "balance" in message_lower or intent == "faq":
        if "wallet" in message_lower or "aurapoint" in message_lower or "balance" in message_lower:
            actions.append({"type": "navigate", "label": "View Aura Wallet", "payload": "/wallet"})
    # Gamification
    if "spin" in message_lower or "wheel" in message_lower or "game" in message_lower or "scratch" in message_lower or "coupon" in message_lower:
        actions.append({"type": "navigate", "label": "Spin to Win", "payload": "/discounts"})
        actions.append({"type": "navigate", "label": "Explore Discounts", "payload": "/discounts"})
    # Orders
    if "order" in message_lower and ("track" in message_lower or "status" in message_lower or "where" in message_lower):
        actions.append({"type": "navigate", "label": "My Orders", "payload": "/profile"})
    # Profile
    if "profile" in message_lower or "preference" in message_lower or "account" in message_lower:
        actions.append({"type": "navigate", "label": "My Profile", "payload": "/profile"})
    return actions[:5]  # Max 5 actions


def chat_stream(session_id: str, message: str, history: Optional[List[dict]] = None, context: Optional[dict] = None):
    """
    Generator that yields SSE-style dicts: {"content": "..."} for each chunk,
    then {"done": True, "product_ids": [...], "actions": [...]}. Context-aware Aura AI copilot.
    """
    import re
    from app.order_service import get_user_orders, get_user_profile
    from app.user_preferences import enrich_context, merge_quick_order_attrs
    from app.wallet_service import get_wallet_summary
    from app.data_store import get_categories

    request_context = context or {}
    current_page = request_context.get("current_page") or ""
    user_id_for_data = request_context.get("user_id") or session_id  # Use email when logged in for orders/wallet
    _store_mode = _normalize_store_mode_from_context(request_context)

    context = enrich_context(get_session_context(session_id), request_context.get("user_id"), session_id)
    products = _filter_products_by_store_mode(load_products(), _store_mode)
    cart_ids = context.get("cart_ids", [])
    cart_items = []
    cart_total = 0
    if cart_ids:
        cart_items = [get_product(pid) for pid in cart_ids]
        cart_items = [p for p in cart_items if p]
        cart_total = sum(p.price for p in cart_items)

    orders_info = []
    try:
        orders = get_user_orders(user_id_for_data)
        for order in orders[:3]:
            orders_info.append({
                "id": order.id, "total": order.total, "status": order.status.value,
                "items_count": len(order.items)
            })
    except Exception:
        pass

    wallet_info = {"balance": 0, "pending_points": 0, "total_earned": 0}
    try:
        ws = get_wallet_summary(user_id_for_data)
        wallet_info = {**wallet_info, **{k: ws.get(k, 0) for k in ["balance", "pending_points", "total_earned", "expiring_soon"]}}
    except Exception:
        pass

    profile_name = "there"
    try:
        profile = get_user_profile(user_id_for_data)
        if profile and profile.name:
            profile_name = profile.name
    except Exception:
        pass

    by_cat: Dict[str, List[Product]] = {}
    for p in products:
        by_cat.setdefault(p.category, []).append(p)
    sampled = []
    for cat_products in by_cat.values():
        sampled.extend(cat_products[:10])
    sampled = (sampled + products)[:100]
    product_list = "\n".join([f"- {p.id}: {p.name}, ₹{p.price}, {p.category}, {p.rating}⭐" for p in sampled])
    user_context = _build_user_summary(context)
    cart_summary = ""
    if cart_items:
        cart_summary = f"Cart ({len(cart_items)} items, ₹{cart_total}): " + ", ".join([f"{p.name} (₹{p.price})" for p in cart_items[:3]])
        if len(cart_items) > 3:
            cart_summary += f" +{len(cart_items)-3} more"
    categories = get_categories()

    # Agent layer: parse intent with OpenAI and execute actions
    agent_result = _parse_agent_intent(message, orders_info, len(cart_items))
    if agent_result.get("intent") and agent_result["intent"] != "none":
        profile_address = None
        try:
            profile = get_user_profile(user_id_for_data)
            if profile and getattr(profile, "addresses", None):
                addrs = profile.addresses if isinstance(profile.addresses, list) else []
                if addrs:
                    profile_address = addrs[0]
        except Exception:
            pass
        action_result = _execute_agent_action(
            session_id,
            agent_result["intent"],
            agent_result.get("order_id"),
            orders_info,
            cart_items,
            profile_name,
            profile_address,
        )
        if action_result:
            actions = _build_chat_actions("order", bool(cart_items), cart_total, wallet_info.get("balance", 0), current_page, message.lower())
            yield {"content": action_result[0]}
            yield {"done": True, "product_ids": action_result[1][:6], "actions": actions}
            return

    intent = _classify_intent(message)
    msg_lower = (message or "").lower()

    # ----- Compare (IDs in message) -----
    if intent == "compare":
        cmp_res = _format_product_compare(message, profile_name, _store_mode)
        if cmp_res and cmp_res[0]:
            act = _build_chat_actions("general", bool(cart_items), cart_total, wallet_info.get("balance", 0), current_page, msg_lower)
            yield {"content": cmp_res[0]}
            yield {"done": True, "product_ids": cmp_res[1][:6], "actions": act}
            return
        act = _build_chat_actions("general", bool(cart_items), cart_total, wallet_info.get("balance", 0), current_page, msg_lower)
        yield {
            "content": "I need **two product IDs** in your message — e.g. **Compare SHOEH4GRSUBJGZXE vs SRTEH2FF9KEDEFGF** (copy IDs from the product URL or page).",
        }
        yield {"done": True, "product_ids": [], "actions": act}
        return

    # ----- Gift assistant -----
    if intent == "gift_assistant" or session_id in _gift_drafts:
        gr = _process_gift_assistant(session_id, message, profile_name, products)
        if gr:
            act = _build_chat_actions("general", bool(cart_items), cart_total, wallet_info.get("balance", 0), current_page, msg_lower)
            yield {"content": gr[0]}
            yield {"done": True, "product_ids": gr[1][:6], "actions": act}
            return

    # ----- Quick Order via Chat -----
    draft = _quick_order_drafts.get(session_id)

    # Pick between two one-shot options
    if draft and draft.get("step") == "pick_option":
        cands = draft.get("candidates") or []
        msg_clean = (message or "").strip().lower()
        chosen_id = None
        if msg_clean in ("1", "first", "first one", "option 1", "a", "one"):
            chosen_id = cands[0] if len(cands) > 0 else None
        elif msg_clean in ("2", "second", "second one", "option 2", "b", "two"):
            chosen_id = cands[1] if len(cands) > 1 else None
        else:
            cand_upper = [c.upper() for c in cands]
            for x in re.findall(r"\b(P\d{3,8})\b", message or "", re.I):
                if x.upper() in cand_upper:
                    chosen_id = x.upper()
                    break
            if not chosen_id:
                for x in re.findall(r"\b([A-Za-z][A-Za-z0-9]{9,17})\b", message or ""):
                    u = x.upper()
                    if u in cand_upper:
                        chosen_id = u
                        break
        if chosen_id:
            p_sel = get_product(chosen_id)
            if p_sel:
                draft["step"] = "confirm"
                draft["product_id"] = p_sel.id
                draft["product"] = p_sel
                _quick_order_drafts[session_id] = draft
                content, actions = _build_quick_order_confirm_content(
                    session_id, p_sel, profile_name, wallet_info, request_context, draft.get("attributes")
                )
                yield {"content": content}
                yield {"done": True, "product_ids": [p_sel.id], "actions": actions}
                return

    # One-line quick order: "Order black running shoes size 9 under ₹2500"
    if intent == "quick_order" and _quick_order_one_shot_ready(_parse_quick_order_attributes(message)):
        draft_os = _quick_order_drafts.get(session_id)
        if not draft_os or draft_os.get("step") in (None, "collect"):
            products_list = products
            attrs_os = _parse_quick_order_attributes(message)
            pair = _select_two_products_for_quick_order(attrs_os, products_list)
            if len(pair) == 1:
                p0 = pair[0]
                _quick_order_drafts[session_id] = {
                    "step": "confirm",
                    "attributes": attrs_os,
                    "product_id": p0.id,
                    "product": p0,
                }
                content, actions = _build_quick_order_confirm_content(
                    session_id, p0, profile_name, wallet_info, request_context, attrs_os
                )
                yield {"content": content}
                yield {"done": True, "product_ids": [p0.id], "actions": actions}
                return
            if len(pair) >= 2:
                _quick_order_drafts[session_id] = {
                    "step": "pick_option",
                    "candidates": [pair[0].id, pair[1].id],
                    "attributes": attrs_os,
                    "product": None,
                    "product_id": None,
                }
                try:
                    merge_quick_order_attrs(request_context.get("user_id"), session_id, attrs_os)
                except Exception:
                    pass
                content = (
                    f"Nice — I found **two** strong options that match. Which should we ship?\n\n"
                    f"**1.** {pair[0].name} — ₹{pair[0].price} ({pair[0].rating}⭐)\n"
                    f"**2.** {pair[1].name} — ₹{pair[1].price} ({pair[1].rating}⭐)\n\n"
                    f"Reply **1** or **2**, or paste a **product ID**."
                )
                yield {"content": content}
                yield {
                    "done": True,
                    "product_ids": [pair[0].id, pair[1].id],
                    "actions": [
                        {"type": "quick_order_pick", "label": "Option 1", "payload": pair[0].id},
                        {"type": "quick_order_pick", "label": "Option 2", "payload": pair[1].id},
                    ],
                }
                return

    confirm_msg = msg_lower in ("confirm", "confirm and place order", "confirm & place order", "place order", "yes", "confirm order")
    change_msg = msg_lower in ("change details", "change", "change details please", "no")

    if draft and draft.get("step") == "confirm" and confirm_msg:
        from app.order_service import create_order, get_user_profile
        from app.models import OrderItem, DeliveryMethod
        from app.wallet_service import calculate_cashback
        user_id = request_context.get("user_id") or session_id
        product = draft.get("product")
        if product and user_id:
            profile = get_user_profile(user_id)
            address = "Default address (update in Profile)"
            if profile and getattr(profile, "addresses", None):
                addrs = profile.addresses if isinstance(profile.addresses, list) else []
                if addrs:
                    address = addrs[0]
            items = [OrderItem(product_id=product.id, quantity=1, price=product.price)]
            order = create_order(user_id=user_id, items=items, delivery_method=DeliveryMethod.HOME_DELIVERY, delivery_address=address)
            points = calculate_cashback(order.total)
            from datetime import datetime, timedelta
            delivery_date = (datetime.utcnow() + timedelta(days=5)).strftime("%b %d, %Y")
            try:
                merge_quick_order_attrs(request_context.get("user_id"), session_id, draft.get("attributes") or {})
            except Exception:
                pass
            content = f"Done! **Order placed.**\n\n**Order ID:** {order.id}\n**Delivery by:** {delivery_date}\n**Earned AuraPoints:** ₹{points:.0f} (credited after delivery)\n\nView order: [Order {order.id}](/orders/{order.id})"
            del _quick_order_drafts[session_id]
            yield {"content": content}
            yield {"done": True, "product_ids": [], "actions": [{"type": "navigate", "label": "View Order", "payload": f"/orders/{order.id}"}]}
            return
        else:
            content = "Something went wrong. Please try again or add the item to cart and checkout."
            yield {"content": content}
            yield {"done": True, "product_ids": [], "actions": []}
            return

    if draft and change_msg:
        del _quick_order_drafts[session_id]
        content = "No problem! Tell me again what you'd like—e.g. \"order any black shoe mens for me\"—and we can pick size, budget & type."
        yield {"content": content}
        yield {"done": True, "product_ids": [], "actions": []}
        return

    if draft or intent == "quick_order":
        products_list = products
        if not draft:
            attrs = _parse_quick_order_attributes(message)
            draft = {"step": "collect", "attributes": attrs, "product_id": None, "product": None}
            _quick_order_drafts[session_id] = draft
        else:
            draft["attributes"] = _merge_quick_order_from_message(message, draft.get("attributes") or {})

        attrs = draft["attributes"]
        need_size = (attrs.get("category") == "Footwear") and attrs.get("size") is None
        need_budget = attrs.get("budget_max") is None
        need_type = attrs.get("product_type") is None

        if need_size:
            content = f"Got it — **{attrs.get('color') or 'those'}** {attrs.get('category') or 'items'} for **{attrs.get('gender') or 'you'}**. What's your usual size? _(I'll remember it for next time.)_"
            actions = [{"type": "quick_order_option", "label": "Size 8", "payload": "size=8"}, {"type": "quick_order_option", "label": "Size 9", "payload": "size=9"}, {"type": "quick_order_option", "label": "Size 10", "payload": "size=10"}, {"type": "quick_order_option", "label": "Size 11", "payload": "size=11"}]
            yield {"content": content}
            yield {"done": True, "product_ids": [], "actions": actions}
            return

        if need_budget:
            content = "What's your budget?"
            actions = [{"type": "quick_order_option", "label": "Under ₹1000", "payload": "budget=1000"}, {"type": "quick_order_option", "label": "₹1000–₹2000", "payload": "budget=2000"}, {"type": "quick_order_option", "label": "No limit", "payload": "budget=none"}]
            yield {"content": content}
            yield {"done": True, "product_ids": [], "actions": actions}
            return

        if need_type:
            content = "Casual, formal, or sports?"
            actions = [{"type": "quick_order_option", "label": "Casual", "payload": "type=casual"}, {"type": "quick_order_option", "label": "Formal", "payload": "type=formal"}, {"type": "quick_order_option", "label": "Sports", "payload": "type=sports"}]
            yield {"content": content}
            yield {"done": True, "product_ids": [], "actions": actions}
            return

        product = _select_product_for_quick_order(attrs, products_list)
        if not product:
            content = "I couldn't find a match with those filters. Try \"Under ₹2000\" or \"No limit\" for budget, or say \"Change details\" to start over."
            yield {"content": content}
            yield {"done": True, "product_ids": [], "actions": [{"type": "quick_order_change", "label": "Change Details", "payload": "change"}]}
            return

        draft["step"] = "confirm"
        draft["product_id"] = product.id
        draft["product"] = product
        _quick_order_drafts[session_id] = draft

        content, actions = _build_quick_order_confirm_content(
            session_id, product, profile_name, wallet_info, request_context, draft.get("attributes")
        )
        yield {"content": content}
        yield {"done": True, "product_ids": [product.id], "actions": actions}
        return

    actions = _build_chat_actions(intent, bool(cart_items), cart_total, wallet_info.get("balance", 0), current_page, msg_lower)

    if intent == "order":
        if cart_items:
            content = f"Hi {profile_name}! I can help you complete your purchase.\n\n"
            content += f"Items in your cart: {len(cart_items)}\nTotal: **₹{cart_total}**\n"
            content += f"Estimated AuraPoints: ₹{(cart_total * (0.07 if cart_total >= 1000 else 0.05)):.0f}\n\n"
            content += "Go to Checkout to finalize, or apply a coupon first!"
            yield {"content": content}
            yield {"done": True, "product_ids": [p.id for p in cart_items[:6]], "actions": actions}
        else:
            content = f"Hi {profile_name}! Your cart is empty. Tell me what you're looking for and I'll recommend products!"
            yield {"content": content}
            yield {"done": True, "product_ids": [], "actions": []}
        return

    if intent == "faq":
        faq_content = _handle_faq_rag(message)
        content = faq_content or "I don't have that specific information. You can ask about orders, wallet, or product recommendations!"
        yield {"content": content}
        yield {"done": True, "product_ids": [], "actions": actions}
        return

    if intent == "recommend":
        rag_result = _handle_recommend_rag(session_id, message, profile_name, context, _store_mode)
        if rag_result:
            yield {"content": rag_result[0]}
            yield {"done": True, "product_ids": rag_result[1][:6], "actions": actions}
        else:
            yield {"content": f"Hi {profile_name}! What kind of products are you looking for? Try 'under ₹5000' or 'best laptops'."}
            yield {"done": True, "product_ids": [], "actions": []}
        return

    if _store_mode == "groceries" and _is_recipe_or_cooking_query(msg_lower):
        cook_content, cook_ids = _grocery_cooking_response(message, profile_name, products)
        yield {"content": cook_content}
        yield {"done": True, "product_ids": cook_ids, "actions": actions}
        return

    groc_extra = _grocery_mode_system_block() if _store_mode == "groceries" else ""
    system = f"""You are AuraShop's friendly AI shopping assistant. Be conversational and helpful.

USER: {profile_name}
Cart: {len(cart_items)} items, ₹{cart_total}. {cart_summary or "Empty."}
Orders: {len(orders_info)}. Wallet: ₹{wallet_info['balance']}.
Activity: {user_context}
Categories: {', '.join(categories[:12])}
Products (use IDs like P00123 for cards): {product_list[:4000]}

Reply in 1-3 short paragraphs. Use **bold** for emphasis. Mention product IDs for recommendations. Be warm and interactive.{groc_extra}"""

    user_block = f"User: {message}"
    messages = [{"role": "system", "content": system}]
    if history:
        for h in history[-8:]:
            role = "user" if h.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": h.get("content", "")})
    messages.append({"role": "user", "content": user_block})

    product_ids: List[str] = []
    global _openai_invalid_logged

    if not USE_BUILTIN_CHAT and _client and OPENAI_API_KEY:
        try:
            stream = _client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.7,
                max_tokens=500,
                stream=True,
            )
            full_content = []
            for chunk in stream:
                delta = (chunk.choices[0].delta.content or "") if chunk.choices else ""
                if delta:
                    full_content.append(delta)
                    yield {"content": delta}
            content_str = "".join(full_content)
            product_ids = list(dict.fromkeys(re.findall(r"P\d{3,5}", content_str)))[:6]
            act = _build_chat_actions(intent, bool(cart_items), cart_total, wallet_info.get("balance", 0), current_page, msg_lower)
            yield {"done": True, "product_ids": product_ids, "actions": act}
        except Exception as e:
            err_str = str(e).lower()
            if ("401" in err_str or "invalid_api_key" in err_str) and not _openai_invalid_logged:
                _openai_invalid_logged = True
            content, product_ids = _intelligent_fallback(
                message, profile_name, cart_items, cart_total, wallet_info, orders_info, products, by_cat, user_context, _store_mode
            )
            act = _build_chat_actions("general", bool(cart_items), cart_total, wallet_info.get("balance", 0), current_page, msg_lower)
            yield {"content": content}
            yield {"done": True, "product_ids": product_ids[:6], "actions": act}
            return
    else:
        content, product_ids = _intelligent_fallback(
            message, profile_name, cart_items, cart_total, wallet_info, orders_info, products, by_cat, user_context, _store_mode
        )
        act = _build_chat_actions("general", bool(cart_items), cart_total, wallet_info.get("balance", 0), current_page, msg_lower)
        yield {"content": content}
        yield {"done": True, "product_ids": product_ids[:6], "actions": act}
        return


def _intelligent_fallback(
    message: str,
    profile_name: str,
    cart_items: List,
    cart_total: float,
    wallet_info: dict,
    orders_info: List,
    products: List[Product],
    by_cat: Dict,
    user_context: str,
    store_mode: Optional[str] = None,
) -> tuple:
    """
    Intelligent rule-based AI agent when OpenAI is unavailable.
    Handles: search, recommendations, cart, orders, wallet, comparisons.
    """
    import re
    msg_lower = message.lower()
    product_ids: List[str] = []

    if store_mode == "groceries" and _is_recipe_or_cooking_query(msg_lower):
        content, ids = _grocery_cooking_response(message, profile_name, products)
        return content, ids

    # SEARCH/PRODUCT QUERIES - Extract budget and category
    budget_match = re.search(r'under\s+₹?(\d+)|below\s+₹?(\d+)|<\s*₹?(\d+)|budget\s+of\s+₹?(\d+)|price\s+around\s+₹?(\d+)', msg_lower)
    budget = None
    if budget_match:
        # Find the first non-None group
        for group in budget_match.groups():
            if group:
                budget = int(group)
                break
    
    # AGENT ACTIONS - EXTRACT INTENT
    is_buying = any(word in msg_lower for word in ['buy', 'purchase', 'order', 'checkout', 'pay'])
    is_searching = any(word in msg_lower for word in ['search', 'find', 'show', 'look for', 'get me'])
    is_adding = any(word in msg_lower for word in ['add to cart', 'put in cart', 'add this'])
    
    # Find matching category
    matching_category = None
    for cat in by_cat.keys():
        if cat.lower() in msg_lower:
            matching_category = cat
            break
    
    # Search keywords
    search_terms = []
    for word in ['phone', 'shirt', 'shoes', 'laptop', 'watch', 'bag', 'dress', 'jeans', 'electronics', 'fashion', 'camera', 'tv', 'headphone']:
        if word in msg_lower:
            search_terms.append(word)

    # ACTION: BUYING / CHECKOUT
    if is_buying and not is_searching:
        if cart_items:
            content = f"Hi {profile_name}! 🚀 I can help you complete your purchase right now.\n\n"
            content += f"Items in your cart: {len(cart_items)}\n"
            content += f"Total Amount: **₹{cart_total}**\n"
            content += f"Estimated AuraPoints: ₹{(cart_total * (0.07 if cart_total >= 1000 else 0.05)):.0f}\n\n"
            content += "Shall I take you to the secure checkout page to finalize your order?"
            content += "\n\n[Click here to go to Checkout](/checkout)"
            return content, [p.id for p in cart_items[:4]]
        else:
            content = f"Hi {profile_name}! Your cart is empty, so there's nothing to buy yet. 🛍️\n\nWhat are you looking for? I can find the best products for you!"
            return content, []

    # ACTION: ADDING TO CART
    if is_adding and not is_searching:
        # Try to find which product to add
        target_product = None
        for p in products:
            if p.name.lower() in msg_lower or p.id.lower() in msg_lower:
                target_product = p
                break
        
        if target_product:
            content = f"Hi {profile_name}! I've found **{target_product.name}** (₹{target_product.price}). ✨\n\n"
            content += "I'm an AI agent and I've prepared this item for your cart. You can click the 'Add to Cart' button on the product card below to confirm!"
            return content, [target_product.id]
        else:
            content = f"Hi {profile_name}! Which item would you like to add to your cart? Please mention the name or ID, or browse our trending products below!"
            return content, [p.id for p in sorted(products, key=lambda x: -x.rating)[:4]]
    
    # WALLET QUERIES
    if any(word in msg_lower for word in ['wallet', 'balance', 'money', 'aurapoints', 'points', 'rewards', 'topup', 'add money']):
        content = f"Hi {profile_name}! 💰 I'm your Aura Wallet agent. Here's your status:\n\n"
        content += f"💎 **Available Balance: ₹{wallet_info['balance']}**\n"
        if wallet_info['pending_points'] > 0:
            content += f"⏳ Pending AuraPoints: ₹{wallet_info['pending_points']} (activates after delivery)\n"
        if wallet_info['total_earned'] > 0:
            content += f"🎉 Total Rewards Earned: ₹{wallet_info['total_earned']}\n"
        
        content += f"\n**Agent Recommendation:** "
        if wallet_info['balance'] < 500:
            content += "Your balance is low. Want me to help you add money via Razorpay?"
        else:
            content += "You have a good balance! Want to use it for a purchase?"
            
        content += "\n\n[Go to Wallet Page](/wallet)"
        return content, []

    # ORDER QUERIES
    if any(word in msg_lower for word in ['order', 'delivery', 'track', 'status', 'shipped']):
        if orders_info:
            latest = orders_info[0]
            content = f"Hi {profile_name}! 📦 Your Orders:\n\n"
            content += f"Latest Order: **{latest['id']}**\n"
            content += f"Status: {latest['status'].replace('_', ' ').title()}\n"
            content += f"Total: ₹{latest['total']}\n"
            content += f"Items: {latest['items_count']}\n\n"
            if len(orders_info) > 1:
                content += f"You have {len(orders_info)} total orders. "
            content += "Need help with anything else?"
            return content, []
        else:
            content = f"Hi {profile_name}! You don't have any orders yet. 🛍️\n\nWant me to help you find something to buy? I can search products, compare options, or show you trending items!"
            return content, []
    
    # CART QUERIES
    if any(word in msg_lower for word in ['cart', 'basket', 'added']):
        if cart_items:
            content = f"Hi {profile_name}! 🛒 Your Cart ({len(cart_items)} items):\n\n"
            for i, item in enumerate(cart_items[:5], 1):
                content += f"{i}. {item.name} - ₹{item.price}\n"
                product_ids.append(item.id)
            if len(cart_items) > 5:
                content += f"\n+{len(cart_items)-5} more items\n"
            content += f"\n**Total: ₹{cart_total}**\n\n"
            if cart_total >= 1000:
                points = cart_total * 0.07
                content += f"🎉 You'll earn ₹{points:.0f} AuraPoints (7%) on this order!\n"
            else:
                points = cart_total * 0.05
                content += f"💎 You'll earn ₹{points:.0f} AuraPoints (5%) on this order!\n"
            content += "\nReady to checkout?"
            return content, product_ids[:6]
        else:
            content = f"Hi {profile_name}! Your cart is empty. 🛍️\n\nLet me help you find something! What are you looking for? (e.g., 'phones under 30000', 'casual shirts', 'trending products')"
            return content, []
    
    # SEARCH/PRODUCT QUERIES - Extract budget and category
    budget_match = re.search(r'under\s+₹?(\d+)|below\s+₹?(\d+)|<\s*₹?(\d+)', msg_lower)
    budget = None
    if budget_match:
        budget = int(budget_match.group(1) or budget_match.group(2) or budget_match.group(3))
    
    # Find matching category
    matching_category = None
    for cat in by_cat.keys():
        if cat.lower() in msg_lower:
            matching_category = cat
            break
    
    # Search keywords
    search_terms = []
    for word in ['phone', 'shirt', 'shoes', 'laptop', 'watch', 'bag', 'dress', 'jeans', 'electronics', 'fashion']:
        if word in msg_lower:
            search_terms.append(word)
    
    # TRENDING/BEST QUERIES
    if any(word in msg_lower for word in ['trending', 'popular', 'best', 'top', 'recommend', 'suggest', 'find', 'search', 'show', 'look for', 'get me']):
        # Get top-rated products
        sorted_products = sorted(products, key=lambda p: (-p.rating, -p.price))[:30]
        if budget:
            sorted_products = [p for p in sorted_products if p.price <= budget]
        if matching_category:
            sorted_products = [p for p in sorted_products if p.category == matching_category]
        
        recommendations = sorted_products[:4]
        if recommendations:
            content = f"Hi {profile_name}! ✨ I've found some great options for you"
            if budget:
                content += f" under ₹{budget}"
            if matching_category:
                content += f" in {matching_category}"
            content += ":\n\n"
            
            for i, p in enumerate(recommendations, 1):
                content += f"{i}. **{p.id}** - {p.name}\n   ₹{p.price} | {p.rating}⭐ | {p.category}\n\n"
                product_ids.append(p.id)
            
            content += "I'm your shopping agent! You can click any card to view details, add to cart, or ask me to 'checkout' when you're ready!"
            return content, product_ids
    
    # CATEGORY/SEARCH QUERIES
    if matching_category or search_terms or budget:
        results = products
        
        if matching_category:
            results = by_cat.get(matching_category, [])
        elif search_terms:
            # Search by keywords
            results = [p for p in products if any(term in p.name.lower() or term in p.category.lower() for term in search_terms)]
        
        if budget:
            results = [p for p in results if p.price <= budget]
        
        total_n = len(results)
        # Sort by rating — show top 3–4 best-rated among all matches
        results = sorted(results, key=lambda p: (-p.rating, p.price))[:4]
        
        if results:
            content = f"Hi {profile_name}! 🔍 I scanned **{total_n}** options"
            if budget:
                content += f" under ₹{budget}"
            if matching_category:
                content += f" in {matching_category}"
            content += f" — here are the **{len(results)} best-rated**:\n\n"
            
            for i, p in enumerate(results, 1):
                content += f"{i}. **{p.id}** - {p.name}\n   ₹{p.price} | {p.rating}⭐\n\n"
                product_ids.append(p.id)
            
            content += "Click any product card to view details or add to cart!"
            return content, product_ids
        else:
            content = f"Hi {profile_name}! I couldn't find exact matches"
            if budget:
                content += f" under ₹{budget}"
            content += ". Try:\n• Different budget\n• Browse categories\n• Ask for 'trending products'"
            return content, []
    
    # GREETING/HELP
    if any(word in msg_lower for word in ['hi', 'hello', 'hey', 'help', 'what can you do']):
        content = f"Hi {profile_name}! ✨ I'm your AuraShop AI assistant. I can help you:\n\n"
        content += "🛍️ **Shopping:**\n"
        content += "• 'Show phones under 30000'\n"
        content += "• 'Find casual shirts'\n"
        content += "• 'Trending products'\n\n"
        content += "📦 **Orders:** 'Where is my order?'\n"
        content += "💰 **Wallet:** 'Check my balance'\n"
        content += "🛒 **Cart:** 'What's in my cart?'\n\n"
        if cart_items:
            content += f"You have {len(cart_items)} items in cart (₹{cart_total}). "
        content += "What would you like to do?"
        return content, []
    
    # DEFAULT - Show trending
    trending = sorted(products, key=lambda p: (-p.rating, -p.price))[:4]
    content = f"Hi {profile_name}! 🎯 Here are some trending products:\n\n"
    for i, p in enumerate(trending, 1):
        content += f"{i}. **{p.id}** - {p.name}\n   ₹{p.price} | {p.rating}⭐\n\n"
        product_ids.append(p.id)
    content += "Try asking: 'phones under 30000', 'check my wallet', or 'where is my order?'"
    return content, product_ids
