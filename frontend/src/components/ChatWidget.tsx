"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Sparkles, ShoppingBag, Star, ShoppingCart, ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import { getProductImageSrc, getProductImagePlaceholder } from "@/lib/unsplash";
import { useCart, useAuth } from "@/app/providers";
import { chatStream, fetchProduct, addToCart, type Product, type ChatAction } from "@/lib/api";

// Context-aware suggested prompts (action-first)
const SUGGESTED_DISCOVERY = [
  "Black shoes under ₹1000 for office",
  "Order any black shoe mens for me",
  "Find something under ₹5000",
  "Best casual wear",
];
const SUGGESTED_CART = ["Apply a coupon", "Proceed to checkout", "What's in my cart?"];
const SUGGESTED_WALLET = ["Check my wallet", "Tell me about AuraPoints"];
const SUGGESTED_GAMES = ["Spin the wheel", "Any discount coupons?"];

// Follow-up suggestions after assistant messages
const FOLLOW_UPS = [
  "Show more like this",
  "What's in my cart?",
  "Best under ₹3000",
  "Tell me about AuraPoints",
];

// Rich message content: **bold**, lists, links, code
function MessageContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const lines = content.split("\n");
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
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
              <span className="text-primary shrink-0">•</span>
              {rendered}
            </div>
          );
        }
        return <div key={i}>{rendered}</div>;
      })}
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-primary/80 animate-pulse align-middle" aria-hidden />
      )}
    </div>
  );
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
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm **Aura AI**, your context-aware shopping copilot. I can find products, manage your cart, apply coupons, show wallet balance, and more. Ask in plain language—e.g. \"Black shoes under ₹1000\" or \"What's in my cart?\"—or pick an option below.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [productsInChat, setProductsInChat] = useState<Record<string, Product>>({});
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);
  const [addedToCartMessage, setAddedToCartMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [initialMessageToSend, setInitialMessageToSend] = useState<string | null>(null);

  // Context for Aura AI (current page, cart, user)
  const chatContext = {
    current_page: pathname || "/",
    user_id: user?.email ?? null,
    cart_count: cartCount,
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, productsInChat, expandedProductId]);

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
      setAddedToCartMessage(`Added "${product.name}" to cart!`);
      setExpandedProductId(null);
      setTimeout(() => setAddedToCartMessage(null), 2500);
    } catch {
      setAddedToCartMessage("Could not add to cart. Try again.");
      setTimeout(() => setAddedToCartMessage(null), 2000);
    } finally {
      setAddingToCartId(null);
    }
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
  };

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }, { role: "assistant", content: "", product_ids: [], actions: [], isStreaming: true }]);
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
          next[idx] = { role: "assistant", content: next[idx].content, product_ids: productIds ?? [], actions: actions ?? [], isStreaming: false };
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
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] max-w-[calc(100vw-2rem)] h-[min(85vh,620px)] sm:h-[580px] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/20 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-cyan-500/10">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg ring-2 ring-white/30"
                >
                  <Sparkles className="h-5 w-5 text-white" />
                </motion.div>
                <div>
                  <p className="font-bold text-sm text-foreground">Aura AI</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse ring-2 ring-emerald-500/30" />
                    Context-aware shopping copilot
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-full hover:bg-primary/10">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-1 bg-gradient-to-b from-muted/30 to-background"
              ref={scrollRef}
            >
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i === messages.length - 1 ? 0.1 : 0 }}
                    className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[88%] rounded-2xl px-4 py-3 shadow-sm",
                        m.role === "user"
                          ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-br-md"
                          : "glass-card rounded-bl-md text-foreground border-primary/20 shadow-glow"
                      )}
                    >
                      <MessageContent content={m.content} isStreaming={m.isStreaming} />
                      {m.role === "assistant" && !m.isStreaming && m.content && (
                        <>
                          {m.actions && m.actions.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {m.actions.map((action, idx) => (
                                <Button
                                  key={idx}
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl text-xs font-semibold border-teal-300 dark:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50"
                                  onClick={() => handleActionClick(action)}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(FOLLOW_UPS.slice(0, 3)).map((s) => (
                              <motion.button
                                key={s}
                                type="button"
                                onClick={() => send(s)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="text-xs rounded-full border border-primary/30 dark:border-primary/50 bg-primary/5 dark:bg-primary/20 px-2.5 py-1 hover:bg-primary/10 dark:hover:bg-primary/30 text-primary font-medium transition-colors"
                              >
                                {s}
                              </motion.button>
                            ))}
                          </div>
                        </>
                      )}
                      {m.role === "assistant" && m.product_ids?.length ? (
                        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 -mx-1 scrollbar-thin">
                          {m.product_ids.slice(0, 4).map((id, idx) => {
                            const p = productsInChat[id];
                            if (!p)
                              return (
                                <div
                                  key={id}
                                  className="flex-shrink-0 w-[160px] h-[200px] rounded-xl bg-muted animate-pulse"
                                />
                              );
                            return (
                              <motion.div
                                key={id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                              >
                                <button
                                  type="button"
                                  onClick={() => setExpandedProductId(expandedProductId === id ? null : id)}
                                  className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden w-[160px] flex-shrink-0 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all duration-200 group text-left"
                                >
                                  <div className="relative h-28 w-full bg-muted overflow-hidden">
                                    <img
                                      src={getProductImageSrc(p.image_url, p.category, p.id, p.name)}
                                      alt={p.name}
                                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      loading="lazy"
                                      onError={(e) => {
                                        e.currentTarget.src = getProductImagePlaceholder(p.name);
                                      }}
                                    />
                                    <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-black/50 px-1.5 py-0.5 text-xs text-white">
                                      <Star className="h-3 w-3 fill-current" />
                                      {p.rating}
                                    </div>
                                  </div>
                                  <div className="p-2.5">
                                    <p className="font-medium text-xs line-clamp-2 text-foreground">{p.name}</p>
                                    <p className="text-primary font-bold text-sm mt-0.5">{formatPrice(p.price)}</p>
                                    {p.category && (
                                      <p className="text-[10px] text-muted-foreground truncate">{p.category}</p>
                                    )}
                                    <div className="flex gap-1.5 mt-1.5">
                                      <span className="text-[10px] text-primary/80 flex items-center gap-0.5">
                                        <ChevronDown className="h-3 w-3" /> Details
                                      </span>
                                      <Link
                                        href={`/products/${id}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-[10px] text-teal-600 dark:text-teal-400 font-medium flex items-center gap-0.5 hover:underline"
                                      >
                                        <ExternalLink className="h-3 w-3" /> View
                                      </Link>
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
                    <div className="rounded-2xl rounded-bl-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="h-2 w-2 rounded-full bg-primary"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.12 }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Inline product detail (no redirect – all in chat) */}
            <AnimatePresence>
              {expandedProductId && productsInChat[expandedProductId] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", damping: 25 }}
                  className="border-t border-border/80 bg-card overflow-hidden"
                >
                  <div className="p-4 flex gap-4">
                    <div className="relative w-24 h-24 rounded-xl bg-muted flex-shrink-0 overflow-hidden">
                      <img
                        src={getProductImageSrc(
                          productsInChat[expandedProductId].image_url,
                          productsInChat[expandedProductId].category,
                          productsInChat[expandedProductId].id,
                          productsInChat[expandedProductId].name
                        )}
                        alt={productsInChat[expandedProductId].name}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = getProductImagePlaceholder(productsInChat[expandedProductId].name);
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm line-clamp-2">{productsInChat[expandedProductId].name}</p>
                      <p className="text-primary font-bold mt-0.5">{formatPrice(productsInChat[expandedProductId].price)}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {productsInChat[expandedProductId].rating} · {productsInChat[expandedProductId].category}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{productsInChat[expandedProductId].description}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => handleAddToCartInChat(productsInChat[expandedProductId])}
                          disabled={!!addingToCartId}
                          className="rounded-lg gap-1.5"
                        >
                          {addingToCartId === expandedProductId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShoppingCart className="h-3.5 w-3.5" />
                          )}
                          {addingToCartId === expandedProductId ? "Adding..." : "Add to cart"}
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-lg gap-1.5" asChild>
                          <Link href={`/products/${expandedProductId}`} onClick={() => setExpandedProductId(null)}>
                            <ExternalLink className="h-3.5 w-3.5" />
                            View product
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setExpandedProductId(null)} className="rounded-lg">
                          Close
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

            {/* Added to cart toast */}
            <AnimatePresence>
              {addedToCartMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="mx-4 mb-2 py-2.5 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-medium text-center"
                >
                  {addedToCartMessage}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Context-aware suggested options (above input) + Ask box */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/80">
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
                Quick options
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  ...SUGGESTED_DISCOVERY.slice(0, 2),
                  ...(cartCount > 0 ? SUGGESTED_CART.slice(0, 2) : []),
                  ...SUGGESTED_WALLET.slice(0, 1),
                  ...SUGGESTED_GAMES.slice(0, 1),
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    disabled={loading}
                    className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-primary/50 dark:hover:border-primary text-gray-700 dark:text-gray-300 font-medium transition-colors disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Black shoes under ₹1000, What's in my cart?"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm"
                />
                <Button
                  size="icon"
                  onClick={() => send(input)}
                  disabled={loading}
                  className="rounded-xl bg-primary hover:opacity-90 text-white shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB - glowing AI assistant */}
      <motion.button
        whileHover={{ scale: 1.08, boxShadow: "0 0 32px -4px rgba(99, 102, 241, 0.5), 0 0 48px -8px rgba(34, 211, 238, 0.3)" }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 sm:right-5 z-50 h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-600 text-white shadow-glow-lg flex items-center justify-center border border-white/20 transition-all duration-200"
        aria-label="Open AI assistant"
      >
        <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full bg-cyan-400 border-2 border-background animate-pulse shadow-lg shadow-cyan-400/50" />
      </motion.button>
    </>
  );
}
