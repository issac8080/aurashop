const RECENT_KEY = "aurashop_recent_searches";
const MAX_RECENT = 8;

export const TRENDING_QUERIES = [
  "Black shoes under ₹1000",
  "Wireless earbuds",
  "Office wear men",
  "Gifts under ₹500",
  "Running shoes size 9",
];

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string" && s.trim().length > 0) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): void {
  const q = query.trim();
  if (!q || typeof window === "undefined") return;
  try {
    const prev = getRecentSearches().filter((s) => s.toLowerCase() !== q.toLowerCase());
    const next = [q, ...prev].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
