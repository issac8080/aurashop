"use client";

import { Suspense, useEffect, useLayoutEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, SlidersHorizontal, ShoppingBag, Filter, X, ChevronDown, Bot, MessageCircle } from "lucide-react";
import { useCart, useAuth } from "@/app/providers";
import { useCartToast } from "@/components/CartToastProvider";
import {
  fetchProducts,
  fetchCategories,
  fetchRecommendations,
  trackEvent,
  type Product,
} from "@/lib/api";
import { useStoreMode } from "@/context/store-mode-context";
import { cn } from "@/lib/utils";

type SortMode = "best_for_you" | "trending" | "best_value";

function valueScore(p: Product) {
  return (p.rating * Math.log10((p.review_count || 0) + 10)) / Math.max(p.price, 1);
}

function cardBadgeFor(
  product: Product,
  index: number,
  sortMode: SortMode,
  topPickIds: Set<string>
): "best_match" | "value" | "trending" | "popular" | null {
  if (sortMode === "best_for_you") {
    if (topPickIds.has(product.id)) return "best_match";
    if (index < 2 && product.rating >= 4.5) return "value";
    if (product.review_count >= 220 && product.rating >= 4.2 && product.rating <= 4.55) return "popular";
    return null;
  }
  if (sortMode === "trending") {
    return index < 4 ? "trending" : null;
  }
  if (sortMode === "best_value") {
    return index < 4 ? "value" : null;
  }
  return null;
}

const FALLBACK_CATEGORY_OPTIONS: { slug: string; name: string }[] = [
  { slug: "smartphones", name: "Smartphones" },
  { slug: "laptops", name: "Laptops" },
  { slug: "fragrances", name: "Fragrances" },
  { slug: "mens-shirts", name: "Mens Shirts" },
  { slug: "groceries", name: "Groceries" },
];

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get("category") ?? "";
  const sortFromUrl = searchParams.get("sort");
  const { storeMode, setStoreMode } = useStoreMode();
  const { sessionId, refreshCart } = useCart();
  const { user } = useAuth();
  const { showAddedToCart, showAddToCartError } = useCartToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [topPicks, setTopPicks] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [category, setCategory] = useState<string>(categoryFromUrl);
  const [minPrice, setMinPrice] = useState<string>(() => searchParams.get("min_price") ?? "");
  const [maxPrice, setMaxPrice] = useState<string>(() => searchParams.get("max_price") ?? "");
  const [minRating, setMinRating] = useState<string>(() => searchParams.get("min_rating") ?? "");
  const [loading, setLoading] = useState(true);
  const [catalogFallback, setCatalogFallback] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    if (sortFromUrl === "trending") return "trending";
    if (sortFromUrl === "best_value") return "best_value";
    return "best_for_you";
  });
  const [filterSections, setFilterSections] = useState({ category: true, price: true, rating: true });

  const topPickIds = useMemo(() => new Set(topPicks.map((p) => p.id)), [topPicks]);

  const categoryOptions = useMemo(
    () => (categories.length > 0 ? categories : FALLBACK_CATEGORY_OPTIONS),
    [categories]
  );

  const categoryListFiltered = useMemo(() => {
    if (storeMode === "groceries") {
      return categoryOptions.filter((c) => c.slug === "groceries");
    }
    return categoryOptions.filter((c) => c.slug !== "groceries");
  }, [categoryOptions, storeMode]);

  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sortMode === "trending") {
      return list.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
    }
    if (sortMode === "best_value") {
      return list.sort((a, b) => valueScore(b) - valueScore(a));
    }
    const picks = list.filter((p) => topPickIds.has(p.id));
    const rest = list.filter((p) => !topPickIds.has(p.id));
    picks.sort(
      (a, b) => topPicks.findIndex((x) => x.id === a.id) - topPicks.findIndex((x) => x.id === b.id)
    );
    rest.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return [...picks, ...rest];
  }, [products, sortMode, topPickIds, topPicks]);

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
    const s = searchParams.get("sort");
    if (s === "trending" || s === "best_value" || s === "best_for_you") {
      setSortMode(s);
    }
  }, [categoryFromUrl, searchParams]);

  const router = useRouter();

  const updateUrl = useCallback(
    (updates: { category?: string; min_price?: string; max_price?: string; min_rating?: string }) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (storeMode === "groceries") {
        params.set("store", "groceries");
      } else {
        params.delete("store");
        if (params.get("category") === "groceries") {
          params.delete("category");
        }
      }
      if (updates.category !== undefined) (updates.category ? params.set("category", updates.category) : params.delete("category"));
      if (updates.min_price !== undefined) (updates.min_price ? params.set("min_price", updates.min_price) : params.delete("min_price"));
      if (updates.max_price !== undefined) (updates.max_price ? params.set("max_price", updates.max_price) : params.delete("max_price"));
      if (updates.min_rating !== undefined) (updates.min_rating ? params.set("min_rating", updates.min_rating) : params.delete("min_rating"));
      const q = params.toString();
      router.replace(q ? `/products?${q}` : "/products", { scroll: false });
    },
    [router, searchParams, storeMode]
  );

  useLayoutEffect(() => {
    if (searchParams.get("store") === "groceries" || searchParams.get("category") === "groceries") {
      setStoreMode("groceries");
    }
  }, [searchParams, setStoreMode]);

  useEffect(() => {
    if (storeMode !== "groceries" || !category) return;
    if (categoryListFiltered.length === 0) return;
    const valid = categoryListFiltered.some((c) => c.slug === category);
    if (!valid) {
      setCategory("");
      const p = new URLSearchParams(searchParams.toString());
      p.set("store", "groceries");
      p.delete("category");
      const next = p.toString();
      router.replace(next ? `/products?${next}` : "/products?store=groceries", { scroll: false });
    }
  }, [storeMode, category, categoryListFiltered, searchParams, router]);

  useEffect(() => {
    const p = new URLSearchParams(searchParams.toString());
    if (storeMode === "groceries") {
      if (p.get("store") !== "groceries" || (p.get("category") && p.get("category") !== "groceries")) {
        p.set("store", "groceries");
        if (p.get("category") && p.get("category") !== "groceries") {
          p.delete("category");
        }
        const next = p.toString();
        router.replace(next ? `/products?${next}` : "/products?store=groceries", { scroll: false });
        return;
      }
      return;
    }
    if (p.get("store") === "groceries" || p.get("category") === "groceries") {
      p.delete("store");
      if (p.get("category") === "groceries") p.delete("category");
      const next = p.toString();
      router.replace(next ? `/products?${next}` : "/products", { scroll: false });
    }
  }, [storeMode, searchParams, router]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [res, recRes] = await Promise.all([
          fetchProducts({
            store: storeMode,
            category: category || undefined,
            min_price: minPrice ? Number(minPrice) : undefined,
            max_price: maxPrice ? Number(maxPrice) : undefined,
            min_rating: minRating ? Number(minRating) : undefined,
            limit: 200,
          }),
          fetchRecommendations(sessionId || "", { limit: 4, user_id: user?.email }),
        ]);
        setProducts(res.products ?? []);
        setCatalogFallback(res.usedFallback);
        const picks = (recRes.recommendations ?? [])
          .map((r) => (r.product ? { ...r.product, id: r.product_id } as Product : null))
          .filter(Boolean) as Product[];
        setTopPicks(picks);
      } catch {
        const res = await fetchProducts({
          store: storeMode,
          category: category || undefined,
          min_price: minPrice ? Number(minPrice) : undefined,
          max_price: maxPrice ? Number(maxPrice) : undefined,
          min_rating: minRating ? Number(minRating) : undefined,
          limit: 200,
        });
        setProducts(res.products ?? []);
        setCatalogFallback(res.usedFallback);
        setTopPicks([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, user?.email, category, minPrice, maxPrice, minRating, storeMode]);

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
      const name =
        products.find((p) => p.id === productId)?.name ??
        topPicks.find((p) => p.id === productId)?.name;
      showAddedToCart(name);
    } catch (error) {
      console.error("Failed to add to cart:", error);
      showAddToCartError();
    }
  };

  const handleProductClick = (productId: string) => {
    trackEvent({ event_type: "product_click", session_id: sessionId, product_id: productId });
  };

  const activeFiltersCount = [category, minPrice, maxPrice, minRating].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950/50 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl border border-brand-concrete/70 dark:border-white/10 bg-brand-concrete-light/95 dark:bg-brand-ink/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-start gap-3 text-left">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-logo-red text-white shadow-md">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="font-heading font-bold text-brand-dark-red dark:text-brand-concrete-light">
                Not sure? Ask Aura AI to find the best for you
              </p>
              <p className="text-sm text-brand-ink/70 dark:text-brand-concrete/80 mt-0.5">
                Describe budget, occasion, or style — get a shortlist in chat.
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="shrink-0 rounded-xl font-bold bg-brand-logo-red hover:bg-brand-logo-red/90 text-white gap-2"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("open-aurashop-chat", {
                  detail: { initialMessage: "Help me pick the best product from this category for my needs." },
                })
              )
            }
          >
            <MessageCircle className="h-4 w-4" />
            Ask Aura AI
          </Button>
        </motion.div>

        {catalogFallback && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
          >
            Live catalog could not be reached. Showing offline sample products until the connection is restored.
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#521109] dark:text-white">
              {storeMode === "groceries" ? "Groceries" : "Products"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {sortedProducts.length} items{" "}
              {category && `in ${categoryListFiltered.find((c) => c.slug === category)?.name ?? category}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 sr-only sm:not-sr-only sm:inline">
              Sort
            </label>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="best_for_you">Best for you</option>
              <option value="trending">Trending</option>
              <option value="best_value">Best value</option>
            </select>
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
        </div>

        {/* Top picks – AI section */}
        {topPicks.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-brand-concrete/60 dark:border-white/10 bg-brand-concrete-light/90 dark:bg-brand-ink/70 p-5 sm:p-6 shadow-sm mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-logo-red text-white shadow-md">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-brand-dark-red dark:text-brand-concrete-light">
                Top picks for you
              </h2>
            </div>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {topPicks.map((p, i) => (
                <div key={p.id} className="flex-shrink-0 w-[165px] sm:w-[200px]">
                  <ProductCard
                    product={p}
                    badge={i === 0 ? "best_match" : i === 1 ? "value" : null}
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
              <div className="h-1 bg-aura-gradient" />
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
                <div className="border-b border-gray-100 dark:border-gray-800 pb-1">
                  <button
                    type="button"
                    onClick={() => setFilterSections((s) => ({ ...s, category: !s.category }))}
                    className="flex w-full items-center justify-between py-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Category
                    <ChevronDown className={cn("h-4 w-4 transition-transform", filterSections.category && "rotate-180")} />
                  </button>
                  {filterSections.category && (
                    <select
                      value={category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="mt-1.5 mb-3 w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                    >
                      <option value="">All categories</option>
                      {categoryListFiltered.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="border-b border-gray-100 dark:border-gray-800 pb-1">
                  <button
                    type="button"
                    onClick={() => setFilterSections((s) => ({ ...s, price: !s.price }))}
                    className="flex w-full items-center justify-between py-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Price
                    <ChevronDown className={cn("h-4 w-4 transition-transform", filterSections.price && "rotate-180")} />
                  </button>
                  {filterSections.price && (
                    <div className="space-y-3 pb-2">
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Min price (₹)</label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={minPrice}
                          onChange={(e) => handleMinPriceChange(e.target.value)}
                          className="mt-1 rounded-xl border-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Max price (₹)</label>
                        <Input
                          type="number"
                          placeholder="Any"
                          value={maxPrice}
                          onChange={(e) => handleMaxPriceChange(e.target.value)}
                          className="mt-1 rounded-xl border-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setFilterSections((s) => ({ ...s, rating: !s.rating }))}
                    className="flex w-full items-center justify-between py-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Rating
                    <ChevronDown className={cn("h-4 w-4 transition-transform", filterSections.rating && "rotate-180")} />
                  </button>
                  {filterSections.rating && (
                    <div className="pb-2">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Min rating</label>
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        step={0.5}
                        placeholder="0"
                        value={minRating}
                        onChange={(e) => handleMinRatingChange(e.target.value)}
                        className="mt-1 rounded-xl border-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  )}
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
                {sortedProducts.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  >
                    <ProductCard
                      product={product}
                      badge={cardBadgeFor(product, i, sortMode, topPickIds)}
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

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="py-8"><div className="h-10 w-48 bg-muted animate-pulse rounded mb-6" /><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <div key={i} className="h-72 rounded-xl bg-muted animate-pulse" />)}</div></div>}>
      <ProductsPageContent />
    </Suspense>
  );
}
