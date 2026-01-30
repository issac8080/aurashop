"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getSessionId } from "@/lib/session";
import { getCart } from "@/lib/api";

type CartContextType = {
  cartCount: number;
  refreshCart: () => Promise<void>;
  sessionId: string;
};

const CartContext = createContext<CartContextType | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState("");
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = useCallback(async () => {
    const sid = getSessionId();
    setSessionId(sid);
    try {
      const { cart } = await getCart(sid);
      setCartCount(cart.length);
    } catch {
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    const sid = getSessionId();
    setSessionId(sid);
    getCart(sid)
      .then(({ cart }) => setCartCount(cart.length))
      .catch(() => setCartCount(0));
  }, []);

  return (
    <CartContext.Provider value={{ cartCount, refreshCart, sessionId }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within Providers");
  return ctx;
}
