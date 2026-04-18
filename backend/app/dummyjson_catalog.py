"""Load catalog from DummyJSON (https://dummyjson.com/products) — matches frontend INR mapping."""
from __future__ import annotations

import json
import urllib.request
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus

BASE = "https://dummyjson.com"
INR_PER_USD = 83.0


def _fake_discount_percent(pid: str) -> int:
    h = 0
    for c in pid:
        h = (h * 31 + ord(c)) & 0xFFFFFFFF
    return 10 + (h % 21)


def _map_product(p: Dict[str, Any]) -> Dict[str, Any]:
    pid = str(p["id"])
    slug = str(p.get("category") or "")
    parts = slug.replace("-", " ").split()
    cat_name = " ".join(w.capitalize() for w in parts) if parts else "General"
    usd = float(p.get("price") or 0)
    price_inr = round(usd * INR_PER_USD)
    d = _fake_discount_percent(pid)
    compare_at = round(price_inr / (1 - d / 100.0)) if d < 100 else float(price_inr)
    imgs = p.get("images") or []
    thumb = p.get("thumbnail") or (imgs[0] if imgs else "") or ""
    rev = max(
        12,
        min(
            5000,
            int(round((float(p.get("rating") or 4) * 180) + (int(p["id"]) % 400))),
        ),
    )
    q = quote_plus(slug.replace("-", " "))
    unsplash = f"https://source.unsplash.com/400x400/?{q}"
    primary_visual = thumb if thumb else unsplash
    raw_brand = p.get("brand")
    tags: List[str] = [cat_name]
    if raw_brand:
        tags.append(str(raw_brand))
    return {
        "id": pid,
        "name": p.get("title", ""),
        "description": p.get("description") or "",
        "price": float(price_inr),
        "compare_at_price": float(compare_at),
        "discount_percent": d,
        "currency": "INR",
        "category": cat_name,
        "category_slug": slug,
        "subcategory": None,
        "brand": raw_brand,
        "rating": float(p.get("rating") or 0),
        "review_count": rev,
        "colors": [],
        "sizes": [],
        "image_url": primary_visual,
        "thumbnail_url": thumb or None,
        "tags": tags,
        "in_stock": int(p.get("stock") or 0) > 0,
        "stock_count": int(p.get("stock") or 0),
    }


def _fetch_json(url: str, timeout: int = 60) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": "AuraShop/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def load_dummyjson_products() -> Optional[List[Dict[str, Any]]]:
    """Fetch all products from DummyJSON. Returns None on failure."""
    try:
        all_raw: List[Dict[str, Any]] = []
        skip = 0
        page = 100
        total = 10**9
        while skip < total:
            data = _fetch_json(f"{BASE}/products?limit={page}&skip={skip}")
            prods = data.get("products") or []
            all_raw.extend(prods)
            total = int(data.get("total") or len(all_raw))
            if not prods:
                break
            skip += len(prods)
        return [_map_product(p) for p in all_raw]
    except Exception:
        return None
