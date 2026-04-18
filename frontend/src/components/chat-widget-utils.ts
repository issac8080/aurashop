import type { ChatAction } from "@/lib/api";

export type ActionTier = "primary" | "secondary" | "tertiary";

/** Visual hierarchy for chat action chips (backend-driven). */
export function getActionTier(action: ChatAction): ActionTier {
  const p = (action.payload || "").toLowerCase();
  const l = (action.label || "").toLowerCase();
  if (action.type === "quick_order_confirm" || action.type === "quick_order_pick") return "primary";
  if (action.type === "quick_order_change") return "tertiary";
  if (action.type === "navigate") {
    if (p.includes("/checkout") || l.includes("checkout") && l.includes("proceed")) return "primary";
    if (p.includes("/discounts")) return "tertiary";
    if (l.includes("spin") || l.includes("discount") && l.includes("explore")) return "tertiary";
    if (l.includes("wallet") || l.includes("coupon") || p.includes("/cart")) return "secondary";
    return "secondary";
  }
  if (action.type === "quick_order_option") return "secondary";
  return "secondary";
}

export function actionButtonClass(tier: ActionTier): string {
  switch (tier) {
    case "primary":
      return "rounded-xl text-xs font-bold bg-gradient-to-r from-brand-dark-red via-brand-logo-red to-brand-orange text-white shadow-glow border-0 hover:opacity-95 active:scale-[0.98] transition-all";
    case "secondary":
      return "rounded-xl text-xs font-semibold bg-brand-concrete-light dark:bg-white/10 text-brand-ink dark:text-white border border-brand-concrete/80 dark:border-white/15 hover:bg-brand-concrete/50 dark:hover:bg-white/15 active:scale-[0.98] transition-all";
    case "tertiary":
      return "rounded-xl text-xs font-medium text-muted-foreground bg-transparent hover:bg-muted/80 border border-transparent hover:border-border active:scale-[0.98] transition-all";
    default:
      return "";
  }
}

/** Parse a GitHub-style markdown table from assistant message (compare feature). */
export function extractMarkdownTable(content: string): {
  before: string;
  headers: string[];
  rows: string[][];
  after: string;
} | null {
  const lines = content.split("\n");
  const isSep = (l: string) => {
    const s = l.trim();
    return s.includes("|") && /^[\s|:\-]+$/.test(s) && /-/.test(s);
  };
  let start = -1;
  for (let i = 0; i < lines.length - 2; i++) {
    const line = lines[i].trim();
    const sep = lines[i + 1] ?? "";
    if (line.includes("|") && isSep(sep)) {
      start = i;
      break;
    }
  }
  if (start < 0) return null;

  const parseRow = (line: string) => {
    const t = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    return t.split("|").map((c) => c.trim());
  };

  const headerLine = lines[start];
  const headers = parseRow(headerLine);
  let rowStart = start + 2;
  const rows: string[][] = [];
  for (let i = rowStart; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t.includes("|")) break;
    rows.push(parseRow(t));
  }

  if (headers.length === 0 || rows.length === 0) return null;

  const endLine = start + 1 + rows.length + 1;
  const before = lines.slice(0, start).join("\n").trim();
  const after = lines.slice(endLine).join("\n").trim();
  return { before, headers, rows, after };
}

const WISHLIST_KEY = "aura_chat_wishlist";

export function readWishlist(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function toggleWishlist(productId: string): boolean {
  const s = readWishlist();
  if (s.has(productId)) {
    s.delete(productId);
  } else {
    s.add(productId);
  }
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(Array.from(s)));
  } catch {
    /* ignore */
  }
  return s.has(productId);
}

export function isInWishlist(productId: string): boolean {
  return readWishlist().has(productId);
}
