"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Package,
  MapPin,
  Store,
  Edit,
  Plus,
  ShoppingBag,
  ChevronRight,
  Wallet,
  Gift,
  HelpCircle,
  Calendar,
  Bot,
  Coins,
  Zap,
  Copy,
  Check,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCart, useAuth } from "@/app/providers";
import { formatPrice, cn } from "@/lib/utils";

const API = "/api";

type Order = {
  id: string;
  user_id: string;
  total: number;
  status: string;
  delivery_method: string;
  created_at: string;
};

type Profile = {
  user_id: string;
  name?: string;
  email?: string;
  phone?: string;
  addresses?: string[];
  preferred_stores?: string[];
};

type WalletSummary = {
  balance: number;
  total_earned: number;
  active_points?: number;
};

const ORDERS_PER_PAGE = 3;
const WALLET_GOAL = 1000;

function getReferralCode(email: string): string {
  if (!email) return "GUEST" + Math.random().toString(36).slice(2, 9).toUpperCase();
  const str = btoa(email).replace(/[^A-Za-z0-9]/g, "").slice(0, 7);
  return (str || "AURA").toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const { sessionId } = useCart();
  const { user: authUser, login } = useAuth();
  const userId = authUser?.email ?? sessionId ?? "";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [ordersPage, setOrdersPage] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);

  const wishlistCount = 0; // Placeholder – no wishlist backend; image shows 7

  useEffect(() => {
    if (authUser) {
      setName((n) => n || authUser.name);
      setEmail((e) => e || authUser.email);
    }
  }, [authUser]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(`${API}/users/${userId}/profile`);
        const data = await res.json().catch(() => null);
        if (res.ok && data) {
          setProfile(data);
          setName(data.name || authUser?.name || "");
          setEmail(data.email || authUser?.email || "");
          setPhone(data.phone || "");
        } else if (authUser) {
          setName(authUser.name);
          setEmail(authUser.email);
        }
      } catch {
        if (authUser) {
          setName(authUser.name);
          setEmail(authUser.email);
        }
      }
    }
    async function loadOrders() {
      try {
        const res = await fetch(`${API}/users/${userId}/orders`);
        const data = await res.json().catch(() => ({}));
        setOrders(Array.isArray(data?.orders) ? data.orders : []);
      } catch {
        setOrders([]);
      }
    }
    async function loadWallet() {
      try {
        const res = await fetch(`${API}/users/${userId}/wallet`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const summary = data?.summary;
          const wallet = data?.wallet;
          if (summary) {
            setWalletSummary({
              balance: summary.balance ?? 0,
              total_earned: summary.total_earned ?? 0,
              active_points: summary.active_points,
            });
          } else if (wallet) {
            setWalletSummary({
              balance: wallet.balance ?? 0,
              total_earned: wallet.total_earned ?? 0,
              active_points: undefined,
            });
          } else {
            setWalletSummary(null);
          }
        }
      } catch {
        setWalletSummary(null);
      }
    }
    if (userId) {
      Promise.all([loadProfile(), loadOrders(), loadWallet()]).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [userId, authUser]);

  const handleSaveProfile = async () => {
    try {
      const res = await fetch(`${API}/users/${userId}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, addresses: profile?.addresses ?? [], preferred_stores: profile?.preferred_stores ?? [] }),
      });
      const data = await res.json().catch(() => null);
      if (data) setProfile(data);
      if (res.ok) {
        setEditing(false);
        const newName = (name || authUser?.name || "").trim();
        const newEmail = (email || authUser?.email || "").trim();
        if (newEmail && login) login(newEmail, newName || newEmail);
      }
    } catch {
      alert("Failed to update profile");
    }
  };

  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200" },
    confirmed: { label: "Confirmed", className: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200" },
    ready_for_pickup: { label: "Ready for pickup", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200" },
    delivered: { label: "Delivered", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200" },
    picked_up: { label: "Delivered", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200" },
  };

  const paginatedOrders = orders.slice((ordersPage - 1) * ORDERS_PER_PAGE, ordersPage * ORDERS_PER_PAGE);
  const totalOrdersPages = Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE));

  const walletPoints = walletSummary?.active_points ?? walletSummary?.balance ?? 0;
  const walletProgress = Math.min(1, walletPoints / WALLET_GOAL);
  const referralCode = getReferralCode(userId);
  const referralLink = typeof window !== "undefined" ? `${window.location.origin}/invite/${referralCode}` : `http://localhost:3000/invite/${referralCode}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!authUser && !loading) {
    router.replace("/login?from=/profile");
    return null;
  }

  if (loading) {
    return (
      <div className="py-6 sm:py-8 lg:py-10 space-y-8">
        <div className="flex justify-between items-start">
          <div className="h-10 w-48 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          <div className="h-24 w-24 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
        </div>
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          <div className="space-y-6">
            <div className="h-72 rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
            <div className="h-44 rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
          </div>
          <div className="md:col-span-2 space-y-6">
            <div className="h-80 rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
            <div className="h-48 rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
            <div className="h-32 rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 sm:py-8 lg:py-10 space-y-8 sm:space-y-10">
      {/* Main Profile Section – title + robot on cloud with coins */}
      <div className="relative">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="h-8 w-8 text-amber-500" />
              My Profile
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your account, care experience
            </p>
          </div>
          {/* Robot on wavy cloud with gold coins */}
          <div className="hidden md:flex relative w-28 h-28 shrink-0 items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-100 to-cyan-200 dark:from-sky-700 dark:to-cyan-600 rounded-tl-[2rem] rounded-tr-[2rem] rounded-bl-[2rem] shadow-lg border border-white/50 flex items-center justify-center">
              <Bot className="h-12 w-12 text-sky-700 dark:text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center border-2 border-amber-300">
              <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="absolute top-0 right-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
              <Coins className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
        {/* Left column */}
        <div className="space-y-6">
          {/* Profile Details card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 shadow-lg overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-teal-500" />
                    Profile Details
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label="Add">
                    <Plus className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-full border-2 border-teal-400 dark:border-teal-500 bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center overflow-hidden">
                      {authUser?.name ? (
                        <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                          {authUser.name.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <User className="h-10 w-10 text-teal-500" />
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center border-2 border-white dark:border-gray-900">
                      <Plus className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Tell us a bit about yourself</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Update your contact and shipping info.</p>
                  </div>
                </div>
                {editing ? (
                  <div className="space-y-3 pt-2">
                    <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
                    <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" />
                    <Input type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl" />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveProfile} className="rounded-xl flex-1 bg-teal-600 hover:bg-teal-700 text-white border-0">Save</Button>
                      <Button variant="outline" onClick={() => setEditing(false)} className="rounded-xl flex-1">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button className="w-full rounded-xl font-semibold bg-teal-600 hover:bg-teal-700 text-white border-2 border-teal-500" onClick={() => setEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Stats card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.3 }}>
            <Card className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 shadow-lg overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-teal-500" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center rounded-xl bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</span>
                  <span className="font-heading text-xl font-bold text-teal-600 dark:text-teal-400">{orders.length}</span>
                </div>
                <div className="flex justify-between items-center rounded-xl bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Wishlist</span>
                  <span className="font-heading text-xl font-bold text-teal-600 dark:text-teal-400">{wishlistCount}</span>
                </div>
                <div className="rounded-xl bg-teal-50/80 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Aura Points</span>
                    <span className="font-semibold text-teal-700 dark:text-teal-300">
                      {Math.round(walletPoints)} / {WALLET_GOAL.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${walletProgress * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="flex justify-end gap-1">
                    <Coins className="h-4 w-4 text-amber-500" />
                  </div>
                  <Link href="/wallet" className="block">
                    <Button variant="outline" size="sm" className="w-full rounded-xl border-teal-300 dark:border-teal-600 text-teal-700 dark:text-teal-300">
                      View Aura Wallet
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right column */}
        <div className="md:col-span-2 space-y-6">
          {/* My Orders card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}>
            <Card className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 shadow-lg overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-teal-500" />
                    My Orders
                  </CardTitle>
                  <Link href="/orders" className="text-sm font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5">
                    View All <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {orders.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No orders yet.</p>
                    <Link href="/products">
                      <Button size="sm" className="mt-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white">Start Shopping</Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    {paginatedOrders.map((order) => {
                      const config = statusConfig[order.status] || { label: order.status.replace(/_/g, " "), className: "bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 border-gray-200" };
                      return (
                        <Link key={order.id} href={`/orders/${order.id}`}>
                          <div className="flex flex-row flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-4 hover:border-teal-300 dark:hover:border-teal-600 transition-colors">
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                              <span className="font-mono font-semibold text-gray-900 dark:text-white">#{order.id.slice(0, 8)}</span>
                              <Badge variant="outline" className={cn("rounded-md text-xs font-medium border shrink-0", config.className)}>
                                {config.label}
                              </Badge>
                              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                {order.delivery_method === "store_pickup" ? <Store className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                                {order.delivery_method === "store_pickup" ? "Store Pickup" : "Home Delivery"}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(order.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold text-teal-600 dark:text-teal-400">{formatPrice(order.total)}</span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                    {totalOrdersPages > 1 && (
                      <div className="flex justify-center gap-1 pt-2">
                        {Array.from({ length: totalOrdersPages }, (_, i) => i + 1).map((p) => (
                          <button
                            key={p}
                            onClick={() => setOrdersPage(p)}
                            className={cn(
                              "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                              p === ordersPage ? "bg-teal-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-teal-100 dark:hover:bg-teal-900/30"
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Refer & Earn card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }}>
            <Card className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 shadow-lg overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Gift className="h-5 w-5 text-amber-500" />
                  Refer & Earn
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Share, invite, and earn rewards! 🎉</p>
                <div className="flex gap-2">
                  <Input readOnly value={referralLink} className="rounded-xl font-mono text-sm bg-gray-50 dark:bg-gray-800" />
                  <Button onClick={copyReferralLink} className="rounded-xl shrink-0 bg-teal-600 hover:bg-teal-700 text-white border-0">
                    {copiedLink ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    Copy Link
                  </Button>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 border-2 border-emerald-400 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                    ₹50
                    <Check className="h-4 w-4 mt-0.5" />
                  </div>
                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-500 font-bold text-xs">
                    ₹100
                    <Lock className="h-4 w-4 mt-0.5" />
                  </div>
                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-500 font-bold text-xs">
                    ₹150
                    <Lock className="h-4 w-4 mt-0.5" />
                  </div>
                  <Bot className="h-6 w-6 text-sky-500 ml-1" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Need help? card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}>
            <Card className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 shadow-lg overflow-hidden">
              <CardContent className="p-5 flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                    <HelpCircle className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-gray-900 dark:text-white">Need help?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Need help with your account?</p>
                  </div>
                </div>
                <Button
                  className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white border-0 shrink-0"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(
                        new CustomEvent("open-aurashop-chat", { detail: { initialMessage: "I need help with my account" } })
                      );
                    }
                  }}
                >
                  Visit Help Center
                </Button>
                <div className="hidden sm:block w-14 h-14 rounded-xl bg-gradient-to-br from-sky-200 to-cyan-300 dark:from-sky-600 dark:to-cyan-500 flex items-center justify-center shrink-0">
                  <Bot className="h-7 w-7 text-sky-700 dark:text-white" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
