"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShoppingBag, Home, Store, Check, ArrowLeft, Sparkles, Clock, Wallet, AlertTriangle, Package, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCart, useAuth } from "@/app/providers";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

const API = "/api";
const AURA_CART_COUPON_KEY = "aura_cart_coupon";

type Store = {
  id: string;
  name: string;
  address: string;
  out_of_maintenance?: boolean;
};

type AppliedCoupon = { code: string; discount: number; title: string };

export default function CheckoutPage() {
  const router = useRouter();
  const { sessionId } = useCart();
  const { user } = useAuth();
  const [cart, setCart] = useState<any[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<"home_delivery" | "store_pickup">("home_delivery");
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [cashbackPreview, setCashbackPreview] = useState<{ amount: number; rate: string } | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useAuraPoints, setUseAuraPoints] = useState(0);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const total = cart.reduce((sum, p) => sum + p.price, 0);
  const couponDiscount = appliedCoupon?.discount ?? 0;
  const totalAfterCoupon = Math.max(0, total - couponDiscount);
  const maxApplicable = Math.min(walletBalance, totalAfterCoupon);
  const amountAfterPoints = Math.max(0, totalAfterCoupon - useAuraPoints);
  const userIdForCoupon = user?.email ?? sessionId ?? "";

  useEffect(() => {
    async function loadCart() {
      try {
        const res = await fetch(`${API}/session/${sessionId}/cart`);
        const data = await res.json().catch(() => ({}));
        setCart(Array.isArray(data?.cart) ? data.cart : []);
      } catch {
        setCart([]);
      }
    }
    async function loadStores() {
      try {
        const res = await fetch(`${API}/stores`);
        const data = await res.json().catch(() => ({}));
        const storeList = Array.isArray(data?.stores) ? data.stores : [];
        setStores(storeList);
        const firstAvailable = storeList.find((s: Store) => !s.out_of_maintenance);
        if (firstAvailable) setSelectedStore(firstAvailable.id);
        else if (storeList.length) setSelectedStore(storeList[0].id);
      } catch {
        setStores([]);
      }
    }
    async function loadWallet() {
      try {
        const res = await fetch(`${API}/users/${sessionId}/wallet`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const balance = data?.summary?.balance ?? data?.wallet?.balance ?? 0;
          setWalletBalance(Number(balance));
        }
      } catch {}
    }
    if (sessionId) {
      loadCart();
      loadStores();
      loadWallet();
    }
  }, [sessionId]);

  // Pre-fill coupon from cart (sessionStorage) when coming from cart with applied coupon
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(AURA_CART_COUPON_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as AppliedCoupon;
      if (data?.code && typeof data.discount === "number") {
        setAppliedCoupon(data);
        setCouponCodeInput(data.code);
      }
      sessionStorage.removeItem(AURA_CART_COUPON_KEY);
    } catch {}
  }, []);

  useEffect(() => {
    async function previewCashback() {
      if (total > 0) {
        try {
          const res = await fetch(`${API}/wallet/preview-cashback?order_total=${total}`);
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            setCashbackPreview({
              amount: data.points_amount ?? data.cashback_amount ?? 0,
              rate: data.points_rate ?? data.cashback_rate ?? "",
            });
          }
        } catch {}
      }
    }
    previewCashback();
  }, [total]);

  const handleApplyCoupon = async () => {
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) {
      setCouponError("Enter a coupon code");
      return;
    }
    setCouponError(null);
    setCouponLoading(true);
    try {
      const params = new URLSearchParams({
        code,
        order_total: String(total),
      });
      if (userIdForCoupon) params.set("user_id", userIdForCoupon);
      const res = await fetch(`${API}/coupons/validate?${params}`);
      const data = await res.json().catch(() => ({}));
      if (data.valid && data.discount != null) {
        setAppliedCoupon({
          code,
          discount: Number(data.discount),
          title: data.title || code,
        });
        setCouponCodeInput("");
      } else {
        const reason = data.reason === "already_used"
          ? "This coupon was already used (first-time only)."
          : data.reason === "invalid_or_min_order"
            ? "Invalid code or order total below minimum."
            : "Invalid or expired coupon.";
        setCouponError(reason);
      }
    } catch {
      setCouponError("Could not validate coupon. Try again.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!name || !phone) {
      alert("Please enter your name and phone number");
      return;
    }
    if (deliveryMethod === "home_delivery" && !address) {
      alert("Please enter delivery address");
      return;
    }
    if (deliveryMethod === "store_pickup") {
      if (!selectedStore) {
        alert("Please select a store");
        return;
      }
      const store = stores.find((s) => s.id === selectedStore);
      if (store?.out_of_maintenance) {
        alert("This store is out of maintenance. Please book online (home delivery) or choose another store.");
        return;
      }
    }
    if (useAuraPoints > maxApplicable || useAuraPoints < 0) {
      alert("Invalid AuraPoints amount");
      return;
    }

    setLoading(true);
    try {
      const userId = user?.email ?? sessionId;
      const res = await fetch(`${API}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId,
          items: cart.map((p) => ({ product_id: p.id, quantity: 1, price: p.price })),
          delivery_method: deliveryMethod,
          delivery_address: deliveryMethod === "home_delivery" ? address : null,
          store_location: deliveryMethod === "store_pickup" ? selectedStore : null,
          coupon_code: appliedCoupon?.code ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.detail;
        const message = typeof detail === "string"
          ? detail
          : detail?.message || detail?.reason || "Failed to place order. Please try again.";
        alert(message);
        return;
      }
      const orderId = data?.id;
      if (!orderId) {
        alert("Invalid response from server. Please try again.");
        return;
      }
      const pointsToApply = Math.min(useAuraPoints, amountAfterPoints);
      if (pointsToApply > 0) {
        const applyRes = await fetch(
          `${API}/orders/apply-wallet?user_id=${encodeURIComponent(userId)}&amount=${pointsToApply}&order_id=${encodeURIComponent(orderId)}`,
          { method: "POST" }
        );
        if (!applyRes.ok) {
          const errData = await applyRes.json().catch(() => ({}));
          alert(errData?.detail || "Failed to apply AuraPoints. Order was placed; contact support if needed.");
        }
      }
      try {
        await fetch(`${API}/session/${sessionId}/cart/clear`, {
          method: "POST",
        });
      } catch (e) {
        console.error("Failed to clear cart:", e);
      }
      router.push(`/orders/${orderId}?spin=1`);
    } catch (err) {
      alert("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="py-12 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">Your cart is empty</p>
        <Link href="/products">
          <Button className="mt-4">Browse Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/cart">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Checkout</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  type="tel"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDeliveryMethod("home_delivery")}
                  className={`relative rounded-lg border-2 p-4 text-left transition-colors ${
                    deliveryMethod === "home_delivery"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Home className="h-6 w-6 mb-2 text-primary" />
                  <p className="font-medium">Home Delivery</p>
                  <p className="text-xs text-muted-foreground mt-1">Delivered to your address</p>
                  {deliveryMethod === "home_delivery" && (
                    <Check className="absolute top-3 right-3 h-5 w-5 text-primary" />
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDeliveryMethod("store_pickup")}
                  className={`relative rounded-lg border-2 p-4 text-left transition-colors ${
                    deliveryMethod === "store_pickup"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Store className="h-6 w-6 mb-2 text-primary" />
                  <p className="font-medium">Store Pickup</p>
                  <p className="text-xs text-muted-foreground mt-1">Pick up from store with QR</p>
                  {deliveryMethod === "store_pickup" && (
                    <Check className="absolute top-3 right-3 h-5 w-5 text-primary" />
                  )}
                </motion.button>
              </div>

              {deliveryMethod === "home_delivery" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <label className="text-sm font-medium">Delivery Address</label>
                  <Input
                    placeholder="Enter your full address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1"
                  />
                </motion.div>
              )}

              {deliveryMethod === "store_pickup" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  {stores.some((s) => s.out_of_maintenance) && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          One store is currently out of maintenance
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                          Please book online (home delivery) or choose another store below.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 gap-2 border-amber-300 text-amber-800 dark:text-amber-200"
                          onClick={() => setDeliveryMethod("home_delivery")}
                        >
                          <Package className="h-4 w-4" />
                          Book online (Home delivery)
                        </Button>
                      </div>
                    </div>
                  )}
                  <label className="text-sm font-medium">Select Store</label>
                  {stores.map((store) => {
                    const isMaintenance = store.out_of_maintenance;
                    return (
                      <div
                        key={store.id}
                        onClick={() => !isMaintenance && setSelectedStore(store.id)}
                        className={`rounded-lg border p-3 transition-colors ${
                          isMaintenance
                            ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 cursor-not-allowed opacity-80"
                            : selectedStore === store.id
                              ? "border-primary bg-primary/5 cursor-pointer"
                              : "border-border hover:border-primary/50 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium flex items-center gap-2">
                              {store.name}
                              {isMaintenance && (
                                <span className="inline-flex items-center gap-1 text-xs font-normal text-amber-700 dark:text-amber-300 bg-amber-200/50 dark:bg-amber-800/50 px-2 py-0.5 rounded">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Out of maintenance
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">{store.address}</p>
                            {isMaintenance && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Book online or choose another store
                              </p>
                            )}
                          </div>
                          {!isMaintenance && selectedStore === store.id && (
                            <Check className="h-5 w-5 text-primary shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{formatPrice(item.price)}</span>
                  </div>
                ))}
              </div>

              {/* Apply coupon from Discounts */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 font-medium text-primary">
                  <Tag className="h-4 w-4" />
                  Coupon code
                </div>
                <p className="text-sm text-muted-foreground">
                  Use a code from <Link href="/discounts" className="text-primary underline hover:no-underline">Discounts</Link>. First-time use only per account.
                </p>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      {appliedCoupon.code} — {appliedCoupon.title}
                    </span>
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      -{formatPrice(appliedCoupon.discount)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => { setAppliedCoupon(null); setCouponError(null); }}
                      aria-label="Remove coupon"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      placeholder="e.g. WELCOME10"
                      value={couponCodeInput}
                      onChange={(e) => { setCouponCodeInput(e.target.value.toUpperCase()); setCouponError(null); }}
                      className="flex-1 min-w-[120px] h-9"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || total <= 0}
                    >
                      {couponLoading ? "Checking..." : "Apply"}
                    </Button>
                  </div>
                )}
                {couponError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{couponError}</p>
                )}
              </div>

              {walletBalance > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 font-medium text-primary">
                    <Wallet className="h-4 w-4" />
                    Use AuraPoints
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Available: {formatPrice(walletBalance)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={maxApplicable}
                      step={1}
                      placeholder="0"
                      value={useAuraPoints || ""}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (Number.isNaN(v)) setUseAuraPoints(0);
                        else setUseAuraPoints(Math.max(0, Math.min(maxApplicable, v)));
                      }}
                      className="w-24 h-9"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setUseAuraPoints(maxApplicable)}
                    >
                      Use max
                    </Button>
                    {useAuraPoints > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setUseAuraPoints(0)}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {(appliedCoupon || useAuraPoints > 0) && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(total)}</span>
                </div>
              )}
              {appliedCoupon && (
                <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                  <span>Coupon ({appliedCoupon.code})</span>
                  <span>-{formatPrice(appliedCoupon.discount)}</span>
                </div>
              )}
              {useAuraPoints > 0 && (
                <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                  <span>AuraPoints applied</span>
                  <span>-{formatPrice(useAuraPoints)}</span>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-fluid-lg">
                  <span>Amount to pay</span>
                  <span className="text-primary">{formatPrice(amountAfterPoints)}</span>
                </div>
              </div>
              
              {cashbackPreview && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Sparkles className="h-4 w-4 text-emerald-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      Earn {formatPrice(cashbackPreview.amount)} AuraPoints
                    </p>
                    <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                      {cashbackPreview.rate} rewards • Valid for 30 days
                    </p>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={loading}
              >
                {loading ? "Placing Order..." : "Place Order"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
