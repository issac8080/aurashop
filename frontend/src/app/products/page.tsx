"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, SlidersHorizontal, ShoppingBag, Filter, X } from "lucide-react";
import { useCart, useAuth } from "@/app/providers";
import { fetchProducts, fetchCategories, fetchRecommendations, trackEvent } from "@/lib/api";
import type { Product } from "@/lib/api";

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get("category") ?? "";
  const { sessionId, refreshCart } = useCart();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [topPicks, setTopPicks] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string>(categoryFromUrl);
  const [minPrice, setMinPrice] = useState<string>(() => searchParams.get("min_price") ?? "");
  const [maxPrice, setMaxPrice] = useState<string>(() => searchParams.get("max_price") ?? "");
  const [minRating, setMinRating] = useState<string>(() => searchParams.get("min_rating") ?? "");
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    trackEvent({
      event_type: "page_view",
      session_id: sessionId,
      metadata: { page: "products" },
    });
  }, [sessionId]);

  useEffect(() => {
    fetchCategories().then((r) => setCategories(r.categories));
  }, []);

  useEffect(() => {
    setCategory(categoryFromUrl);
    if (searchParams.get("min_price") != null) setMinPrice(searchParams.get("min_price") ?? "");
    if (searchParams.get("max_price") != null) setMaxPrice(searchParams.get("max_price") ?? "");
    if (searchParams.get("min_rating") != null) setMinRating(searchParams.get("min_rating") ?? "");
  }, [categoryFromUrl, searchParams]);

  const router = useRouter();

  const updateUrl = useCallback(
    (updates: { category?: string; min_price?: string; max_price?: string; min_rating?: string }) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (updates.category !== undefined) (updates.category ? params.set("category", updates.category) : params.delete("category"));
      if (updates.min_price !== undefined) (updates.min_price ? params.set("min_price", updates.min_price) : params.delete("min_price"));
      if (updates.max_price !== undefined) (updates.max_price ? params.set("max_price", updates.max_price) : params.delete("max_price"));
      if (updates.min_rating !== undefined) (updates.min_rating ? params.set("min_rating", updates.min_rating) : params.delete("min_rating"));
      const q = params.toString();
      router.replace(q ? `/products?${q}` : "/products", { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [res, recRes] = await Promise.all([
          fetchProducts({
            category: category || undefined,
            min_price: minPrice ? Number(minPrice) : undefined,
            max_price: maxPrice ? Number(maxPrice) : undefined,
            min_rating: minRating ? Number(minRating) : undefined,
            limit: 200,
          }),
          fetchRecommendations(sessionId || "", { limit: 4, user_id: user?.email }),
        ]);
        setProducts(res.products ?? []);
        const picks = (recRes.recommendations ?? [])
          .map((r) => (r.product ? { ...r.product, id: r.product_id } as Product : null))
          .filter(Boolean) as Product[];
        setTopPicks(picks);
      } catch {
        const res = await fetchProducts({
          category: category || undefined,
          min_price: minPrice ? Number(minPrice) : undefined,
          max_price: maxPrice ? Number(maxPrice) : undefined,
          min_rating: minRating ? Number(minRating) : undefined,
          limit: 200,
        });
        setProducts(res.products ?? []);
        setTopPicks([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, user?.email, category, minPrice, maxPrice, minRating]);

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    updateUrl({ category: value || undefined });
  };
  const handleMinPriceChange = (value: string) => {
    setMinPrice(value);
    updateUrl({ min_price: value || undefined });
  };
  const handleMaxPriceChange = (value: string) => {
    setMaxPrice(value);
    updateUrl({ max_price: value || undefined });
  };
  const handleMinRatingChange = (value: string) => {
    setMinRating(value);
    updateUrl({ min_rating: value || undefined });
  };

  const handleAddToCart = async (productId: string) => {
    if (!user) {
      router.push("/login?from=" + encodeURIComponent("/products"));
      return;
    }
    try {
      await trackEvent({ event_type: "cart_add", session_id: sessionId, product_id: productId });
      await refreshCart();
    } catch (error) {
      console.error("Failed to add to cart:", error);
    }
  };

  const handleProductClick = (productId: string) => {
    trackEvent({ event_type: "product_click", session_id: sessionId, product_id: productId });
  };

  const categoryList = categories.length > 0 ? categories : ["Clothing", "Electronics", "Accessories", "Footwear"];

  const activeFiltersCount = [category, minPrice, maxPrice, minRating].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950/50 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Products
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {products.length} items {category && `in ${category}`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="lg:hidden rounded-xl gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-primary text-white text-xs">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        {/* Top picks – AI section */}
        {topPicks.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-primary/20 bg-gradient-to-br from-teal-50/80 to-emerald-50/60 dark:from-teal-950/40 dark:to-emerald-950/30 p-5 sm:p-6 shadow-sm mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-teal-700 dark:text-teal-300">
                Top picks for you
              </h2>
            </div>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {topPicks.map((p) => (
                <div key={p.id} className="flex-shrink-0 w-[165px] sm:w-[200px]">
                  <ProductCard
                    product={p}
                    sessionId={sessionId}
                    onAddToCart={handleAddToCart}
                    trackClick={handleProductClick}
                  />
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Main content: filters + grid */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters sidebar */}
          <aside
            className={`lg:w-64 flex-shrink-0 ${
              filtersOpen ? "fixed inset-0 z-50 bg-black/50 lg:relative lg:bg-transparent" : "hidden lg:block"
            }`}
            onClick={(e) => e.target === e.currentTarget && setFiltersOpen(false)}
          >
            <motion.div
              initial={false}
              animate={{ x: filtersOpen ? 0 : -20, opacity: filtersOpen ? 1 : 1 }}
              className={`${
                filtersOpen
                  ? "fixed left-0 top-0 bottom-0 w-80 max-w-[85vw]"
                  : "relative"
              } rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden lg:sticky lg:top-24`}
            >
              <div className="h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500" />
              <div className="p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5 text-primary" />
                    <h3 className="font-heading font-bold text-gray-900 dark:text-white">Filters</h3>
                  </div>
                  {filtersOpen && (
                    <button
                      onClick={() => setFiltersOpen(false)}
                      className="lg:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category</label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                  >
                    <option value="">All categories</option>
                    {categoryList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Min price (₹)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={minPrice}
                    onChange={(e) => handleMinPriceChange(e.target.value)}
                    className="mt-1.5 rounded-xl border-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Max price (₹)</label>
                  <Input
                    type="number"
                    placeholder="Any"
                    value={maxPrice}
                    onChange={(e) => handleMaxPriceChange(e.target.value)}
                    className="mt-1.5 rounded-xl border-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Min rating</label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step={0.5}
                    placeholder="0"
                    value={minRating}
                    onChange={(e) => handleMinRatingChange(e.target.value)}
                    className="mt-1.5 rounded-xl border-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl"
                    onClick={() => {
                      setCategory("");
                      setMinPrice("");
                      setMaxPrice("");
                      setMinRating("");
                      updateUrl({ category: undefined, min_price: undefined, max_price: undefined, min_rating: undefined });
                    }}
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            </motion.div>
          </aside>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[3/4] rounded-2xl bg-gray-200 dark:bg-gray-800/60 animate-pulse"
                  />
                ))}
              </div>
            ) : products.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
                  <ShoppingBag className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="font-heading text-xl font-bold text-gray-900 dark:text-white mb-2">
                  No products found
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Try adjusting your filters to see more results
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCategory("");
                    setMinPrice("");
                    setMaxPrice("");
                    setMinRating("");
                    updateUrl({ category: undefined, min_price: undefined, max_price: undefined, min_rating: undefined });
                  }}
                >
                  Clear filters
                </Button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  >
                    <ProductCard
                      product={product}
                      sessionId={sessionId}
                      onAddToCart={handleAddToCart}
                      trackClick={handleProductClick}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
