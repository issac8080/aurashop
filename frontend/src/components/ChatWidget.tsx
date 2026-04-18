"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  Star,
  ShoppingCart,
  ExternalLink,
  Heart,
  ShoppingBag,
  Wallet,
  Gift,
  Bell,
  Zap,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import { getProductImageSrc, getProductImagePlaceholder } from "@/lib/unsplash";
import { useCart, useAuth } from "@/app/providers";
import { useCartToast } from "@/components/CartToastProvider";
import {
  chatStream,
  fetchProduct,
  addToCart,
  getCart,
  fetchChatProactive,
  type Product,
  type ChatAction,
  type ProactiveHint,
} from "@/lib/api";
import {
  getActionTier,
  actionButtonClass,
  extractMarkdownTable,
  toggleWishlist,
  isInWishlist,
} from "@/components/chat-widget-utils";
import { useShoppingVibe } from "@/context/shopping-vibe-context";
import { useStoreMode } from "@/context/store-mode-context";
import { ShoppingVibeSplitControl } from "@/components/shopping-vibe-ui";

const PLACEHOLDER_ROTATION = [
  "Try: black shoes under ₹2000…",
  "Ask: compare two product IDs from any page…",
  "Say: what’s in my cart?",
  "Reorder or check wallet — just ask.",
];

const SUGGESTED_SHOPPING = [
  "Black shoes under ₹1000 for office",
  "Find something under ₹5000",
  "Compare SHOEH4GRSUBJGZXE vs SRTEH2FF9KEDEFGF",
];
const SUGGESTED_PAYMENTS = ["Check my wallet", "Apply a coupon", "Proceed to checkout"];
const SUGGESTED_OFFERS = ["Spin the wheel", "Any discount coupons?"];

const REFINE_CHIPS = [
  { icon: "💰", label: "Budget", send: "Show me options under ₹2000" },
  { icon: "👟", label: "Brand", send: "Show me popular footwear brands" },
  { icon: "📏", label: "Size", send: "I need size 9 shoes" },
];

const FOLLOW_UPS = ["Pick the best 3 for me", "What's in my cart?", "Best under ₹3000", "Tell me about AuraPoints"];

/** Plain text + **bold** + bullets (no table). */
function MessageContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const lines = content.split("\n");
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;
        const bullet = /^[-*•]\s+/.exec(trimmed);
        const boldParts = trimmed.split(/(\*\*[^*]+\*\*)/g);
        const rendered = (
          <span key={i}>
            {boldParts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j} className="font-semibold text-foreground">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </span>
        );
        if (bullet) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-brand-logo-red shrink-0">•</span>
              {rendered}
            </div>
          );
        }
        return <div key={i}>{rendered}</div>;
      })}
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-brand-logo-red/80 animate-pulse align-middle rounded-sm" aria-hidden />
      )}
    </div>
  );
}

function MarkdownTableBlock({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-brand-concrete/60 dark:border-white/10 shadow-card my-2 bg-white/80 dark:bg-brand-ink/40">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="bg-brand-concrete-light/90 dark:bg-white/5 border-b border-brand-concrete/50">
            {headers.map((h, i) => (
              <th key={i} className="px-2.5 py-2 font-bold text-brand-ink dark:text-white whitespace-nowrap">
                {h.replace(/\*\*/g, "")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-brand-concrete/30 dark:border-white/5 last:border-0">
              {row.map((cell, ci) => (
                <td key={ci} className="px-2.5 py-2 text-muted-foreground dark:text-brand-concrete-light/90 align-top">
                  {cell.replace(/\*\*/g, "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Renders compare tables as real UI tables; rest as MessageContent. */
function RichAssistantText({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const parsed = useMemo(() => (!isStreaming ? extractMarkdownTable(content) : null), [content, isStreaming]);
  if (parsed && parsed.headers.length) {
    return (
      <div className="space-y-2">
        {parsed.before ? <MessageContent content={parsed.before} /> : null}
        <MarkdownTableBlock headers={parsed.headers} rows={parsed.rows} />
        {parsed.after ? <MessageContent content={parsed.after} /> : null}
      </div>
    );
  }
  return <MessageContent content={content} isStreaming={isStreaming} />;
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  product_ids?: string[];
  actions?: ChatAction[];
  isStreaming?: boolean;
};

export function ChatWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const { sessionId, refreshCart, cartCount } = useCart();
  const { user } = useAuth();
  const { showAddedToCart, showAddToCartError } = useCartToast();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm **Aura AI**. I can narrow thousands of products to a **short list you’ll actually want**.\n\nGot it — **what matters most right now?** Tap **Budget / Brand / Size** below, or ask anything in your own words.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [productsInChat, setProductsInChat] = useState<Record<string, Product>>({});
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [initialMessageToSend, setInitialMessageToSend] = useState<string | null>(null);
  const [proactiveHints, setProactiveHints] = useState<ProactiveHint[]>([]);
  const [cartTotal, setCartTotal] = useState<number>(0);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [wishlistVersion, setWishlistVersion] = useState(0);
  /** Collapsed by default — conversation-first. */
  const [proactiveOpen, setProactiveOpen] = useState(false);
  const [followUpMore, setFollowUpMore] = useState(false);
  const [actionsExpandedForMsg, setActionsExpandedForMsg] = useState<number | null>(null);
  const { shoppingVibeOn, setShoppingVibeOn, shoppingVibeMode, setShoppingVibeModePersist } =
    useShoppingVibe();
  const { storeMode } = useStoreMode();

  const chatContext = useMemo(
    () => ({
      current_page: pathname || "/",
      user_id: user?.email ?? null,
      cart_count: cartCount,
      store_mode: storeMode,
    }),
    [pathname, user?.email, cartCount, storeMode]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, productsInChat, expandedProductId, proactiveHints]);

  useEffect(() => {
    setActionsExpandedForMsg(null);
    setFollowUpMore(false);
  }, [messages.length]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ initialMessage?: string }>;
      const msg = customEvent.detail?.initialMessage?.trim();
      setOpen(true);
      if (msg) setInitialMessageToSend(msg);
    };
    window.addEventListener("open-aurashop-chat", handler);
    return () => window.removeEventListener("open-aurashop-chat", handler);
  }, []);

  useEffect(() => {
    if (!open || !initialMessageToSend || loading) return;
    const msg = initialMessageToSend;
    setInitialMessageToSend(null);
    const t = setTimeout(() => send(msg), 400);
    return () => clearTimeout(t);
  }, [open, initialMessageToSend]);

  useEffect(() => {
    if (!open || !sessionId) return;
    fetchChatProactive(sessionId, user?.email ?? null).then((res) => {
      setProactiveHints(res.hints?.slice(0, 3) ?? []);
    });
  }, [open, sessionId, user?.email]);

  useEffect(() => {
    if (!open || !sessionId) return;
    getCart(sessionId)
      .then(({ cart }) => setCartTotal(cart.reduce((s, p) => s + p.price, 0)))
      .catch(() => setCartTotal(0));
  }, [open, sessionId, cartCount]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_ROTATION.length);
    }, 4500);
    return () => clearInterval(id);
  }, [open]);

  const lastAssistantActions = useMemo(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant" && !m.isStreaming);
    return last?.actions ?? [];
  }, [messages]);

  const lastAssistantMessageIndex = useMemo(() => {
    for (let j = messages.length - 1; j >= 0; j--) {
      if (messages[j].role === "assistant") return j;
    }
    return -1;
  }, [messages]);

  const inQuickOrderFlow = lastAssistantActions.some((a) =>
    ["quick_order_confirm", "quick_order_option", "quick_order_pick", "quick_order_change"].includes(a.type)
  );

  const handleAddToCartInChat = async (product: Product) => {
    if (!user) {
      setOpen(false);
      router.push("/login?from=" + encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/"));
      return;
    }
    if (!sessionId || addingToCartId) return;
    setAddingToCartId(product.id);
    try {
      await addToCart(sessionId, product.id);
      await refreshCart();
      showAddedToCart(product.name);
      setExpandedProductId(null);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(12);
    } catch {
      showAddToCartError();
    } finally {
      setAddingToCartId(null);
    }
  };

  const handleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(productId);
    setWishlistVersion((x) => x + 1);
  };

  const handleActionClick = (action: ChatAction) => {
    if (action.type === "quick_order_option") {
      send(action.label);
      return;
    }
    if (action.type === "quick_order_confirm") {
      send("Confirm and place order");
      return;
    }
    if (action.type === "quick_order_change") {
      send("Change details");
      return;
    }
    if (action.type === "navigate" && action.payload) {
      setOpen(false);
      router.push(action.payload);
      return;
    }
    if (action.type === "spin_wheel") {
      setOpen(false);
      router.push("/discounts");
    }
    if (action.type === "quick_order_pick" && action.payload) {
      send(`I'll take ${action.payload}`);
    }
  };

  const send = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg || loading) return;
      setInput("");
      setMessages((m) => [
        ...m,
        { role: "user", content: msg },
        { role: "assistant", content: "", product_ids: [], actions: [], isStreaming: true },
      ]);
      setLoading(true);
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));

      await chatStream(sessionId || "", msg, history, {
        onChunk: (chunk) => {
          setMessages((m) => {
            const idx = m.findIndex((x) => x.role === "assistant" && x.isStreaming);
            if (idx < 0) return m;
            const next = [...m];
            next[idx] = { ...next[idx], content: next[idx].content + chunk };
            return next;
          });
        },
        onDone: (productIds, actions) => {
          setMessages((m) => {
            const idx = m.findIndex((x) => x.role === "assistant" && x.isStreaming);
            if (idx < 0) return m;
            const next = [...m];
            next[idx] = {
              role: "assistant",
              content: next[idx].content,
              product_ids: productIds ?? [],
              actions: actions ?? [],
              isStreaming: false,
            };
            return next;
          });
          setLoading(false);
          if (productIds?.length) {
            productIds.forEach((id) => {
              if (!productsInChat[id]) {
                fetchProduct(id).then((p) => setProductsInChat((prev) => ({ ...prev, [id]: p }))).catch(() => {});
              }
            });
          }
        },
        onError: () => {
          setMessages((m) => {
            const idx = m.findIndex((x) => x.role === "assistant" && x.isStreaming);
            if (idx < 0) return m;
            const next = [...m];
            next[idx] = {
              role: "assistant",
              content: "Sorry, I couldn't reach the server. Make sure the backend is running (port 8000).",
              product_ids: [],
              actions: [],
              isStreaming: false,
            };
            return next;
          });
          setLoading(false);
        },
      }, chatContext);
    },
    [loading, messages, sessionId, chatContext]
  );

  const browsingMode = cartCount === 0;
  const nearPurchase = cartCount > 0 && cartTotal > 0;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))] sm:right-[calc(1.5rem+env(safe-area-inset-right,0px))] z-50 w-[min(440px,calc(100vw-2rem-env(safe-area-inset-left,0px)-env(safe-area-inset-right,0px)))] sm:w-[440px] max-w-[calc(100vw-2rem-env(safe-area-inset-left,0px)-env(safe-area-inset-right,0px))] h-[min(92vh,720px)] sm:h-[min(90vh,680px)] max-h-[min(90vh,calc(100dvh-8rem-env(safe-area-inset-bottom,0px)))] rounded-2xl border-0 bg-white dark:bg-brand-ink shadow-card-hover flex flex-col overflow-hidden ring-1 ring-black/[0.06] dark:ring-white/10"
          >
            {/* G10X header — fixed height */}
            <div className="relative flex items-center justify-between px-4 py-3 bg-brand-ink text-white shrink-0 min-h-[56px]">
              <div
                className="absolute inset-x-0 bottom-0 h-0.5 bg-g10x-gradient opacity-90"
                aria-hidden
              />
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative h-11 w-11 rounded-2xl bg-g10x-gradient flex items-center justify-center shadow-glow shrink-0">
                  <Sparkles className="h-5 w-5 text-white" />
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-brand-orange border-2 border-brand-ink" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm tracking-tight truncate">Aura AI</p>
                  <p className="text-xs text-white/65 flex items-center gap-1.5 truncate">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-logo-red shrink-0" />
                    {browsingMode ? "Browsing — ask for filters or picks" : `Cart · ${cartCount} item(s)`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <ShoppingVibeSplitControl
                  variant="chat"
                  isOn={shoppingVibeOn}
                  onToggle={() => setShoppingVibeOn((v) => !v)}
                  mode={shoppingVibeMode}
                  onChangeMode={setShoppingVibeModePersist}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                  className="rounded-full text-white/80 hover:text-white hover:bg-white/10 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Compact checkout strip — minimal height */}
            {nearPurchase && (
              <div className="shrink-0 px-3 py-1.5 border-b border-brand-concrete/20 dark:border-white/10 bg-brand-concrete-light/30 dark:bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push("/checkout");
                  }}
                  className="w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold bg-gradient-to-r from-brand-dark-red/90 to-brand-logo-red text-white shadow-sm hover:opacity-95 active:scale-[0.99] transition-all"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span aria-hidden>🛒</span>
                    <span className="truncate">
                      {cartTotal > 0 ? formatPrice(cartTotal) : "Cart"} · Checkout
                    </span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-90" />
                </button>
              </div>
            )}

            {inQuickOrderFlow && (
              <div className="shrink-0 px-3 py-1 border-b border-brand-concrete/15 dark:border-white/5 bg-muted/30 dark:bg-white/[0.02] flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="font-bold text-foreground/80 shrink-0">Quick order</span>
                <span className="truncate">
                  1 Pick → 2 Confirm → 3 Placed
                </span>
              </div>
            )}

            {/* Main column: messages get flex-1 + min-h-0 so ~70–80% height is conversation */}
            <div className="flex flex-1 min-h-0 flex-col">
              <div
                ref={scrollRef}
                className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain scroll-smooth px-4 py-4 space-y-5 bg-gradient-to-b from-brand-concrete-light/30 to-background dark:from-brand-ink dark:to-black/20"
              >
                {proactiveHints.length > 0 && (
                  <details
                    className="group rounded-xl border border-brand-concrete/40 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] overflow-hidden"
                    open={proactiveOpen}
                    onToggle={(e) => setProactiveOpen((e.target as HTMLDetailsElement).open)}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[11px] font-bold text-muted-foreground hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5 text-brand-orange" />
                        For you
                        <span className="rounded-full bg-brand-logo-red/15 px-1.5 py-0 text-[9px] font-bold text-brand-logo-red">
                          {proactiveHints.length}
                        </span>
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="space-y-2 border-t border-brand-concrete/30 px-3 pb-3 pt-2">
                      {proactiveHints.map((h) => (
                        <div
                          key={h.id}
                          className="rounded-lg px-2.5 py-2 text-xs text-brand-ink dark:text-brand-concrete-light"
                        >
                          <MessageContent content={h.text} />
                          {h.actions?.map((a, i) => (
                            <Button
                              key={i}
                              variant="outline"
                              size="sm"
                              className={cn("mt-2 h-7 text-[11px]", actionButtonClass(getActionTier(a)))}
                              onClick={() => handleActionClick(a)}
                            >
                              {a.label}
                            </Button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", damping: 22, stiffness: 320 }}
                    className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[90%] rounded-2xl px-4 py-3.5",
                        m.role === "user"
                          ? "bg-gradient-to-br from-brand-logo-red to-brand-dark-red text-white rounded-br-md shadow-glow"
                          : "bg-white/95 dark:bg-white/[0.06] text-foreground rounded-bl-md shadow-card border border-brand-concrete/25 dark:border-white/8"
                      )}
                    >
                      {m.role === "assistant" ? (
                        <RichAssistantText content={m.content} isStreaming={m.isStreaming} />
                      ) : (
                        <MessageContent content={m.content} />
                      )}
                      {m.role === "assistant" && !m.isStreaming && m.content && (
                        <>
                          {m.actions && m.actions.length > 0 && (() => {
                            const maxVisible = 4;
                            const expanded = actionsExpandedForMsg === i;
                            const list = expanded ? m.actions : m.actions.slice(0, maxVisible);
                            return (
                              <div className="flex flex-wrap gap-2 mt-4">
                                {list.map((action, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    className={cn(
                                      "px-3 py-2 min-h-[36px] transition-transform",
                                      actionButtonClass(getActionTier(action))
                                    )}
                                    onClick={() => handleActionClick(action)}
                                  >
                                    {action.label}
                                  </button>
                                ))}
                                {m.actions.length > maxVisible && (
                                  <button
                                    type="button"
                                    onClick={() => setActionsExpandedForMsg(expanded ? null : i)}
                                    className="px-3 py-2 min-h-[36px] text-xs font-semibold rounded-xl border border-dashed border-brand-concrete/60 dark:border-white/20 text-muted-foreground hover:text-foreground hover:border-brand-orange/40"
                                  >
                                    {expanded ? "Less" : `More (${m.actions.length - maxVisible})`}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                          {i === lastAssistantMessageIndex && (
                            <div className="flex flex-wrap gap-1.5 mt-3 items-center">
                              {(followUpMore ? FOLLOW_UPS : FOLLOW_UPS.slice(0, 3)).map((s) => (
                                <motion.button
                                  key={s}
                                  type="button"
                                  onClick={() => send(s)}
                                  whileTap={{ scale: 0.97 }}
                                  className="text-[11px] rounded-full border border-brand-concrete/60 dark:border-white/15 bg-brand-concrete-light/80 dark:bg-white/5 px-2.5 py-1.5 text-brand-ink dark:text-white/85 hover:border-brand-orange/50 hover:bg-brand-orange/10 font-medium transition-colors max-w-full truncate"
                                >
                                  {s}
                                </motion.button>
                              ))}
                              {FOLLOW_UPS.length > 3 && (
                                <button
                                  type="button"
                                  onClick={() => setFollowUpMore((v) => !v)}
                                  className="text-[11px] rounded-full border border-transparent px-2 py-1.5 font-semibold text-brand-logo-red hover:underline"
                                >
                                  {followUpMore ? "Less" : "More"}
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                      {m.role === "assistant" && m.product_ids?.length ? (
                        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 -mx-0.5 scrollbar-thin">
                          {m.product_ids.slice(0, 4).map((id, idx) => {
                            const p = productsInChat[id];
                            if (!p)
                              return (
                                <div
                                  key={id}
                                  className="flex-shrink-0 w-[168px] h-[212px] rounded-2xl bg-muted animate-pulse shadow-card"
                                />
                              );
                            const saved = isInWishlist(id);
                            const lowStock =
                              p.stock_count != null && p.stock_count > 0 && p.stock_count < 10;
                            return (
                              <motion.div
                                key={id}
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.06, type: "spring", damping: 20 }}
                                className="relative flex-shrink-0 w-[168px] group/card"
                              >
                                <button
                                  type="button"
                                  onClick={() => setExpandedProductId(expandedProductId === id ? null : id)}
                                  className="flex flex-col rounded-2xl overflow-hidden w-full text-left bg-white dark:bg-white/[0.04] shadow-card hover:shadow-card-hover border border-brand-concrete/35 dark:border-white/10 transition-shadow duration-200"
                                >
                                  <div className="relative h-[104px] w-full bg-muted overflow-hidden">
                                    <img
                                      src={getProductImageSrc(p.image_url, p.category, p.id, p.name, p.thumbnail_url)}
                                      alt={p.name}
                                      className="absolute inset-0 w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                                      loading="lazy"
                                      onError={(e) => {
                                        if (p.thumbnail_url && e.currentTarget.src !== p.thumbnail_url) {
                                          e.currentTarget.src = p.thumbnail_url;
                                        } else {
                                          e.currentTarget.src = getProductImagePlaceholder(p.name);
                                        }
                                      }}
                                    />
                                    {idx === 0 && (
                                      <span className="absolute top-2 left-2 rounded-md bg-g10x-gradient px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                                        Best pick
                                      </span>
                                    )}
                                    <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                      <Star className="h-3 w-3 fill-brand-logo-red text-brand-logo-red" />
                                      {p.rating}
                                    </div>
                                    <button
                                      type="button"
                                      className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-white/95 shadow-md flex items-center justify-center text-brand-logo-red hover:scale-105 transition-transform"
                                      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
                                      onClick={(e) => handleWishlist(id, e)}
                                    >
                                      <Heart className={cn("h-4 w-4", saved ? "fill-brand-logo-red text-brand-logo-red" : "text-brand-ink/50")} />
                                    </button>
                                  </div>
                                  <div className="p-2.5 pt-2">
                                    <p className="font-semibold text-[11px] line-clamp-2 text-brand-ink dark:text-white leading-snug">{p.name}</p>
                                    <p className="text-brand-logo-red font-bold text-sm mt-1">{formatPrice(p.price)}</p>
                                    {lowStock && (
                                      <p className="text-[10px] font-bold text-brand-dark-red dark:text-brand-concrete-light mt-0.5 flex items-center gap-0.5">
                                        <Zap className="h-3 w-3" /> Only {p.stock_count} left
                                      </p>
                                    )}
                                    {p.sizes?.length ? (
                                      <p className="text-[9px] text-muted-foreground mt-1 truncate">Sizes: {p.sizes.slice(0, 4).join(", ")}</p>
                                    ) : null}
                                    <div className="mt-2 flex gap-1.5">
                                      <Button
                                        size="sm"
                                        className="flex-1 h-8 rounded-xl text-[10px] font-bold bg-gradient-to-r from-brand-logo-red to-brand-orange text-white shadow-glow hover:opacity-95"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAddToCartInChat(p);
                                        }}
                                        disabled={!!addingToCartId}
                                      >
                                        {addingToCartId === id ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <>
                                            <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                                            Add
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </button>
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                ))}
                {loading && !messages.some((m) => m.isStreaming) && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md bg-white dark:bg-white/[0.06] px-4 py-3 shadow-card border border-brand-concrete/30 flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="h-2 w-2 rounded-full bg-brand-logo-red"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.12 }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">Thinking…</span>
                    </div>
                  </div>
                )}
              </div>

            <AnimatePresence>
              {expandedProductId && productsInChat[expandedProductId] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", damping: 25 }}
                  className="shrink-0 border-t border-brand-concrete/25 bg-brand-concrete-light/40 dark:bg-black/30 max-h-[min(38vh,280px)] overflow-y-auto overflow-x-hidden"
                >
                  <div className="p-3 sm:p-4 flex gap-3">
                    <div className="relative w-24 h-24 rounded-2xl bg-muted flex-shrink-0 overflow-hidden shadow-card">
                      <img
                        src={getProductImageSrc(
                          productsInChat[expandedProductId].image_url,
                          productsInChat[expandedProductId].category,
                          productsInChat[expandedProductId].id,
                          productsInChat[expandedProductId].name,
                          productsInChat[expandedProductId].thumbnail_url
                        )}
                        alt={productsInChat[expandedProductId].name}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          const thumb = productsInChat[expandedProductId].thumbnail_url;
                          if (thumb && e.currentTarget.src !== thumb) {
                            e.currentTarget.src = thumb;
                          } else {
                            e.currentTarget.src = getProductImagePlaceholder(productsInChat[expandedProductId].name);
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm line-clamp-2">{productsInChat[expandedProductId].name}</p>
                      <p className="text-brand-logo-red font-bold mt-0.5">{formatPrice(productsInChat[expandedProductId].price)}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 fill-brand-logo-red text-brand-logo-red" />
                        {productsInChat[expandedProductId].rating} · {productsInChat[expandedProductId].category}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{productsInChat[expandedProductId].description}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => handleAddToCartInChat(productsInChat[expandedProductId])}
                          disabled={!!addingToCartId}
                          className="rounded-xl bg-gradient-to-r from-brand-logo-red to-brand-orange text-white shadow-glow"
                        >
                          {addingToCartId === expandedProductId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShoppingCart className="h-3.5 w-3.5" />
                          )}
                          {addingToCartId === expandedProductId ? "Adding…" : "Add to cart"}
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl" asChild>
                          <Link href={`/products/${expandedProductId}`} onClick={() => setExpandedProductId(null)}>
                            <ExternalLink className="h-3.5 w-3.5" />
                            View
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => send(`Show similar to ${expandedProductId}`)}
                        >
                          Similar
                        </Button>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setExpandedProductId(null)} className="flex-shrink-0 rounded-full" aria-label="Close">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom: optional tools (accordion) + fixed input */}
            <div className="shrink-0 px-4 pt-3 pb-3 border-t border-brand-concrete/25 dark:border-white/5 bg-white/95 dark:bg-brand-ink/95 space-y-3">
              <details className="group rounded-xl border border-brand-concrete/40 dark:border-white/10 bg-brand-concrete-light/25 dark:bg-white/[0.03] overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[11px] font-bold text-muted-foreground hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Zap className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                    <span className="truncate">Shopping, payments &amp; more</span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-4 px-3 pb-4 pt-1 border-t border-brand-concrete/20 dark:border-white/10">
                  <details className="group/r rounded-lg border border-brand-concrete/30 dark:border-white/10 bg-white/60 dark:bg-white/[0.02]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-1.5">
                        <ShoppingBag className="h-3.5 w-3.5 text-brand-logo-red" />
                        Shopping
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open/r:rotate-180" />
                    </summary>
                    <div className="flex flex-wrap gap-2 px-2.5 pb-3 pt-0">
                      {SUGGESTED_SHOPPING.map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={loading}
                          onClick={() => send(s)}
                          className="text-[11px] rounded-lg px-2.5 py-1.5 font-medium bg-brand-concrete-light dark:bg-white/5 border border-brand-concrete/50 dark:border-white/10 text-brand-ink dark:text-white hover:border-brand-orange/40 hover:bg-brand-orange/10 transition-colors disabled:opacity-50"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </details>

                  <details className="group/p rounded-lg border border-brand-concrete/30 dark:border-white/10 bg-white/60 dark:bg-white/[0.02]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5 text-brand-orange" />
                        Payments
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open/p:rotate-180" />
                    </summary>
                    <div className="flex flex-wrap gap-2 px-2.5 pb-3 pt-0">
                      {SUGGESTED_PAYMENTS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={loading}
                          onClick={() => send(s)}
                          className={cn(
                            "text-[11px] rounded-lg px-2.5 py-1.5 font-medium border transition-colors disabled:opacity-50",
                            s.includes("checkout") && cartCount > 0
                              ? "bg-gradient-to-r from-brand-dark-red to-brand-logo-red text-white border-0 shadow-sm font-bold"
                              : "bg-brand-concrete-light dark:bg-white/5 border-brand-concrete/50 dark:border-white/10 text-brand-ink dark:text-white hover:border-brand-logo-red/40"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </details>

                  <details className="group/o rounded-lg border border-brand-concrete/30 dark:border-white/10 bg-white/60 dark:bg-white/[0.02]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-1.5">
                        <Gift className="h-3.5 w-3.5 text-brand-logo-red" />
                        Offers
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open/o:rotate-180" />
                    </summary>
                    <div className="flex flex-wrap gap-2 px-2.5 pb-3 pt-0">
                      {SUGGESTED_OFFERS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={loading}
                          onClick={() => send(s)}
                          className="text-[11px] rounded-lg px-2.5 py-1.5 font-medium text-muted-foreground bg-transparent border border-brand-concrete/40 dark:border-white/10 hover:bg-muted/50 transition-colors disabled:opacity-50"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </details>

                  <details className="group/f rounded-lg border border-dashed border-brand-concrete/50 dark:border-white/15 bg-brand-concrete-light/40 dark:bg-white/[0.02]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground [&::-webkit-details-marker]:hidden">
                      <span>Refine · Budget / Brand / Size</span>
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open/f:rotate-180" />
                    </summary>
                    <div className="flex flex-wrap gap-2 px-2.5 pb-3 pt-0">
                      {REFINE_CHIPS.map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          disabled={loading}
                          onClick={() => send(c.send)}
                          className="text-[11px] rounded-lg px-2.5 py-1.5 font-semibold bg-white dark:bg-white/10 border border-brand-concrete/60 dark:border-white/15 text-brand-ink dark:text-white hover:border-brand-logo-red hover:bg-brand-logo-red/10 transition-colors disabled:opacity-50"
                        >
                          <span className="mr-1">{c.icon}</span>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </details>
                </div>
              </details>

              <div className="flex gap-2 items-end pt-1">
                <Input
                  placeholder={PLACEHOLDER_ROTATION[placeholderIndex]}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
                  className="flex-1 rounded-2xl border border-brand-concrete/50 dark:border-white/15 bg-white dark:bg-white/[0.05] px-4 py-2.5 min-h-[44px] h-11 text-sm shadow-inner focus-visible:ring-2 focus-visible:ring-brand-logo-red/30"
                />
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05, boxShadow: "0 0 24px -4px rgb(211 7 42 / 0.45)" }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => send(input)}
                  disabled={loading}
                  className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-brand-dark-red via-brand-logo-red to-brand-orange text-white shadow-glow flex items-center justify-center disabled:opacity-50"
                  aria-label="Send"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </motion.button>
              </div>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.06, boxShadow: "0 0 32px -4px rgb(211 7 42 / 0.45)" }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))] sm:right-[calc(1.5rem+env(safe-area-inset-right,0px))] z-50 h-14 w-14 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-brand-dark-red via-brand-logo-red to-brand-orange text-white shadow-glow-lg flex items-center justify-center border border-white/25 transition-all duration-200 touch-manipulation"
        aria-label="Open AI assistant"
      >
        <MessageCircle className="h-6 w-6 opacity-95" />
        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-brand-orange border-2 border-background animate-pulse shadow-lg" />
      </motion.button>
    </>
  );
}
