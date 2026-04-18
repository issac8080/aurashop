"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCart, useAuth } from "@/app/providers";
import { useCartToast } from "@/components/CartToastProvider";
import { useStoreMode } from "@/context/store-mode-context";
import { fetchProducts, fetchRecommendations, playCouponGame, playJackpot, trackEvent, type Product, type CouponGameResult } from "@/lib/api";
import { getProductImagePlaceholder } from "@/lib/unsplash";
import { getProductImage } from "@/lib/product-image";
import { formatPrice } from "@/lib/utils";
import { AuraHomeView } from "@/components/home/AuraHomeView";

const PICK_REASONS: { label: string; why: string }[] = [
  { label: "Based on your last purchase", why: "We boost items in categories that match your recent orders when we have signals." },
  { label: "Because you viewed similar items", why: "We rank categories you browse higher when we can infer interest." },
  { label: "Matches your style", why: "Blended from ratings, popularity, and what similar shoppers picked." },
  { label: "Trending in your price range", why: "High engagement items near the prices you usually explore." },
  { label: "Fresh picks", why: "New or highly rated items we think you will want to see first." },
];

const PERSONALIZE_PROMPTS: { label: string; message: string }[] = [
  {
    label: "Types of recommendations",
    message:
      "I want to personalize my shopping feed. Briefly explain what kinds of recommendations you can give (e.g. trending, similar items, budget picks, category affinity). Then ask me one follow-up question so you can tune recommendations like Amazon’s “because you viewed…”.",
  },
  {
    label: "What's your budget?",
    message:
      "Help me set a comfortable shopping budget. Ask what I usually spend per order on this store, then suggest 3–4 product ideas that fit that budget on AuraShop.",
  },
  {
    label: "Style & preferences",
    message:
      "I'd like style-matched suggestions. Ask for my preferred style (casual, formal, etc.) and use that to refine product recommendations.",
  },
];

function filterGroceryProducts(list: Product[]) {
  return list.filter(
    (p) =>
      (p.category_slug || "").toLowerCase() === "groceries" || /grocery|food|fresh|organic/i.test(p.category + (p.name || ""))
  );
}

function HomePageContent() {
  const { sessionId, refreshCart, cartCount } = useCart();
  const { user } = useAuth();
  const { isGroceries: groceryMode } = useStoreMode();
  const { showAddedToCart, showAddToCartError } = useCartToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameParamHandled = useRef(false);
  
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [trending, setTrending] = useState<Product[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [whyPickOpen, setWhyPickOpen] = useState<number | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);

  const [spinResult, setSpinResult] = useState<CouponGameResult | null>(null);
  const [jackpotResult, setJackpotResult] = useState<CouponGameResult | null>(null);
  const [gamesHubOpen, setGamesHubOpen] = useState(false);
  const [guessGameOpen, setGuessGameOpen] = useState(false);
  const [guessProduct, setGuessProduct] = useState<Product | null>(null);
  const [guessAnswer, setGuessAnswer] = useState<"yes" | "no" | null>(null);
  
  const [cartPopUpOpen, setCartPopUpOpen] = useState(false);
  const [cartPopUpDismissed, setCartPopUpDismissed] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const recP = sessionId
        ? fetchRecommendations(sessionId, {
            limit: 12,
            user_id: user?.email,
            category: groceryMode ? "groceries" : undefined,
          })
        : Promise.resolve({ recommendations: [] });
      const prodP = fetchProducts(
        groceryMode
          ? { store: "groceries" as const, limit: 100 }
          : { limit: 80 }
      );
      const [recRes, productsRes] = await Promise.all([recP, prodP]);
      const products = productsRes.products ?? [];
      let recProducts: Product[] = (recRes.recommendations || [])
        .map((r) => (r.product ? { ...r.product, id: r.product_id } as Product : null))
        .filter(Boolean) as Product[];

      if (groceryMode) {
        if (!recProducts.length) {
          const fallback = filterGroceryProducts([...products].sort((a, b) => b.rating - a.rating));
          recProducts = fallback.length > 0 ? fallback : products.slice(0, 8);
        }
      } else {
        if (recProducts.length === 0) recProducts = products.slice(0, 10);
      }

      setCatalog(products);
      setRecommended(
        (recProducts.length > 0 ? recProducts : groceryMode ? filterGroceryProducts(products).slice(0, 10) : products.slice(0, 10)) as Product[]
      );
      setTrending(
        [...products]
          .sort((a, b) => b.review_count - a.review_count)
          .slice(0, 12) as Product[]
      );
    } catch {
      try {
        const { products } = await fetchProducts({ limit: 40 });
        setCatalog(products);
        setRecommended(
          (groceryMode
            ? filterGroceryProducts(products).slice(0, 10)
            : products.slice(0, 10).sort((a, b) => b.rating - a.rating)) as Product[]
        );
        setTrending([...products].sort((a, b) => b.review_count - a.review_count).slice(0, 12) as Product[]);
      } catch {
        setCatalog([]);
        setRecommended([]);
        setTrending([]);
      }
    } finally {
      setLoading(false);
    }
  }, [groceryMode, sessionId, user?.email]);

  useEffect(() => {
    setLoading(true);
    void loadAll();
  }, [loadAll]);

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
    if (cartCount != null && cartCount > 0) setCartPopUpOpen(true);
  }, [cartCount]);

  useEffect(() => {
    if (catalog.length < 2) return;
    const n = Math.min(3, Math.max(1, catalog.length));
    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % n);
    }, 6500);
    return () => clearInterval(t);
  }, [catalog.length]);

  const openChat = (initialMessage?: string) =>
    window.dispatchEvent(new CustomEvent("open-aurashop-chat", { detail: { initialMessage } }));

  const handleAddToCart = async (productId: string) => {
    if (!user) {
      router.push("/login?from=" + encodeURIComponent("/"));
      return;
    }
    try {
      await trackEvent({ event_type: "cart_add", session_id: sessionId, product_id: productId });
      await refreshCart();
      const pool = [...recommended, ...trending];
      const name = pool.find((p) => p.id === productId)?.name;
      showAddedToCart(name);
    } catch {
      showAddToCartError();
    }
  };

  const handleProductClick = (productId: string) => {
    trackEvent({ event_type: "product_click", session_id: sessionId, product_id: productId });
  };

  const handleSpinWheel = async () => {
    if (!sessionId) {
      router.push("/login?from=" + encodeURIComponent("/"));
      return;
    }
    setGamesHubOpen(false);
    try {
      setSpinResult(await playCouponGame(sessionId));
    } catch {
      setSpinResult({ played: true, won: false, code: null, min_order: 0, discount: 0, message: "Try again later" });
    }
  };

  const handleJackpot = async () => {
    if (!sessionId) {
      router.push("/login?from=" + encodeURIComponent("/"));
      return;
    }
    setGamesHubOpen(false);
    try {
      setJackpotResult(await playJackpot(sessionId));
    } catch {
      setJackpotResult({ played: true, won: false, code: null, min_order: 0, discount: 0, message: "Try again later" });
    }
  };

  const handleGuessGame = () => {
    const pool = trending.length ? trending : recommended;
    const product = pool[Math.floor(Math.random() * pool.length)] || recommended[0];
    setGamesHubOpen(false);
    setGuessProduct(product || null);
    setGuessAnswer(null);
    setGuessGameOpen(!!product);
  };

  const handleGuessSubmit = (answer: "yes" | "no") => {
    if (!guessProduct) return;
    const isUnder999 = guessProduct.price < 999;
    setGuessAnswer(answer);
    if ((answer === "yes" && isUnder999) || (answer === "no" && !isUnder999)) {
      alert("Correct! +50 AuraPoints (demo).");
    }
  };

  useEffect(() => {
    const g = searchParams.get("game");
    if (!g) {
      gameParamHandled.current = false;
      return;
    }
    if (g !== "spin" && g !== "jackpot" && g !== "guess") {
      router.replace("/", { scroll: false });
      return;
    }
    if (gameParamHandled.current) return;
    if (loading) return;
    if (!sessionId) {
      gameParamHandled.current = true;
      router.push("/login?from=" + encodeURIComponent("/?game=" + g));
      return;
    }
    if (g === "guess" && !recommended.length && !trending.length) {
      gameParamHandled.current = true;
      setGamesHubOpen(true);
      router.replace("/", { scroll: false });
      return;
    }
    gameParamHandled.current = true;
    if (g === "spin") void handleSpinWheel();
    else if (g === "jackpot") void handleJackpot();
    else if (g === "guess") handleGuessGame();
    router.replace("/", { scroll: false });
  }, [searchParams, loading, sessionId, router, recommended, trending]);

  const handleCartPopUpClose = (open: boolean) => {
    if (!open) {
      setCartPopUpOpen(false);
      setCartPopUpDismissed(true);
      if (typeof window !== "undefined") sessionStorage.setItem("aurashop_cart_popup_dismissed", "1");
    }
  };

  return (
    <>
      <AuraHomeView
        user={user}
        loading={loading}
        recommended={recommended}
        catalog={catalog}
        onTrackProductClick={handleProductClick}
        onAddToCart={handleAddToCart}
        onPlayGames={() => setGamesHubOpen(true)}
        whyPickOpen={whyPickOpen}
        onWhyPick={setWhyPickOpen}
        pickReasons={PICK_REASONS}
        heroIndex={heroIndex}
        onHeroIndex={setHeroIndex}
        onPersonalizePrompt={(m) => openChat(m)}
        personalizePrompts={PERSONALIZE_PROMPTS}
      />

      <Dialog open={gamesHubOpen} onOpenChange={setGamesHubOpen}>
        <DialogContent className="max-w-md text-left">
          <DialogTitle>Play &amp; win</DialogTitle>
          <p className="text-sm text-muted-foreground">Try Spin, Guess the price, or Jackpot (session limits may apply).</p>
          <div className="grid gap-2 pt-2">
            <Button className="w-full justify-between rounded-xl font-bold" onClick={handleSpinWheel}>
              Spin the wheel
              <ChevronRight className="h-4 w-4" />
                  </Button>
            <Button variant="outline" className="w-full justify-between rounded-xl font-bold" onClick={handleGuessGame}>
              Guess the price
                  <ChevronRight className="h-4 w-4" />
                </Button>
            <Button variant="outline" className="w-full justify-between rounded-xl font-bold" onClick={handleJackpot}>
              Jackpot
                <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={guessGameOpen} onOpenChange={setGuessGameOpen}>
        <DialogContent className="max-w-md text-left">
          <DialogTitle>Guess the price</DialogTitle>
          {guessProduct && (
            <div className="space-y-3">
              <div className="rounded-xl border p-3">
                <div className="h-32 w-full overflow-hidden rounded-lg bg-muted">
                  <img
                    src={getProductImage(guessProduct)}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = getProductImagePlaceholder(guessProduct.name);
                    }}
                  />
                </div>
                <p className="mt-2 font-bold">{guessProduct.name}</p>
              </div>
              <p className="text-center font-bold">Is this under ₹999?</p>
              {guessAnswer === null ? (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => handleGuessSubmit("yes")}>
                    Yes
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => handleGuessSubmit("no")}>
                    No
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-center">
                  Actual price: {formatPrice(guessProduct.price)}
                  <br />
                  <Button className="mt-2 w-full" onClick={handleGuessGame}>
                    Play again
                  </Button>
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {spinResult && (
        <Dialog
          open={!!spinResult}
          onOpenChange={() => {
            setSpinResult(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogTitle className="sr-only">Spin</DialogTitle>
            <div className="text-center space-y-3">
              <div className="text-5xl">{spinResult?.won ? "🎉" : "🎡"}</div>
              <h3 className="text-xl font-bold">Spin result</h3>
              {spinResult?.won && spinResult.code && <p className="font-mono font-extrabold">{spinResult.code}</p>}
              <p className="text-sm text-muted-foreground">{spinResult?.message}</p>
              <Button className="w-full rounded-full" onClick={() => setSpinResult(null)}>
                OK
                </Button>
              </div>
        </DialogContent>
      </Dialog>
      )}

      {jackpotResult && (
        <Dialog
          open={!!jackpotResult}
          onOpenChange={() => {
            setJackpotResult(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogTitle className="sr-only">Jackpot</DialogTitle>
            <div className="text-center space-y-3">
              <div className="text-5xl">🎰</div>
              <h3 className="text-xl font-bold">Jackpot</h3>
              {jackpotResult?.won && jackpotResult.code && <p className="font-mono font-extrabold">{jackpotResult.code}</p>}
              <p className="text-sm text-muted-foreground">{jackpotResult?.message}</p>
              <Button className="w-full rounded-full" onClick={() => setJackpotResult(null)}>
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={cartPopUpOpen && !cartPopUpDismissed} onOpenChange={handleCartPopUpClose}>
        <DialogContent className="max-w-md text-left">
          <DialogTitle className="sr-only">Cart</DialogTitle>
          <p className="font-bold">You have {cartCount} item(s) in your cart</p>
              <div className="flex gap-2">
            <Button asChild>
              <a href="/cart">View cart</a>
                  </Button>
            <Button variant="outline" asChild>
              <a href="/checkout">Checkout</a>
                  </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground text-sm" aria-hidden>
          Loading store…
    </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
