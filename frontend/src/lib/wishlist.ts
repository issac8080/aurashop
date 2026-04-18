const KEY = "aurashop_wishlist_ids";

export function getWishlistIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function isWishlisted(productId: string): boolean {
  return getWishlistIds().includes(productId);
}

export function toggleWishlistId(productId: string): boolean {
  if (typeof window === "undefined") return false;
  const set = new Set(getWishlistIds());
  const had = set.has(productId);
  if (had) set.delete(productId);
  else set.add(productId);
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
  return !had;
}
