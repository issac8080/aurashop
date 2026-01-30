"""
AI layer: OpenAI-powered recommendation engine and chat assistant.
Uses prompt engineering for structured recommendations and natural chat.
"""
import json
import hashlib
from typing import List, Optional, Dict, Any
from app.config import OPENAI_API_KEY
from app.data_store import (
    load_products,
    get_product,
    get_session_context,
    get_cached_recommendations,
    cache_recommendations,
)
from app.models import Product

# Optional OpenAI client (graceful if no key)
try:
    from openai import OpenAI
    _client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
except Exception:
    _client = None


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
    profile = context.get("profile", {})
    budget = profile.get("max_budget") or (context.get("budget_signals") or [None])[-1]
    categories = profile.get("preferred_categories") or context.get("categories_viewed", [])
    queries = context.get("search_queries", [])
    viewed = context.get("viewed_product_ids", [])
    cart = context.get("cart_ids", [])
    parts = []
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
) -> List[dict]:
    """
    Hybrid recommendation: rule-based + AI ranking.
    Returns list of { product_id, reason, confidence }.
    """
    context = get_session_context(session_id)
    context_key = hashlib.md5(
        f"{limit}_{max_price}_{category}_{exclude_product_ids}".encode()
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


def chat(session_id: str, message: str, history: Optional[List[dict]] = None) -> dict:
    """
    AI shopping assistant chat. Returns { content, product_ids } for inline product cards.
    """
    context = get_session_context(session_id)
    products = load_products()
    # Sample across categories for large catalogs
    by_cat: Dict[str, List[Product]] = {}
    for p in products:
        by_cat.setdefault(p.category, []).append(p)
    sampled = []
    for cat_products in by_cat.values():
        sampled.extend(cat_products[:8])
    sampled = (sampled + products)[:80]
    product_list = "\n".join(
        [f"- {p.id}: {p.name}, ₹{p.price}, {p.category}, {p.rating} stars. {p.description[:80]}..."
         for p in sampled]
    )
    user_context = _build_user_summary(context)
    cart_ids = context.get("cart_ids", [])
    cart_summary = ""
    if cart_ids:
        cart_items = [get_product(pid) for pid in cart_ids]
        cart_items = [p for p in cart_items if p]
        cart_summary = "Cart: " + ", ".join([f"{p.name} (₹{p.price})" for p in cart_items])

    system = """You are an intelligent AI shopping assistant for AuraShop with deep product knowledge and personalization capabilities.

CAPABILITIES:
- Understand user intent: browsing, comparing, buying, seeking advice
- Analyze user behavior: budget signals, category preferences, viewed items, cart contents
- Provide personalized recommendations based on user context
- Compare products across features, price, ratings, and value
- Suggest complementary items and complete outfits/bundles
- Explain why products match user needs (budget, style, occasion)
- Handle complex queries: "best phone under 30k", "formal wear for interview", "gift for tech enthusiast"

RESPONSE STYLE:
- Friendly, knowledgeable, and conversational
- Use emojis sparingly for warmth (✨, 🎯, 💡)
- Always mention product IDs (P001, P002) when recommending so we show cards
- Provide 2-4 specific recommendations per response
- Explain reasoning: "This matches your budget", "High-rated in your preferred category"
- Ask clarifying questions when needed: "What's your budget?", "Casual or formal?"
- For comparisons, highlight key differences
- Suggest next steps: "Add to cart?", "Want to see similar items?"

PERSONALIZATION:
- Reference user's browsing history and preferences
- Acknowledge cart items and suggest complements
- Respect budget constraints strictly
- Prioritize categories user has shown interest in
- Mention if items are trending, low stock, or best value
"""

    user_block = f"""Current user context:
{user_context}
{cart_summary}

Product catalog (use these IDs when recommending):
{product_list}

User message: {message}"""

    messages = [{"role": "system", "content": system}]
    if history:
        for h in history[-6:]:
            role = "user" if h.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": h.get("content", "")})
    messages.append({"role": "user", "content": user_block})

    product_ids: List[str] = []
    content = "I'm here to help! Tell me what you're looking for—budget, category, or style—and I'll suggest the best options."

    if _client and OPENAI_API_KEY:
        try:
            resp = _client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.6,
            )
            content = (resp.choices[0].message.content or content).strip()
            # Extract product IDs mentioned (P001, P002, etc.)
            import re
            product_ids = list(dict.fromkeys(re.findall(r"P\d{3,5}", content)))
        except Exception as e:
            print(f"OpenAI chat error: {e}")

    return {"content": content, "product_ids": product_ids[:6]}
