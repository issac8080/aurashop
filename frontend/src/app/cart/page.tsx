"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingBag, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/app/providers";
import { getCart, fetchRecommendations, trackEvent } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/lib/api";

export default function CartPage() {
  const { sessionId, refreshCart } = useCart();
  const [cart, setCart] = useState<Product[]>([]);
  const [upsells, setUpsells] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackEvent({
      event_type: "page_view",
      session_id: sessionId,
      metadata: { page: "cart" },
    });
  }, [sessionId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [cartRes, recRes] = await Promise.all([
          getCart(sessionId),
          fetchRecommendations(sessionId, { limit: 4 }),
        ]);
        setCart(cartRes.cart);
        const cartIds = cartRes.cart.map((p) => p.id);
        const upsellProducts = recRes.recommendations
          .filter((r) => !cartIds.includes(r.product_id))
          .slice(0, 4)
          .map((r) => (r.product ? { ...r.product, id: r.product_id } as Product : null))
          .filter(Boolean) as Product[];
        setUpsells(upsellProducts);
      } catch {
        setCart([]);
        setUpsells([]);
      } finally {
        setLoading(false);
      }
    }
    if (sessionId) load();
  }, [sessionId]);

  const total = cart.reduce((sum, p) => sum + p.price, 0);

  const handleRemove = async (productId: string) => {
    await trackEvent({
      event_type: "cart_remove",
      session_id: sessionId,
      product_id: productId,
    });
    refreshCart();
    const { cart: updated } = await getCart(sessionId);
    setCart(updated);
  };

  const handleAddToCart = (productId: string) => {
    trackEvent({ event_type: "cart_add", session_id: sessionId, product_id: productId });
    refreshCart();
  };

  const handleProductClick = (productId: string) => {
    trackEvent({ event_type: "product_click", session_id: sessionId, product_id: productId });
  };

  if (loading) {
    return (
      <div className="py-8 animate-pulse space-y-6">
        <div className="h-8 w-32 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="py-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your cart</h1>
        <Link href="/products">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Continue shopping
          </Button>
        </Link>
      </div>

      {cart.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Your cart is empty.</p>
          <Link href="/products">
            <Button>Browse products</Button>
          </Link>
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              {cart.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-4 rounded-xl border p-4 bg-card"
                >
                  <div
                    className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 bg-cover bg-center"
                    style={{
                      backgroundImage: item.image_url ? `url(${item.image_url})` : undefined,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item.id}`} className="font-medium hover:text-primary line-clamp-1">
                      {item.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{item.category}</p>
                    <p className="font-semibold text-primary">{formatPrice(item.price)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(item.id)}
                    aria-label="Remove from cart"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </motion.div>
              ))}
            </div>
            <div>
              <Card className="p-4 sticky top-24">
                <h2 className="font-semibold mb-2">Order summary</h2>
                <p className="text-2xl font-bold text-primary">{formatPrice(total)}</p>
                <p className="text-sm text-muted-foreground mt-1">{cart.length} item(s)</p>
                <Link href="/checkout">
                  <Button className="w-full mt-4" size="lg">
                    Proceed to checkout
                  </Button>
                </Link>
              </Card>
            </div>
          </div>

          {upsells.length > 0 && (
            <Card className="border-primary/20 bg-primary/5 p-4">
              <h2 className="font-semibold text-primary mb-3">People like you also bought</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {upsells.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    sessionId={sessionId}
                    onAddToCart={handleAddToCart}
                    trackClick={handleProductClick}
                  />
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
