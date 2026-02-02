"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Trash2,
  ArrowLeft,
  ShoppingCart,
  Bot,
  Ticket,
  Percent,
  Sparkles,
  ChevronRight,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCart, useAuth } from "@/app/providers";
import {
  getCart,
  trackEvent,
  playCouponGame,
  playScratch,
  validateCoupon,
  fetchDiscounts,
  type DiscountCoupon,
} from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { getProductImageSrc, getProductImagePlaceholder } from "@/lib/unsplash";
import { HomeSpinWheel } from "@/components/HomeSpinWheel";
import { HomeScratch } from "@/components/HomeScratch";
import type { Product } from "@/lib/api";

const AURA_CART_COUPON_KEY = "aura_cart_coupon";

type AppliedCoupon = { code: string; discount: number; title: string };

function persistCouponForCheckout(coupon: AppliedCoupon) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(AURA_CART_COUPON_KEY, JSON.stringify(coupon));
  } catch {}
}

export default function CartPage() {
  const { sessionId, refreshCart } = useCart();
  const { user } = useAuth();
  const [cart, setCart] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Applied coupon (shown in order summary, passed to checkout)
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  // Apply Coupon modal – show valid coupons and apply here
  const [applyCouponOpen, setApplyCouponOpen] = useState(false);
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Discount games (Spin to Win, Lucky Scratch)
  const [gameModal, setGameModal] = useState<"spin" | "scratch" | null>(null);
  const [gameLoading, setGameLoading] = useState<"spin" | "scratch" | null>(null);
  const [gameResult, setGameResult] = useState<{
    won: boolean;
    code: string | null;
    discount: number;
    message: string;
    min_order: number;
  } | null>(null);

  const userId = user?.email ?? null;
  const firstName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

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
        const cartRes = await getCart(sessionId);
        setCart(cartRes.cart);
      } catch {
        setCart([]);
      } finally {
        setLoading(false);
      }
    }
    if (sessionId) load();
  }, [sessionId]);

  const total = cart.reduce((sum, p) => sum + p.price, 0);
  const couponDiscount = appliedCoupon?.discount ?? 0;
  const totalAfterCoupon = Math.max(0, total - couponDiscount);

  // Load coupons when Apply Coupon modal opens
  useEffect(() => {
    if (!applyCouponOpen) return;
    let cancelled = false;
    fetchDiscounts(userId).then(({ coupons: list }) => {
      if (!cancelled) setCoupons(list);
    });
    return () => { cancelled = true; };
  }, [applyCouponOpen, userId]);

  const handleApplyCouponByCode = async (code: string) => {
    const raw = (code || couponCodeInput).trim().toUpperCase();
    if (!raw) {
      setCouponError("Enter a coupon code");
      return;
    }
    setCouponError(null);
    setCouponLoading(true);
    try {
      const result = await validateCoupon(raw, total, userId);
      if (result.valid && result.discount > 0) {
        const applied: AppliedCoupon = {
          code: raw,
          discount: result.discount,
          title: result.title || raw,
        };
        setAppliedCoupon(applied);
        persistCouponForCheckout(applied);
        setCouponCodeInput("");
        setApplyCouponOpen(false);
      } else {
        setCouponError(result.reason || "Invalid or expired coupon. Check min order.");
      }
    } catch {
      setCouponError("Could not validate coupon. Try again.");
    } finally {
      setCouponLoading(false);
    }
  };

  const applyWonCodeToCart = (code: string, discount: number, title: string) => {
    const applied: AppliedCoupon = { code, discount, title };
    setAppliedCoupon(applied);
    persistCouponForCheckout(applied);
  };

  const handleRemove = async (productId: string) => {
    const previousCart = [...cart];
    setCart((prev) => prev.filter((p) => p.id !== productId));
    try {
      await trackEvent({
        event_type: "cart_remove",
        session_id: sessionId,
        product_id: productId,
      });
      await refreshCart();
      const { cart: updated } = await getCart(sessionId);
      setCart(updated);
    } catch {
      try {
        const { cart: updated } = await getCart(sessionId);
        setCart(updated);
      } catch {
        setCart(previousCart);
      }
    }
  };

  const playSpin = async () => {
    if (!sessionId || gameLoading) return;
    setGameLoading("spin");
    setGameResult(null);
    setGameModal(null);
    try {
      const result = await playCouponGame(sessionId);
      setGameResult({
        won: result.won,
        code: result.code,
        discount: result.discount,
        message: result.message,
        min_order: result.min_order,
      });
      setGameModal("spin");
    } catch {
      setGameResult({
        won: false,
        code: null,
        discount: 1000,
        message: "Something went wrong. Try again.",
        min_order: 50000,
      });
      setGameModal("spin");
    } finally {
      setGameLoading(null);
    }
  };

  const playScratchGame = async () => {
    if (!sessionId || gameLoading) return;
    setGameLoading("scratch");
    setGameResult(null);
    setGameModal(null);
    try {
      const result = await playScratch(sessionId);
      setGameResult({
        won: result.won,
        code: result.code,
        discount: result.discount,
        message: result.message,
        min_order: result.min_order,
      });
      setGameModal("scratch");
    } catch {
      setGameResult({
        won: false,
        code: null,
        discount: 500,
        message: "Something went wrong. Try again.",
        min_order: 50000,
      });
      setGameModal("scratch");
    } finally {
      setGameLoading(null);
    }
  };

  const handleGameModalClose = (won: boolean, code: string | null, discount: number, minOrder: number) => {
    setGameModal(null);
    setGameResult(null);
    if (won && code && total >= minOrder) {
      validateCoupon(code, total, userId).then((res) => {
        if (res.valid && res.discount > 0) {
          applyWonCodeToCart(code, res.discount, res.title || code);
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="py-6 sm:py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-9 w-40 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          <div className="h-10 w-36 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
            ))}
          </div>
          <div className="h-48 rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 sm:py-8 lg:py-10 space-y-8 sm:space-y-10">
      {/* Page header with floating AI assistant */}
      <div className="relative">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Your Cart
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Review your item before you check out, {firstName}!
            </p>
          </div>
        </div>
        {/* Floating AI assistant - light blue robot */}
        <div className="absolute top-0 right-0 hidden lg:block pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-sky-200 to-cyan-300 dark:from-sky-600 dark:to-cyan-500 flex items-center justify-center shadow-lg border border-white/50"
          >
            <Bot className="h-10 w-10 sm:h-12 sm:w-12 text-sky-700 dark:text-white" />
          </motion.div>
        </div>
      </div>

      {cart.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm shadow-xl"
        >
          <div className="relative p-10 sm:p-14 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg mb-6">
              <ShoppingBag className="h-10 w-10" />
            </div>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Your cart is empty
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto mb-8">
              Add items from the store and they&apos;ll show up here.
            </p>
            <Link href="/products">
              <Button
                size="lg"
                className="rounded-xl font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 hover:opacity-90 shadow-lg text-white border-0"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Browse products
              </Button>
            </Link>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Two-panel layout: Your cart | Order summary */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Left panel – Your cart */}
            <div className="md:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm shadow-lg overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Your cart
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {cart.length} item{cart.length !== 1 ? "s" : ""} in your cart.
                </span>
                <Link href="/products" className="ml-auto sm:ml-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl font-semibold border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Continue shopping
                  </Button>
                </Link>
              </div>
              <div className="p-4 sm:p-5 space-y-4">
                {cart.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group relative flex gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-4 shadow-sm hover:shadow-md transition-all"
                  >
                    {/* Quantity badge – green border, top left */}
                    <div className="absolute top-3 left-3 z-10 rounded-md border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      1 item
                    </div>
                    <Link
                      href={`/products/${item.id}`}
                      className="flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 w-20 h-20 sm:w-24 sm:h-24 block"
                    >
                      <img
                        src={getProductImageSrc(item.image_url, item.category, item.id, item.name)}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = getProductImagePlaceholder(item.name);
                        }}
                      />
                    </Link>
                    <div className="flex-1 min-w-0 pt-6 sm:pt-0">
                      <Link
                        href={`/products/${item.id}`}
                        className="font-semibold text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 line-clamp-2 transition-colors"
                      >
                        {item.name}
                      </Link>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{item.category}</p>
                      <p className="font-bold text-teal-600 dark:text-teal-400 text-lg mt-2">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-xl shrink-0 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => handleRemove(item.id)}
                      aria-label="Remove from cart"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right panel – Order summary */}
            <div className="md:col-span-1">
              <div className="sticky top-24">
                <Card className="rounded-2xl border-2 border-teal-200 dark:border-teal-900/50 bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl overflow-hidden">
                  <CardContent className="p-5 sm:p-6">
                    <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white mb-4">
                      Order summary.
                    </h2>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <span>Subtotal ({cart.length} items)</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 mb-1">
                        <span>Discount ({appliedCoupon.code})</span>
                        <span>-{formatPrice(appliedCoupon.discount)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 dark:border-gray-700 my-4 pt-4">
                      <div className="flex justify-between items-baseline">
                        <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                        <span className="font-heading text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {formatPrice(totalAfterCoupon)}
                        </span>
                      </div>
                    </div>
                    <Link href="/checkout" className="block mt-5">
                      <Button
                        className="w-full rounded-xl font-semibold h-12 bg-gradient-to-r from-teal-500 to-emerald-600 hover:opacity-90 shadow-lg text-white border-0"
                        size="lg"
                      >
                        Proceed to checkout
                      </Button>
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                      Secure checkout Enjoy fast & safe
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Coupon & discount section */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-3xl border border-amber-200/60 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/80 to-yellow-50/60 dark:from-amber-950/30 dark:to-yellow-950/20 p-6 sm:p-8 shadow-lg"
          >
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              Feeling lucky? You might have coupons waiting!
            </h2>
            {/* Got $ banner with coins and coupon icon */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 border border-amber-200 dark:border-amber-700/50 px-6 py-3 shadow-md">
                <Coins className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                <span className="font-heading text-2xl font-bold text-amber-800 dark:text-amber-200">
                  Got $
                </span>
                <Ticket className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {/* Apply Coupon card – opens modal, no redirect */}
              <Card className="rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-white/90 dark:bg-gray-900/70 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                <CardContent className="p-5 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center mb-3">
                    <Percent className="h-7 w-7 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h3 className="font-heading font-bold text-gray-900 dark:text-white mb-1">Apply Coupon.</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Apply existing coupon codes at checkout!
                  </p>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl font-semibold"
                    size="sm"
                    onClick={() => setApplyCouponOpen(true)}
                  >
                    Apply Coupon <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
              {/* Spin to Win card */}
              <Card className="rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-white/90 dark:bg-gray-900/70 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                <CardContent className="p-5 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-3">
                    <Sparkles className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="font-heading font-bold text-gray-900 dark:text-white mb-1">Spin to Win.</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Spin the wheel & get discount coupons!
                  </p>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl font-semibold"
                    size="sm"
                    onClick={playSpin}
                    disabled={!!gameLoading}
                  >
                    {gameLoading === "spin" ? "Spinning..." : "Spin to Win"}{" "}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
              {/* Lucky Scratch card – opens scratch game, apply won code on cart */}
              <Card className="rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-white/90 dark:bg-gray-900/70 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                <CardContent className="p-5 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center mb-3">
                    <Ticket className="h-7 w-7 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="font-heading font-bold text-gray-900 dark:text-white mb-1">Lucky Scratch.</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Reveal hidden coupons by scratching!
                  </p>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl font-semibold"
                    size="sm"
                    onClick={playScratchGame}
                    disabled={!!gameLoading}
                  >
                    {gameLoading === "scratch" ? "Revealing..." : "Explore Discounts"}{" "}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </div>
            <div className="text-center">
              <Link href="/discounts">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-xl font-semibold border-2 border-amber-300 dark:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                >
                  Explore Discounts
                </Button>
              </Link>
            </div>
          </motion.section>

          {/* Bottom: Continue shopping + floating AI */}
          <div className="relative flex justify-center">
            <Link href="/products">
              <Button
                variant="outline"
                size="lg"
                className="rounded-xl font-semibold border-gray-300 dark:border-gray-600"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continue shopping
              </Button>
            </Link>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden lg:block pointer-events-none">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-16 h-16 rounded-xl bg-gradient-to-br from-sky-200 to-cyan-300 dark:from-sky-600 dark:to-cyan-500 flex items-center justify-center shadow-lg border border-white/50"
              >
                <Bot className="h-8 w-8 text-sky-700 dark:text-white" />
              </motion.div>
            </div>
          </div>
        </>
      )}

      {/* Apply Coupon modal – list valid coupons + enter code */}
      <Dialog open={applyCouponOpen} onOpenChange={(open) => { setApplyCouponOpen(open); setCouponError(null); setCouponCodeInput(""); }}>
        <DialogContent className="max-w-md">
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-teal-500" />
            Apply Coupon
          </DialogTitle>
          <DialogDescription>
            Choose a coupon or enter a code. Valid for your cart total.
          </DialogDescription>
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Valid for this cart (min. order):</p>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {coupons
                .filter((c) => c.min_order <= total)
                .slice(0, 10)
                .map((c) => (
                  <div
                    key={c.code}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{c.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Min. order ₹{c.min_order.toLocaleString()} · {c.code}</p>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white shrink-0"
                      onClick={() => handleApplyCouponByCode(c.code)}
                      disabled={couponLoading}
                    >
                      Apply
                    </Button>
                  </div>
                ))}
              {coupons.filter((c) => c.min_order <= total).length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No coupons valid for this cart total. Try a higher cart value or enter a code below.</p>
              )}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Or enter code:</p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. WELCOME10"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                  className="rounded-xl font-mono"
                />
                <Button
                  className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white shrink-0"
                  onClick={() => handleApplyCouponByCode("")}
                  disabled={couponLoading}
                >
                  {couponLoading ? "Checking..." : "Apply"}
                </Button>
              </div>
              {couponError && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">{couponError}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Spin to Win modal – on close apply won code to cart if valid */}
      <AnimatePresence>
        {gameModal === "spin" && gameResult && (
          <HomeSpinWheel
            won={gameResult.won}
            discount={gameResult.discount}
            code={gameResult.code}
            message={gameResult.message}
            minOrder={gameResult.min_order}
            onClose={() => handleGameModalClose(gameResult!.won, gameResult!.code, gameResult!.discount, gameResult!.min_order)}
          />
        )}
        {gameModal === "scratch" && gameResult && (
          <HomeScratch
            won={gameResult.won}
            discount={gameResult.discount}
            code={gameResult.code}
            message={gameResult.message}
            minOrder={gameResult.min_order}
            onClose={() => handleGameModalClose(gameResult!.won, gameResult!.code, gameResult!.discount, gameResult!.min_order)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
