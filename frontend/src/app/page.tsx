"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  MessageCircle,
  ChevronDown,
  ShoppingCart,
  ShoppingBag,
  Bot,
  Plus,
  ChevronRight,
  Star,
  Eye,
  Heart,
  Gift,
  Zap,
  TrendingUp,
  Users,
  Clock,
  Target,
  Shirt,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCart, useAuth } from "@/app/providers";
import {
  fetchProducts,
  fetchRecommendations,
  fetchCategories,
  fetchUserOrders,
  playCouponGame,
  playJackpot,
  playScratch,
  trackEvent,
  type Product,
  type Order,
} from "@/lib/api";
import { getProductImageSrc, getProductImagePlaceholder } from "@/lib/unsplash";
import { formatPrice } from "@/lib/utils";

const FALLBACK_CATEGORIES = ["Electronics", "Clothing", "Accessories", "Footwear", "Watches", "Mobile", "Home"];

export default function HomePage() {
  const { sessionId, refreshCart, cartCount } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [trending, setTrending] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Gaming states
  const [spinResult, setSpinResult] = useState<any>(null);
  const [guessGameOpen, setGuessGameOpen] = useState(false);
  const [guessProduct, setGuessProduct] = useState<Product | null>(null);
  const [guessAnswer, setGuessAnswer] = useState<"yes" | "no" | null>(null);
  const [mysteryBoxOpen, setMysteryBoxOpen] = useState(false);
  const [mysteryProduct, setMysteryProduct] = useState<Product | null>(null);
  
  // Engagement features
  const [outfitBuilderOpen, setOutfitBuilderOpen] = useState(false);
  const [outfitProducts, setOutfitProducts] = useState<Product[]>([]);
  const [vibeSwipeOpen, setVibeSwipeOpen] = useState(false);
  const [vibeProducts, setVibeProducts] = useState<Product[]>([]);
  const [vibeIndex, setVibeIndex] = useState(0);
  const [likedProducts, setLikedProducts] = useState<string[]>([]);
  
  const [cartPopUpOpen, setCartPopUpOpen] = useState(false);
  const [cartPopUpDismissed, setCartPopUpDismissed] = useState(false);

  const pickedForName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "Issac";

  useEffect(() => {
    fetchCategories()
      .then((r) => setCategories(r.categories?.length ? r.categories : FALLBACK_CATEGORIES))
      .catch(() => setCategories(FALLBACK_CATEGORIES));
  }, []);

  useEffect(() => {
    trackEvent({ event_type: "page_view", session_id: sessionId, metadata: { page: "home" } });
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = sessionStorage.getItem("aurashop_cart_popup_dismissed") === "1";
    if (dismissed) {
      setCartPopUpDismissed(true);
      return;
    }
    if (cartCount != null && cartCount > 0) {
      setCartPopUpOpen(true);
    }
  }, [cartCount]);

  const handleCartPopUpClose = (open: boolean) => {
    if (!open) {
      setCartPopUpOpen(false);
      setCartPopUpDismissed(true);
      if (typeof window !== "undefined") sessionStorage.setItem("aurashop_cart_popup_dismissed", "1");
    }
  };

  const loadAll = useCallback(async () => {
    try {
      const [recRes, productsRes] = await Promise.all([
        sessionId ? fetchRecommendations(sessionId, { limit: 10, user_id: user?.email }) : Promise.resolve({ recommendations: [] }),
        fetchProducts({ limit: 50 }),
      ]);
      const recProducts = (recRes.recommendations || [])
        .map((r) => (r.product ? { ...r.product, id: r.product_id } as Product : null))
        .filter(Boolean) as Product[];
      const products = productsRes.products || [];
      setRecommended(recProducts.length > 0 ? recProducts : products.slice(0, 10));
      setTrending([...products].sort((a, b) => b.review_count - a.review_count).slice(0, 12));
      
      // Setup outfit builder products
      setOutfitProducts(products.slice(0, 3));
      // Setup vibe swipe products
      setVibeProducts(products.slice(10, 20));
    } catch {
      try {
        const { products } = await fetchProducts({ limit: 20 });
        const list = products || [];
        setRecommended([...list].sort((a, b) => b.rating - a.rating).slice(0, 10));
        setTrending([...list].sort((a, b) => b.review_count - a.review_count).slice(0, 12));
      } catch {
        setRecommended([]);
        setTrending([]);
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, user?.email]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openChat = (initialMessage?: string) =>
    window.dispatchEvent(new CustomEvent("open-aurashop-chat", { detail: { initialMessage } }));
  
  const handleAISearch = () => {
    const q = searchQuery.trim() || "Looking for black shoes under ₹1,000 for office";
    openChat(q);
  };

  const handleAddToCart = async (productId: string) => {
    if (!user) {
      router.push("/login?from=" + encodeURIComponent("/"));
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

  // Spin the wheel game
  const handleSpinWheel = async () => {
    if (!sessionId) return;
    try {
      const result = await playCouponGame(sessionId);
      setSpinResult(result);
    } catch {
      setSpinResult({ played: true, won: false, message: "Try again later" });
    }
  };

  // Guess the price game
  const handleGuessGame = () => {
    const product = trending[Math.floor(Math.random() * trending.length)] || recommended[0];
    setGuessProduct(product);
    setGuessAnswer(null);
    setGuessGameOpen(true);
  };

  const handleGuessSubmit = (answer: "yes" | "no") => {
    if (!guessProduct) return;
    const isUnder999 = guessProduct.price < 999;
    const correct = (answer === "yes" && isUnder999) || (answer === "no" && !isUnder999);
    setGuessAnswer(answer);
    if (correct) {
      alert("🎉 Correct! You won 50 AuraPoints!");
    }
  };

  // Mystery box
  const handleMysteryBox = () => {
    const products = [...recommended, ...trending].filter((p) => p.price < 499);
    const product = products[Math.floor(Math.random() * products.length)] || recommended[0];
    setMysteryProduct(product);
    setMysteryBoxOpen(true);
  };

  // Build outfit
  const handleBuildOutfit = () => {
    setOutfitBuilderOpen(true);
  };

  const handleAddAllToCart = async () => {
    if (!user) {
      router.push("/login?from=" + encodeURIComponent("/"));
      return;
    }
    for (const p of outfitProducts) {
      await handleAddToCart(p.id);
    }
    setOutfitBuilderOpen(false);
  };

  // Vibe swipe
  const handleVibeSwipe = () => {
    setVibeIndex(0);
    setLikedProducts([]);
    setVibeSwipeOpen(true);
  };

  const handleVibeLike = () => {
    if (vibeProducts[vibeIndex]) {
      setLikedProducts([...likedProducts, vibeProducts[vibeIndex].id]);
    }
    if (vibeIndex < vibeProducts.length - 1) {
      setVibeIndex(vibeIndex + 1);
    } else {
      openChat(`I liked these products: ${likedProducts.join(", ")}. Show me similar items.`);
      setVibeSwipeOpen(false);
    }
  };

  const handleVibeSkip = () => {
    if (vibeIndex < vibeProducts.length - 1) {
      setVibeIndex(vibeIndex + 1);
    } else {
      if (likedProducts.length > 0) {
        openChat(`I liked these products: ${likedProducts.join(", ")}. Show me similar items.`);
      }
      setVibeSwipeOpen(false);
    }
  };

  const recBadges = recommended.map((_, i) => (i === 0 ? "best_match" : i === 1 ? "value" : i === 2 ? "trending" : null));
  const trendBadges = trending.map((_, i) => (i === 0 ? "trending" : i === 1 ? "hot_pick" : null));

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-cyan-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      {/* Hero – Find what you'll love */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-6 sm:pb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
              Find what you&apos;ll love.
            </h1>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-6">
              Personal shopping made smart by Aura AI ✨
            </p>
            <div className="flex flex-col gap-3 max-w-2xl">
              <div className="relative flex items-center rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <MessageCircle className="h-5 w-5 text-gray-400 dark:text-gray-500 ml-4 shrink-0" />
                <Input
                  type="text"
                  placeholder="Looking for black shoes under ₹1,000 for office"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAISearch()}
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-4 pl-3 pr-12 text-base placeholder:text-gray-400"
                />
                <motion.button
                  type="button"
                  onClick={handleAISearch}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="absolute right-2 h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center"
                  aria-label="Search with AI"
                >
                  <ChevronRight className="h-5 w-5" />
                </motion.button>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => openChat(searchQuery.trim() || undefined)}
                  className="rounded-2xl bg-primary hover:bg-primary/90 text-white font-semibold px-5 py-3 gap-2 shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  Ask Aura AI
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/products")}
                  className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-semibold px-5 py-3"
                >
                  Browse Manually
                </Button>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex shrink-0 h-20 w-20 rounded-2xl bg-gradient-to-br from-sky-100 to-cyan-100 dark:from-sky-900/40 dark:to-cyan-900/40 border border-sky-200/60 dark:border-sky-700/40 items-center justify-center shadow-inner">
            <Bot className="h-10 w-10 text-sky-600 dark:text-sky-400" />
          </div>
        </div>
      </motion.section>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10 pb-24">
        {/* Picked just for [Name] 👋 */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Picked just for {pickedForName} 👋
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Based on your taste, updated just now
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" className="rounded-full h-9 w-9">
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </Button>
                <Button size="icon" variant="outline" className="rounded-full h-9 w-9">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {recommended.slice(0, 5).map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex-shrink-0 w-[160px] sm:w-[180px]"
                >
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <Link href={`/products/${p.id}`} onClick={() => handleProductClick(p.id)}>
                      <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative">
                        <img
                          src={getProductImageSrc(p.image_url, p.category, p.id, p.name)}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = getProductImagePlaceholder(p.name); }}
                        />
                        {i < 3 && (
                          <Badge className={`absolute top-2 left-2 rounded-full text-xs ${i === 0 ? "bg-primary" : i === 1 ? "bg-primary" : "bg-amber-500"}`}>
                            {i === 0 ? "✨ Best Match" : i === 1 ? "💰 Deal" : "🔥 Hot"}
                          </Badge>
                        )}
                      </div>
                    </Link>
                    <div className="p-3">
                      <p className="font-semibold text-sm line-clamp-2 text-gray-900 dark:text-white">{p.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.category}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-semibold">{p.rating}</span>
                        <span className="text-xs text-gray-500">({p.review_count})</span>
                      </div>
                      <p className="font-bold text-primary text-base mt-2">{formatPrice(p.price)}</p>
                      <Button
                        size="sm"
                        className="w-full mt-2 rounded-full gap-1.5"
                        onClick={(e) => { e.preventDefault(); handleAddToCart(p.id); }}
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Play · Explore · Win section */}
        {!loading && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl border border-white/60 dark:border-white/10 bg-white/70 dark:bg-gray-900/60 backdrop-blur-2xl shadow-xl p-5 sm:p-6"
          >
            {/* Filter pills */}
            <div className="flex flex-wrap gap-2 mb-5">
              {["Types of recommendations", "What's your budget?", "Lastly, your age range?"].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => openChat(label)}
                  className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-primary transition-all"
                >
                  <span>{label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                </button>
              ))}
            </div>

            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <span className="text-xl">🌍</span>
              Play · Explore · Win
            </div>

            {/* Main spin wheel card */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-white shadow-md relative">
                  <div className="absolute inset-2 rounded-full border-4 border-white/30" />
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    ₹
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">What are you shopping for today?</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["👟 Footwear", "🧥 Fashion", "🏠 Home", "📱 Electronics"].map((c) => (
                      <span
                        key={c}
                        className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-primary/10 transition-colors"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <Button size="sm" className="rounded-full px-5 gap-2" onClick={handleSpinWheel}>
                Spin Now
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* 🎡 Spin the Wheel header */}
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-4">
              <span className="text-xl">🎡</span>
              Spin the Wheel
            </div>

            {/* Three game cards */}
            <div className="grid gap-4 sm:grid-cols-3 mb-6">
              {/* Spin & win rewards */}
              <div className="rounded-2xl bg-white/90 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Spin & win rewards 🎁</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Win up to ₹1,000 off</p>
                <div className="h-20 w-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(#fbbf24 0deg 90deg, #f59e0b 90deg 180deg, #fbbf24 180deg 270deg, #f59e0b 270deg 360deg)" }} />
                  <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                    <span className="text-lg font-bold text-amber-600">₹</span>
                  </div>
                </div>
                <Button size="sm" className="w-full rounded-full" onClick={handleSpinWheel}>
                  Spin Now
                </Button>
              </div>

              {/* Guess the price */}
              <div className="rounded-2xl bg-white/90 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Guess the price 💡</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Is this under ₹999?</p>
                {guessProduct && (
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={getProductImageSrc(guessProduct.image_url, guessProduct.category, guessProduct.id, guessProduct.name)}
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                    <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{guessProduct.name}</div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={handleGuessGame}>
                    Play
                  </Button>
                </div>
              </div>

              {/* Mystery Deal */}
              <div className="rounded-2xl bg-white/90 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Mystery Deal ✨</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Unlock a surprise product under ₹499</p>
                <div className="h-20 flex items-center justify-center mb-3">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-pink-200 to-rose-300 flex items-center justify-center relative shadow-lg">
                    <Gift className="h-8 w-8 text-white" />
                    <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-400 flex items-center justify-center text-xs">
                      ?
                    </div>
                  </div>
                </div>
                <Button size="sm" className="w-full rounded-full gap-2" onClick={handleMysteryBox}>
                  <Gift className="h-3.5 w-3.5" />
                  Open Box
                </Button>
              </div>
            </div>

            {/* Build My Outfit */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                  <Shirt className="h-5 w-5 text-primary" />
                  Build My Outfit <span className="text-xs text-gray-400 font-normal">(Trending)</span>
                </div>
                <Button size="sm" variant="outline" className="rounded-full" onClick={handleBuildOutfit}>
                  Customize
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {outfitProducts.map((p, i) => (
                  <div key={p.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
                    <img
                      src={getProductImageSrc(p.image_url, p.category, p.id, p.name)}
                      alt=""
                      className="h-20 w-full rounded-lg object-cover mb-2"
                    />
                    <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
                      Choose {i === 0 ? "a top" : i === 1 ? "a bottom" : "footwear"}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-semibold text-primary">{formatPrice(p.price)}</span>
                      <Button size="sm" variant="outline" className="h-7 px-3 rounded-full text-xs">
                        + Add
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-900/40 dark:to-cyan-900/30 p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Bot className="h-5 w-5 text-sky-600" />
                    <span>Your outfit is ready!</span>
                  </div>
                  <Button size="sm" className="rounded-full mt-3 w-full" onClick={handleAddAllToCart}>
                    Add all to cart – {formatPrice(outfitProducts.reduce((sum, p) => sum + p.price, 0))}
                  </Button>
                </div>
              </div>
            </div>

            {/* Live activity + Level shopper */}
            <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 p-4 space-y-3">
                <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  🔥 Live right now
                </div>
                <div className="rounded-xl bg-gray-100 dark:bg-gray-800 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  Simran from Mumbai ordered FashionDecor Sofa
                </div>
                <div className="rounded-xl bg-gray-100 dark:bg-gray-800 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  34 people viewing Ladela Bellies right now
                </div>
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Heart className="h-4 w-4 text-rose-500" />
                      Discover your vibe
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Like or skip to find your style</div>
                  </div>
                  <Button size="sm" className="rounded-full" onClick={handleVibeSwipe}>
                    See Outfit
                  </Button>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Level 3 Shopper ⭐
                  </div>
                  <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    320 Aura Coins
                  </div>
                </div>
                {recommended[0] && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
                    <img
                      src={getProductImageSrc(recommended[0].image_url, recommended[0].category, recommended[0].id, recommended[0].name)}
                      alt=""
                      className="h-24 w-full rounded-lg object-cover mb-2"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-primary">{formatPrice(recommended[0].price)}</span>
                      <div className="flex gap-2">
                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full">
                          ✕
                        </Button>
                        <Button size="icon" className="h-8 w-8 rounded-full bg-rose-500 hover:bg-rose-600">
                          ❤
                        </Button>
                        <Button size="icon" className="h-8 w-8 rounded-full bg-primary">
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {/* What's hot and trending */}
        {!loading && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-2xl">🔥</span>
                  What&apos;s hot and trending
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Selling fast, better hurry!
                </p>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {trending.slice(0, 6).map((p, i) => (
                <div key={p.id} className="flex-shrink-0 w-[160px] sm:w-[180px]">
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <Link href={`/products/${p.id}`} onClick={() => handleProductClick(p.id)}>
                      <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative">
                        <img
                          src={getProductImageSrc(p.image_url, p.category, p.id, p.name)}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = getProductImagePlaceholder(p.name); }}
                        />
                        {i < 3 && (
                          <Badge className={`absolute top-2 left-2 rounded-full text-xs ${i === 0 ? "bg-amber-500" : i === 1 ? "bg-amber-500" : "bg-rose-500"}`}>
                            {i === 0 ? "🔥 Hot Today" : i === 1 ? "🔥 Hot Today" : "🔥 Popular"}
                          </Badge>
                        )}
                      </div>
                    </Link>
                    <div className="p-3">
                      <p className="font-semibold text-sm line-clamp-2 text-gray-900 dark:text-white">{p.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.category}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-semibold">{p.rating}</span>
                        <span className="text-xs text-gray-500">({p.review_count})</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="font-bold text-primary text-base">{formatPrice(p.price)}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full px-3 h-7 text-xs gap-1"
                          onClick={(e) => { e.preventDefault(); router.push(`/products/${p.id}`); }}
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Play & Win banner */}
        <motion.button
          type="button"
          onClick={handleSpinWheel}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex items-center justify-between gap-4 rounded-2xl border-2 border-amber-300/80 dark:border-amber-600/60 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/80 dark:to-orange-900/60 px-5 py-4 shadow-lg hover:shadow-xl transition-all text-left"
        >
          <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Gift className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            🎁 Play & Win up to ₹2,000 off – Try your luck 🎉
          </span>
          <ChevronRight className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
        </motion.button>

        {/* Anutiful for you + Search now banner */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-cyan-500/5 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center shadow-md">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                ✨ Anutiful for you
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">5cleve to start talkin&apos;</p>
            </div>
          </div>
          <Button className="rounded-full gap-2" onClick={() => openChat()}>
            <MessageCircle className="h-4 w-4" />
            Search now
          </Button>
        </div>
      </div>

      {/* Guess the Price Game Modal */}
      <Dialog open={guessGameOpen} onOpenChange={setGuessGameOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Guess the Price 💡</DialogTitle>
          {guessProduct && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                <img
                  src={getProductImageSrc(guessProduct.image_url, guessProduct.category, guessProduct.id, guessProduct.name)}
                  alt=""
                  className="h-32 w-full rounded-lg object-cover mb-3"
                />
                <p className="font-semibold text-gray-900 dark:text-white">{guessProduct.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{guessProduct.category}</p>
              </div>
              <p className="text-center font-medium text-gray-900 dark:text-white">
                Is this product under ₹999?
              </p>
              {guessAnswer === null ? (
                <div className="flex gap-3">
                  <Button className="flex-1 rounded-full" onClick={() => handleGuessSubmit("yes")}>
                    Yes
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-full" onClick={() => handleGuessSubmit("no")}>
                    No
                  </Button>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-lg font-bold">
                    {((guessAnswer === "yes" && guessProduct.price < 999) || (guessAnswer === "no" && guessProduct.price >= 999))
                      ? "🎉 Correct! +50 AuraPoints"
                      : "❌ Wrong! Actual: " + formatPrice(guessProduct.price)}
                  </p>
                  <Button className="rounded-full" onClick={handleGuessGame}>
                    Play Again
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mystery Box Modal */}
      <Dialog open={mysteryBoxOpen} onOpenChange={setMysteryBoxOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Mystery Deal ✨</DialogTitle>
          {mysteryProduct && (
            <div className="space-y-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20"
              >
                <img
                  src={getProductImageSrc(mysteryProduct.image_url, mysteryProduct.category, mysteryProduct.id, mysteryProduct.name)}
                  alt=""
                  className="h-40 w-full rounded-lg object-cover mb-3"
                />
                <p className="font-bold text-lg text-gray-900 dark:text-white">{mysteryProduct.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{mysteryProduct.category}</p>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-2xl font-bold text-primary">{formatPrice(mysteryProduct.price)}</p>
                  <Badge className="bg-rose-500">Under ₹499!</Badge>
                </div>
              </motion.div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-full" onClick={handleMysteryBox}>
                  Try Again
                </Button>
                <Link href={`/products/${mysteryProduct.id}`} className="flex-1">
                  <Button className="w-full rounded-full">View Product</Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Vibe Swipe Modal */}
      <Dialog open={vibeSwipeOpen} onOpenChange={setVibeSwipeOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Discover Your Vibe 💫</DialogTitle>
          {vibeProducts[vibeIndex] && (
            <div className="space-y-4">
              <motion.div
                key={vibeIndex}
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <img
                  src={getProductImageSrc(
                    vibeProducts[vibeIndex].image_url,
                    vibeProducts[vibeIndex].category,
                    vibeProducts[vibeIndex].id,
                    vibeProducts[vibeIndex].name
                  )}
                  alt=""
                  className="h-64 w-full object-cover"
                />
                <div className="p-4 bg-white dark:bg-gray-900">
                  <p className="font-bold text-lg text-gray-900 dark:text-white">{vibeProducts[vibeIndex].name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{vibeProducts[vibeIndex].category}</p>
                  <p className="text-xl font-bold text-primary mt-2">{formatPrice(vibeProducts[vibeIndex].price)}</p>
                </div>
              </motion.div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-full gap-2" onClick={handleVibeSkip}>
                  Skip
                </Button>
                <Button className="flex-1 rounded-full gap-2 bg-rose-500 hover:bg-rose-600" onClick={handleVibeLike}>
                  <Heart className="h-4 w-4" />
                  Like
                </Button>
              </div>
              <p className="text-center text-xs text-gray-500">
                {vibeIndex + 1} / {vibeProducts.length}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Spin Result Modal */}
      {spinResult && (
        <Dialog open={!!spinResult} onOpenChange={() => setSpinResult(null)}>
          <DialogContent className="max-w-md">
            <DialogTitle className="sr-only">Spin Result</DialogTitle>
            <div className="text-center space-y-4">
              <div className="text-6xl">{spinResult.won ? "🎉" : "😔"}</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {spinResult.won ? "You Won!" : "Better Luck Next Time"}
              </h3>
              {spinResult.won && spinResult.code && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your coupon code:</p>
                  <p className="text-2xl font-mono font-bold text-emerald-700 dark:text-emerald-400">{spinResult.code}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {formatPrice(spinResult.discount)} off on orders above {formatPrice(spinResult.min_order)}
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400">{spinResult.message}</p>
              <Button className="w-full rounded-full" onClick={() => setSpinResult(null)}>
                Continue Shopping
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Cart abandonment pop-up */}
      <Dialog open={cartPopUpOpen && !cartPopUpDismissed} onOpenChange={handleCartPopUpClose}>
        <DialogContent className="max-w-md">
          <DialogTitle className="sr-only">Cart reminder</DialogTitle>
          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/40 p-4 pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                  <ShoppingCart className="h-6 w-6 text-amber-700 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-100">
                    You have {cartCount} item{cartCount !== 1 ? "s" : ""} in your cart
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Don&apos;t lose your cart — complete your order
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/cart" onClick={() => handleCartPopUpClose(false)}>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl">
                    View cart
                  </Button>
                </Link>
                <Link href="/checkout" onClick={() => handleCartPopUpClose(false)}>
                  <Button size="sm" variant="outline" className="border-amber-600 text-amber-700 dark:text-amber-300 rounded-xl">
                    Checkout
                    <ChevronRight className="h-4 w-4 ml-0.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
