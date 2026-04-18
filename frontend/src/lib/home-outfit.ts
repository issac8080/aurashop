import type { Product } from "@/lib/product-types";

/** Normalize DummyJSON / UI category to slug form. */
function categorySlug(p: Product): string {
  const raw = (p.category_slug || p.category || "").trim().toLowerCase();
  return raw.replace(/\s+/g, "-");
}

/** DummyJSON apparel slots: shirt → dress or full piece → shoes (avoids groceries, decor, etc.). */
const TOP_SLUGS = new Set(["mens-shirts", "tops"]);
const MID_SLUGS = new Set(["womens-dresses"]);
const FOOTWEAR_SLUGS = new Set(["mens-shoes", "womens-shoes"]);

/** Only used if we cannot fill all three slots — keeps random junk out of “outfit”. */
const EXCLUDE_FROM_OUTFIT_FALLBACK = new Set([
  "groceries",
  "fragrances",
  "beauty",
  "skin-care",
  "skincare",
  "home-decoration",
  "furniture",
  "kitchen-accessories",
  "laptops",
  "smartphones",
  "tablets",
  "mobile-accessories",
  "motorcycle",
]);

function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)]!;
}

/** Pick one product from pool matching slugs, excluding ids. */
function pickFromSlugs(pool: Product[], slugs: Set<string>, exclude: Set<string>): Product | null {
  const candidates = pool.filter((p) => slugs.has(categorySlug(p)) && !exclude.has(p.id));
  return pickRandom(candidates);
}

/**
 * Pick 3 wearable items: top → dress/mid layer → footwear when possible.
 * Falls back to other non-grocery catalog items only if a slot is empty.
 */
export function pickOutfitProducts(pool: Product[]): Product[] {
  if (pool.length === 0) return [];

  const used = new Set<string>();
  const out: Product[] = [];

  const top = pickFromSlugs(pool, TOP_SLUGS, used);
  if (top) {
    out.push(top);
    used.add(top.id);
  }

  const mid = pickFromSlugs(pool, MID_SLUGS, used);
  if (mid) {
    out.push(mid);
    used.add(mid.id);
  }

  const shoes = pickFromSlugs(pool, FOOTWEAR_SLUGS, used);
  if (shoes) {
    out.push(shoes);
    used.add(shoes.id);
  }

  if (out.length === 3) return out;

  const fallbackPool = pool.filter((p) => {
    if (used.has(p.id)) return false;
    const s = categorySlug(p);
    if (EXCLUDE_FROM_OUTFIT_FALLBACK.has(s)) return false;
    return true;
  });
  const shuffled = [...fallbackPool].sort(() => Math.random() - 0.5);
  for (const p of shuffled) {
    if (out.length >= 3) break;
    out.push(p);
    used.add(p.id);
  }

  return out.slice(0, 3);
}

const AURA_COINS_KEY = "aurashop_aura_coins";

export function getAuraCoins(): number {
  if (typeof window === "undefined") return 320;
  const n = Number(localStorage.getItem(AURA_COINS_KEY));
  if (!Number.isFinite(n) || n < 0) return 320;
  return Math.floor(n);
}

export function addAuraCoins(delta: number): number {
  if (typeof window === "undefined") return 320;
  const next = Math.max(0, getAuraCoins() + delta);
  try {
    localStorage.setItem(AURA_COINS_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}
