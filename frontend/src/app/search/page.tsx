"use client";

import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { useCart, useAuth } from "@/app/providers";
import { useCartToast } from "@/components/CartToastProvider";
import { fetchProducts, trackEvent, type StoreMode } from "@/lib/api";
import type { Product } from "@/lib/api";
import { useStoreMode } from "@/context/store-mode-context";

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams?.get("q") || "";
  const { isGroceries, setStoreMode } = useStoreMode();
  const { sessionId, refreshCart } = useCart();
  const { user } = useAuth();
  const { showAddedToCart, showAddToCartError } = useCartToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    if (searchParams.get("store") === "groceries") {
      setStoreMode("groceries");
    }
  }, [searchParams, setStoreMode]);

  useEffect(() => {
    trackEvent({
      event_type: "search",
      session_id: sessionId,
      query,
      metadata: { page: "search", store: isGroceries ? "groceries" : "general" },
    });
  }, [sessionId, query, isGroceries]);

  useEffect(() => {
    async function search() {
      setLoading(true);
      const store: StoreMode = isGroceries ? "groceries" : "general";
      try {
        const { products: allProducts } = await fetchProducts({ store, limit: 500 });
        const lowerQuery = query.toLowerCase();
        const filtered = allProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(lowerQuery) ||
            p.description.toLowerCase().includes(lowerQuery) ||
            p.category.toLowerCase().includes(lowerQuery) ||
            p.tags.some((t) => t.toLowerCase().includes(lowerQuery)) ||
            p.brand?.toLowerCase().includes(lowerQuery)
        );
        setProducts(filtered);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    if (query) search();
  }, [query, isGroceries]);

  const handleAddToCart = async (productId: string) => {
    if (!user) {
      const from = query ? `/search?q=${encodeURIComponent(query)}` : "/search";
      router.push("/login?from=" + encodeURIComponent(from));
      return;
    }
    try {
      await trackEvent({ event_type: "cart_add", session_id: sessionId, product_id: productId });
      await refreshCart();
      const name = products.find((p) => p.id === productId)?.name;
      showAddedToCart(name);
    } catch (error) {
      console.error("Failed to add to cart:", error);
      showAddToCartError();
    }
  };

  const handleProductClick = (productId: string) => {
    trackEvent({ event_type: "product_click", session_id: sessionId, product_id: productId });
  };

  return (
    <div className="py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Search className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="font-heading text-fluid-2xl sm:text-fluid-3xl font-bold tracking-tight">Search Results</h1>
          {query && (
            <p className="text-muted-foreground">
              {loading ? "Searching..." : `${products.length} results for "${query}"`}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-72 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <Search className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No products found</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              sessionId={sessionId}
              onAddToCart={handleAddToCart}
              trackClick={handleProductClick}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="py-8 space-y-6"><div className="h-8 w-64 bg-muted animate-pulse rounded" /><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <div key={i} className="h-72 rounded-xl bg-muted animate-pulse" />)}</div></div>}>
      <SearchPageContent />
    </Suspense>
  );
}
