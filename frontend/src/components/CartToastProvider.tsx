"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ToastKind = "success" | "error";

type ToastPayload = {
  id: number;
  kind: ToastKind;
  message: string;
};

type CartToastOptions = {
  /** When adding several items at once (e.g. outfit bundle). */
  itemCount?: number;
};

type CartToastContextValue = {
  showAddedToCart: (productName?: string | null, options?: CartToastOptions) => void;
  showAddToCartError: (message?: string) => void;
};

const CartToastContext = createContext<CartToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4500;

export function CartToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  };

  const dismiss = useCallback(() => {
    clearTimer();
    setToast(null);
  }, []);

  const showAddedToCart = useCallback((productName?: string | null, options?: CartToastOptions) => {
    clearTimer();
    const id = Date.now();
    let message: string;
    const n = options?.itemCount ?? 0;
    if (n > 1) {
      message = `${n} items were added to your cart successfully.`;
    } else if (productName?.trim()) {
      message = `“${productName.trim()}” was added to your cart successfully.`;
    } else {
      message = "Added to cart successfully.";
    }
    setToast({ id, kind: "success", message });
    dismissTimer.current = setTimeout(dismiss, AUTO_DISMISS_MS);
  }, [dismiss]);

  const showAddToCartError = useCallback(
    (message = "Couldn’t add to cart. Please try again.") => {
      clearTimer();
      const id = Date.now();
      setToast({ id, kind: "error", message });
      dismissTimer.current = setTimeout(dismiss, 5000);
    },
    [dismiss]
  );

  useEffect(() => () => clearTimer(), []);

  return (
    <CartToastContext.Provider value={{ showAddedToCart, showAddToCartError }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-3 pt-[4.5rem] sm:pt-20 sm:justify-end sm:pr-4">
        <AnimatePresence mode="sync">
          {toast && (
            <motion.div
              key={toast.id}
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="pointer-events-auto w-full max-w-md rounded-2xl border-2 border-brand-concrete/70 bg-white shadow-2xl dark:border-white/15 dark:bg-brand-ink"
            >
              <div className="flex items-start gap-3 p-4">
                {toast.kind === "success" ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                ) : (
                  <AlertCircle className="h-6 w-6 shrink-0 text-brand-logo-red" aria-hidden />
                )}
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-bold text-brand-ink dark:text-brand-concrete-light leading-snug">
                    {toast.kind === "success" ? "Added to cart" : "Something went wrong"}
                  </p>
                  <p className="text-sm text-brand-ink/80 dark:text-brand-concrete/85 mt-0.5 leading-snug">
                    {toast.message}
                  </p>
                  {toast.kind === "success" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="rounded-xl font-bold bg-brand-logo-red hover:bg-brand-logo-red/90 text-white h-9"
                        asChild
                      >
                        <Link href="/cart" onClick={dismiss}>
                          View cart
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-xl font-semibold h-9" asChild>
                        <Link href="/checkout" onClick={dismiss}>
                          Checkout
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={dismiss}
                  className="rounded-lg p-1 text-brand-ink/50 hover:bg-brand-concrete-light hover:text-brand-ink dark:hover:bg-white/10"
                  aria-label="Dismiss"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CartToastContext.Provider>
  );
}

export function useCartToast() {
  const ctx = useContext(CartToastContext);
  if (!ctx) throw new Error("useCartToast must be used within CartToastProvider");
  return ctx;
}
