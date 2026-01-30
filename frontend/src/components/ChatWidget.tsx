"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCart } from "@/app/providers";
import { chat, fetchProduct, type Product } from "@/lib/api";

const SUGGESTED = [
  "Find me something under ₹2000",
  "Show trending products",
  "Best casual wear for office",
  "Gift ideas for tech lover",
  "Compare top-rated electronics",
  "Outfit for party under ₹5000",
];

export function ChatWidget() {
  const { sessionId } = useCart();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; product_ids?: string[] }[]>([
    {
      role: "assistant",
      content: "Hi! ✨ I'm your personal AuraShop AI assistant. I can help you find products, compare options, suggest outfits, and answer questions about our catalog. What are you looking for today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [productsInChat, setProductsInChat] = useState<Record<string, Product>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
      const res = await chat(sessionId || "", msg, history);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: res.content, product_ids: res.product_ids },
      ]);
      if (res.product_ids?.length) {
        const seen = { ...productsInChat };
        for (const id of res.product_ids) {
          if (!seen[id]) {
            try {
              const p = await fetchProduct(id);
              seen[id] = p;
            } catch {
              // ignore
            }
          }
        }
        setProductsInChat(seen);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry, I couldn't process that. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[400px] h-[550px] rounded-2xl border bg-card shadow-2xl flex flex-col overflow-hidden"
            >
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-purple-500/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm">AI Shopping Assistant</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Online & ready to help
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close chat">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex",
                      m.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      {m.role === "assistant" && m.product_ids?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {m.product_ids.slice(0, 4).map((id) => {
                            const p = productsInChat[id];
                            if (!p) return <span key={id} className="text-xs text-muted-foreground">Loading...</span>;
                            return (
                              <a
                                key={id}
                                href={`/products/${id}`}
                                className="inline-flex flex-col rounded-lg border bg-background p-2 text-left w-[140px] hover:border-primary transition-colors"
                              >
                                <p className="font-medium text-xs line-clamp-1">{p.name}</p>
                                <p className="text-primary text-xs font-semibold">{p.price} ₹</p>
                              </a>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-muted px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-3 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask for recommendations..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send(input)}
                  className="flex-1"
                />
                <Button size="icon" onClick={() => send(input)} disabled={loading}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="text-xs rounded-full border bg-muted/50 px-2.5 py-1 hover:bg-muted transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 sm:right-6 z-50 h-16 w-16 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white shadow-2xl flex items-center justify-center ring-4 ring-primary/20"
        aria-label="Open AI assistant"
      >
        <MessageCircle className="h-7 w-7" />
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
      </motion.button>
    </>
  );
}
