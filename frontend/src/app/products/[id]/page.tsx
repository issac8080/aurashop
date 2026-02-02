"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, ShoppingCart, ArrowLeft, Sparkles, Share2, Heart, Eye, Truck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProductCard } from "@/components/ProductCard";
import { useCart, useAuth } from "@/app/providers";
import { fetchProduct, fetchRecommendations, trackEvent } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { getProductImageSrc, getProductImagePlaceholder } from "@/lib/unsplash";
import type { Product } from "@/lib/api";

export default function ProductDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { sessionId, refreshCart } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    trackEvent({
      event_type: "product_click",
      session_id: sessionId,
      product_id: id,
    });
    trackEvent({
      event_type: "page_view",
      session_id: sessionId,
      product_id: id,
      metadata: { page: "product_detail" },
    });
  }, [id, sessionId]);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const [p, recRes] = await Promise.all([
          fetchProduct(id),
          fetchRecommendations(sessionId, { limit: 4, exclude_product_ids: id, user_id: user?.email }),
        ]);
        setProduct(p);
        const similarProducts = recRes.recommendations
          .map((r) => (r.product ? { ...r.product, id: r.product_id } as Product : null))
          .filter(Boolean) as Product[];
        setSimilar(similarProducts);
      } catch {
        setProduct(null);
        setSimilar([]);
      } finally {
        setLoading(false);
      }
    }
    if (sessionId && id) load();
  }, [id, sessionId, user?.email]);

  const router = useRouter();
  const handleAddToCart = (productId: string) => {
    if (!user) {
      router.push("/login?from=" + encodeURIComponent("/products/" + (id || productId)));
      return;
    }
    trackEvent({ event_type: "cart_add", session_id: sessionId, product_id: productId });
    refreshCart();
  };

  const handleProductClick = (productId: string) => {
    trackEvent({ event_type: "product_click", session_id: sessionId, product_id: productId });
  };

  if (loading && !product) {
    return (
      <div className="py-8 animate-pulse space-y-6">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-muted rounded-xl" />
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Product not found.</p>
        <Link href="/products">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to products
          </Button>
        </Link>
      </div>
    );
  }

  const whyRight = [
    product.rating >= 4.5 && "Highly rated by buyers",
    product.review_count > 100 && "Popular choice",
    product.in_stock && product.stock_count != null && product.stock_count <= 10 && "Only a few left",
    product.price < 2000 && "Great value for money",
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-24 space-y-8">
        <Link href="/products" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to products
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-white/60 dark:border-white/10 bg-white/70 dark:bg-gray-900/60 backdrop-blur-2xl shadow-xl overflow-hidden"
        >
          <div className="grid md:grid-cols-2 gap-0">
            <div className="relative aspect-square md:aspect-auto bg-gray-100 dark:bg-gray-800/50">
              <img
                src={getProductImageSrc(product.image_url, product.category, product.id, product.name)}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = getProductImagePlaceholder(product.name);
                }}
              />
              <div className="absolute top-4 left-4 flex gap-2">
                {product.stock_count != null && product.stock_count <= 10 && (
                  <span className="px-3 py-1 rounded-full bg-amber-500/90 text-white text-xs font-bold shadow-sm backdrop-blur-md">
                    Only {product.stock_count} left
                  </span>
                )}
                {product.rating >= 4.5 && (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-bold shadow-sm backdrop-blur-md flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" /> Top Rated
                  </span>
                )}
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                 <div className="px-3 py-1.5 rounded-xl bg-black/40 text-white text-xs font-medium backdrop-blur-md flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    {Math.floor(Math.random() * 20) + 10} people viewing
                 </div>
                 <Button size="icon" variant="secondary" className="rounded-full h-10 w-10 bg-white/90 hover:bg-white text-gray-900 shadow-lg">
                    <Share2 className="h-4 w-4" />
                 </Button>
              </div>
            </div>

            <div className="p-6 sm:p-8 md:p-10 flex flex-col h-full">
              <div className="mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">{product.category}</p>
                    <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
                      {product.name}
                    </h1>
                  </div>
                  <Button size="icon" variant="ghost" className="rounded-full h-10 w-10 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Heart className="h-5 w-5" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-lg">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    <span className="font-bold text-amber-700 dark:text-amber-400 text-sm">{product.rating}</span>
                  </div>
                  <span className="text-sm text-muted-foreground underline decoration-dotted">
                    {product.review_count} reviews
                  </span>
                </div>
              </div>

              <div className="mb-8">
                <p className="font-heading text-4xl font-bold text-gray-900 dark:text-white flex items-baseline gap-2">
                  {formatPrice(product.price)}
                  <span className="text-lg font-normal text-muted-foreground line-through decoration-2 decoration-red-400/50">
                    {formatPrice(product.price * 1.2)}
                  </span>
                  <span className="text-sm font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md align-top -mt-1">
                    20% OFF
                  </span>
                </p>
                <p className="text-muted-foreground mt-4 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-4 mb-8">
                {product.colors?.length ? (
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white block mb-2">Select Color</span>
                    <div className="flex flex-wrap gap-2">
                      {product.colors.map((c) => (
                        <button key={c} className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary/50 focus:border-primary bg-transparent text-sm font-medium transition-all">
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {product.sizes?.length ? (
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white block mb-2">Select Size</span>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((s) => (
                        <button key={s} className="h-10 min-w-[2.5rem] px-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary/50 focus:border-primary bg-transparent text-sm font-medium transition-all flex items-center justify-center">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-auto space-y-4">
                <div className="flex gap-3">
                  <Button
                    size="lg"
                    className="flex-1 rounded-full h-14 text-base font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                    onClick={() => handleAddToCart(product.id)}
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Add to Cart
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full h-14 px-6 border-2 font-bold">
                    Buy Now
                  </Button>
                </div>
                
                <div className="flex items-center justify-center gap-6 text-xs font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Truck className="h-4 w-4" /> Free Delivery</span>
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> 1 Year Warranty</span>
                  <span className="flex items-center gap-1.5"><RotateCcw className="h-4 w-4" /> 7 Day Returns</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {whyRight.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border border-white/60 dark:border-white/10 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 backdrop-blur-xl p-6 sm:p-8"
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-sm shrink-0">
                <Sparkles className="h-6 w-6 text-indigo-500" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white mb-2">Why this is perfect for you</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {whyRight.map((line, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-gray-800/40 rounded-lg px-3 py-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {similar.length > 0 && (
          <section className="pt-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-white">You might also like</h2>
              <Link href="/products" className="text-sm font-medium text-primary hover:underline">View all</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {similar.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  sessionId={sessionId}
                  onAddToCart={handleAddToCart}
                  trackClick={handleProductClick}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
