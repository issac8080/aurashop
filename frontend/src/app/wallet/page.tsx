"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet as WalletIcon,
  TrendingUp,
  TrendingDown,
  Gift,
  Sparkles,
  Plus,
  ChevronRight,
  Bot,
  Calendar,
  Trophy,
  Zap,
  Coins,
  Lock,
  Smile,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, useAuth } from "@/app/providers";
import { formatPrice } from "@/lib/utils";
import { playCouponGame, playScratch } from "@/lib/api";
import { HomeSpinWheel } from "@/components/HomeSpinWheel";
import { HomeScratch } from "@/components/HomeScratch";

const API = "/api";

type Transaction = {
  id: string;
  amount: number;
  type: string;
  source: string;
  description: string;
  order_id?: string;
  expires_at?: string;
  created_at: string;
  is_expired: boolean;
};

type Summary = {
  balance: number;
  total_earned: number;
  total_spent: number;
  active_points: number;
  pending_points: number;
  expiring_soon: number;
  transaction_count: number;
};

// VIP display: 200/1,000 points, spend ₹2,857 more for Level 11 (image)
const VALIDITY_CURRENT = 200;
const VALIDITY_GOAL = 1000;
const VIP_LEVEL = 11;
const SPEND_MORE_FOR_VIP = 2857;

export default function WalletPage() {
  const { sessionId } = useCart();
  const { user: authUser } = useAuth();
  const userId = authUser?.email ?? sessionId ?? "";
  const displayName = authUser?.name?.split(" ")[0] || authUser?.email?.split("@")[0] || "there";

  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [activeTab, setActiveTab] = useState<"quests" | "daily_spin" | "lucky_scratch">("quests");
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInStreak, setCheckInStreak] = useState(3);
  const [questCount] = useState(2);
  const [gameModal, setGameModal] = useState<"spin" | "scratch" | null>(null);
  const [gameResult, setGameResult] = useState<{
    won: boolean;
    code: string | null;
    discount: number;
    message: string;
    min_order: number;
  } | null>(null);
  const [gameLoading, setGameLoading] = useState<"spin" | "scratch" | null>(null);

  const handleAddMoney = async () => {
    const amt = parseFloat(addAmount);
    if (!amt || amt < 1 || amt > 100000) {
      setAddError("Enter amount between ₹1 and ₹100,000");
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      const params = new URLSearchParams({
        user_id: userId || "",
        amount: String(amt),
        payment_method: "card",
      });
      const res = await fetch(`${API}/wallet/add-money?${params}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Failed to add money");
      setShowAddMoney(false);
      setAddAmount("");
      setCardNumber("");
      setCardExpiry("");
      setCardCvv("");
      const wRes = await fetch(`${API}/users/${userId}/wallet`);
      if (wRes.ok) {
        const wData = await wRes.json().catch(() => ({}));
        setSummary(wData.summary);
      }
      const tRes = await fetch(`${API}/users/${userId}/wallet/transactions?limit=20`);
      if (tRes.ok) {
        const tData = await tRes.json().catch(() => ({}));
        setTransactions(Array.isArray(tData?.transactions) ? tData.transactions : []);
      }
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add money");
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => {
    async function loadWallet() {
      try {
        const res = await fetch(`${API}/users/${userId}/wallet`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setSummary(data.summary);
        }
      } catch {}
    }
    async function loadTransactions() {
      try {
        const res = await fetch(`${API}/users/${userId}/wallet/transactions?limit=20`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
        }
      } catch {}
      finally {
        setLoading(false);
      }
    }
    if (userId) {
      loadWallet();
      loadTransactions();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const handleCheckIn = () => {
    setCheckedIn(true);
    setCheckInStreak((prev) => prev + 1);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950/50 py-12 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        <p className="ml-3 text-gray-500 dark:text-gray-400">Loading wallet...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 sm:pb-24">
      {/* Hero: light background, sparkling/cloud feel, floating coins, robot on cloud */}
      <div className="relative overflow-hidden pt-6 sm:pt-8 pb-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(34,211,238,0.08),transparent)]" />
        <div className="absolute top-20 left-1/4 w-3 h-3 rounded-full bg-amber-400/60 animate-pulse" />
        <div className="absolute top-32 right-1/3 w-2 h-2 rounded-full bg-amber-300/70 animate-pulse" />
        <div className="absolute bottom-8 right-1/4 w-4 h-4 rounded-full bg-amber-400/50 animate-pulse" />
        <div className="absolute top-16 right-20 w-2 h-2 rounded-full bg-amber-300/60" />
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="space-y-2">
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              Aura Wallet
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">
              Earn AuraPoints & unlock rewards ✨
            </p>
          </div>
          <div className="hidden md:flex relative w-24 h-24 shrink-0 items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-200 to-cyan-300 dark:from-sky-600 dark:to-cyan-500 rounded-2xl opacity-95 shadow-lg border border-white/50 flex items-center justify-center">
              <Bot className="h-10 w-10 text-sky-700 dark:text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center border-2 border-amber-300 dark:border-amber-600">
              <Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="absolute top-0 right-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <Coins className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 -mt-2">
        {/* Aura Wallet Details: one card, two columns */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden"
        >
          <div className="p-6 sm:p-8 grid md:grid-cols-2 gap-8">
            {/* Left column: Wallet Balance + Total Earned / Total Spent */}
            <div className="space-y-6">
              <div>
                <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">Aura Wallet</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Earn AuraPoints on every purchase</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  <WalletIcon className="h-5 w-5 text-primary" />
                  Wallet Balance
                </div>
                <p className="font-heading text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
                  ₹{summary?.balance ?? 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Available for your next purchase</p>
                <Button
                  onClick={() => setShowAddMoney(true)}
                  className="mt-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2.5 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Money
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Total Earned</span>
                  </div>
                  <p className="font-heading text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{summary?.total_earned ?? 0}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Spent</span>
                  </div>
                  <p className="font-heading text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ₹{summary?.total_spent ?? 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Right column: AuraPoints Rewards */}
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Gift className="h-6 w-6 text-primary" />
                <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">AuraPoints Rewards</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Earn on every order:</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Orders under ₹1,000</span>
                  <span className="font-semibold text-primary">5%</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Orders ₹1,000+</span>
                  <span className="font-semibold text-primary">7%</span>
                </div>
              </div>
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Validity</span>
                  <span className="text-sm font-semibold text-primary">{VALIDITY_CURRENT}/{VALIDITY_GOAL}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                      style={{ width: `${(VALIDITY_CURRENT / VALIDITY_GOAL) * 100}%` }}
                    />
                  </div>
                  <Lock className="h-4 w-4 text-gray-400 shrink-0" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Spend ₹{SPEND_MORE_FOR_VIP.toLocaleString()} more to reach VIP Level {VIP_LEVEL}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Hold & earn amazing rewards: tabs Quests (default), Daily Spin, Lucky Scratch */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white">
              Hold & earn amazing rewards
            </h2>
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
            {[
              { id: "quests" as const, label: "Quests" },
              { id: "daily_spin" as const, label: "Daily Spin" },
              { id: "lucky_scratch" as const, label: "Lucky Scratch" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "quests" && (
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Daily Check-In */}
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white">Daily Check-In</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Check in daily</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20">
                    <Smile className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span className="font-bold text-amber-700 dark:text-amber-300">20</span>
                  </div>
                </div>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <div className="w-28 h-28 rounded-2xl bg-white dark:bg-gray-800 border-2 border-amber-200 dark:border-amber-700 flex flex-col items-center justify-center shadow-md">
                      <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-400 mb-1" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()]}
                      </span>
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">{new Date().getDate()}</span>
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {[...Array(7)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 w-5 rounded-sm ${
                            i < checkInStreak ? "bg-amber-400 dark:bg-amber-500" : "bg-gray-200 dark:bg-gray-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-center text-gray-600 dark:text-gray-400 mb-4">
                  Check in consecutively for 1 more day to earn bonus coins!
                  <ChevronRight className="h-3 w-3 inline ml-0.5 align-middle" />
                </p>
                {!checkedIn ? (
                  <Button
                    onClick={handleCheckIn}
                    className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                  >
                    Check In Today
                  </Button>
                ) : (
                  <div className="w-full rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold py-3 text-center">
                    ✓ Checked in today!
                  </div>
                )}
              </div>

              {/* Weekly Challenges */}
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white">Weekly Challenges</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Complete weekly assignments</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20">
                    <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span className="font-bold text-amber-700 dark:text-amber-300">Up to +300</span>
                  </div>
                </div>
                <div className="flex items-center justify-center mb-4">
                  <div className="w-28 h-28 rounded-2xl bg-amber-200/50 dark:bg-amber-900/30 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center">
                    <Coins className="h-12 w-12 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <div className="flex gap-1 mb-4">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-2 rounded-sm ${
                        i < 5 ? "bg-emerald-400 dark:bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <Button variant="outline" size="sm" className="rounded-xl gap-1" asChild>
                    <Link href="/discounts">
                      Details
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </Button>
                  <Button size="sm" className="rounded-xl gap-1" asChild>
                    <Link href="/discounts" className="flex items-center gap-1">
                      View Quests
                      <ChevronRight className="h-3 w-3" />
                      <span className="ml-0.5 px-1.5 py-0.5 rounded bg-amber-500/30 text-xs font-bold">3</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "daily_spin" && (
            <div className="text-center py-8">
              <Zap className="h-12 w-12 mx-auto text-primary mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Spin the wheel to win AuraPoints or coupons!</p>
              <Button onClick={playSpin} disabled={!!gameLoading} className="rounded-xl bg-primary text-white">
                {gameLoading === "spin" ? "Spinning..." : "Spin Now"}
              </Button>
            </div>
          )}

          {activeTab === "lucky_scratch" && (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 mx-auto text-amber-500 mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Scratch to reveal your reward!</p>
              <Button onClick={playScratchGame} disabled={!!gameLoading} className="rounded-xl bg-primary text-white">
                {gameLoading === "scratch" ? "Scratching..." : "Play Lucky Scratch"}
              </Button>
            </div>
          )}
        </motion.div>

        {/* Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg p-6"
        >
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white mb-2">
            Transaction History
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Start earning or spending AuraPoints to view your transaction history
          </p>

          {transactions.length === 0 ? (
            <div className="space-y-6">
              <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-950/40 dark:to-cyan-950/30 border border-sky-200 dark:border-sky-800 p-6 flex items-center gap-4">
                <div className="flex h-14 w-14 rounded-2xl bg-white/80 dark:bg-gray-800/80 items-center justify-center shrink-0">
                  <Bot className="h-8 w-8 text-sky-600 dark:text-sky-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {displayName}, there are {questCount} quests waiting for you!
                    <ChevronRight className="h-4 w-4 text-gray-400 inline ml-1 align-middle" />
                  </p>
                </div>
              </div>

              <div className="text-center">
                <Link href="/products">
                  <Button className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3">
                    Start Shopping
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    txn.is_expired
                      ? "opacity-50 bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700"
                      : (txn as { status?: string }).status === "pending"
                        ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                        : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {txn.type === "credit" ? (
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                        <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{txn.description}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(txn.created_at).toLocaleDateString()}
                        </p>
                        {(txn as { status?: string }).status === "pending" && (
                          <span className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p
                    className={`font-bold text-lg shrink-0 ml-2 ${
                      txn.type === "credit" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {txn.type === "credit" ? "+" : "-"}₹{txn.amount}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Add Money Modal */}
      <AnimatePresence>
        {showAddMoney && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => !adding && setShowAddMoney(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full space-y-4 border border-gray-200 dark:border-gray-700 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white">Add Money to Wallet</h2>
                <button
                  onClick={() => !adding && setShowAddMoney(false)}
                  disabled={adding}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="text-2xl text-gray-500">×</span>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    className="w-full mt-1.5 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    disabled={adding}
                    min="1"
                    max="100000"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Min: ₹1 | Max: ₹100,000</p>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Card details (dummy – any value works locally)
                  </label>
                  <input
                    type="text"
                    placeholder="Card number (e.g. 4111 1111 1111 1111)"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    disabled={adding}
                  />
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      disabled={adding}
                    />
                    <input
                      type="text"
                      placeholder="CVV"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="w-24 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      disabled={adding}
                    />
                  </div>
                </div>

                {addError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">{addError}</p>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    💳 Local demo: any card details accepted. Money is added instantly.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => setShowAddMoney(false)}
                    disabled={adding}
                  >
                    Cancel
                  </Button>
                  <Button className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600" onClick={handleAddMoney} disabled={adding}>
                    {adding ? "Adding..." : "Add Money"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spin wheel modal */}
      <AnimatePresence>
        {gameModal === "spin" && gameResult && (
          <HomeSpinWheel
            won={gameResult.won}
            discount={gameResult.discount}
            code={gameResult.code}
            message={gameResult.message}
            minOrder={gameResult.min_order}
            onClose={() => {
              setGameModal(null);
              setGameResult(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Scratch modal */}
      <AnimatePresence>
        {gameModal === "scratch" && gameResult && (
          <HomeScratch
            won={gameResult.won}
            discount={gameResult.discount}
            code={gameResult.code}
            message={gameResult.message}
            minOrder={gameResult.min_order}
            onClose={() => {
              setGameModal(null);
              setGameResult(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
