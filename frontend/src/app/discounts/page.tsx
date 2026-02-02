"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag,
  Sparkles,
  Copy,
  Check,
  Ticket,
  MessageCircle,
  Search,
  ChevronRight,
  Star,
  Heart,
  Bot,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/providers";
import { playCouponGame, playScratch } from "@/lib/api";
import { HomeSpinWheel } from "@/components/HomeSpinWheel";
import { HomeScratch } from "@/components/HomeScratch";
import { cn } from "@/lib/utils";

const API = "/api";

type Coupon = {
  code: string;
  discount: number;
  type: string;
  min_order: number;
  title: string;
  category?: string | null;
};

export default function DiscountsPage() {
  const { user, sessionId } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [personalized, setPersonalized] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [gameLoading, setGameLoading] = useState<"spin" | "scratch" | null>(null);
  const [gameModal, setGameModal] = useState<"spin" | "scratch" | null>(null);
  const [gameResult, setGameResult] = useState<{
    won: boolean;
    code: string | null;
    discount: number;
    message: string;
    min_order: number;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams();
        if (user?.email) params.set("user_id", user.email);
        const res = await fetch(`${API}/discounts?${params}`);
        if (res.ok) {
          const data = await res.json();
          setCoupons(data.coupons || []);
          setPersonalized(data.personalized || []);
        }
      } catch {
        setCoupons([]);
        setPersonalized([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.email]);

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

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const pickedForName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "Issac";

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading discounts...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 sm:pb-24">
      {/* Main title section */}
      <div className="relative pt-6 sm:pt-8 pb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary font-medium">
              <Tag className="h-5 w-5" />
              <span>Discounts & Coupons</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              Snag exclusive deals and save big at checkout! ✨
            </h1>
          </div>
          {/* Robot with coins - right side */}
          <div className="hidden md:flex relative w-28 h-28 shrink-0 items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-200 to-cyan-300 dark:from-sky-600 dark:to-cyan-500 rounded-2xl opacity-90 shadow-lg border border-white/50 flex items-center justify-center">
              <Bot className="h-12 w-12 text-sky-700 dark:text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center border-2 border-amber-300 dark:border-amber-600">
              <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="absolute top-0 right-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <Coins className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-10">
        {/* Offers for you */}
        {personalized.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5">
                Offers for you <Heart className="h-5 w-5 text-emerald-500 fill-emerald-500" />
              </span>
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                Personalized deals curated just for {pickedForName}.
              </span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {personalized.slice(0, 3).map((c, i) => (
                <OffersCard
                  key={c.code}
                  coupon={c}
                  variant={i === 0 ? "blue" : i === 1 ? "orange" : "purple"}
                  copyCode={copyCode}
                  copied={copied}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* All Coupons */}
        <section className="space-y-4">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            All Coupons
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(coupons.length >= 3 ? coupons.slice(0, 3) : coupons).map((c, i) => (
              <AllCouponsCard
                key={c.code}
                coupon={c}
                badge={i === 0 ? "Hot" : i === 1 ? "New" : "Limited"}
                copyCode={copyCode}
                copied={copied}
              />
            ))}
          </div>
        </section>

        {/* Feeling lucky? Play & Win - two cards only */}
        <section className="space-y-4">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Feeling lucky? Play & Win <Sparkles className="h-5 w-5 text-amber-400" />
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Play games, unlock special coupons and maximize your savings! ✨
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Spin & Win - wheel graphic, Copy Code > */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-3xl border border-sky-200/80 dark:border-sky-800/50 bg-gradient-to-br from-sky-50 to-blue-100 dark:from-sky-950/50 dark:to-blue-900/40 p-6 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6"
            >
              <div className="relative z-10 space-y-4 flex-1">
                <div>
                  <h3 className="font-heading text-xl font-bold text-gray-900 dark:text-white">
                    Spin & Win
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    Min. order ₹10,000
                  </p>
                </div>
                <Button
                  onClick={playSpin}
                  disabled={!!gameLoading}
                  className="rounded-xl bg-white/90 hover:bg-white dark:bg-gray-900/80 dark:hover:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  {gameLoading === "spin" ? "Spinning..." : "Copy Code"}{" "}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              {/* Spinning wheel graphic - simplified wheel with segments */}
              <div className="relative z-10 w-32 h-32 sm:w-36 sm:h-36 flex-shrink-0">
                <div
                  className="absolute inset-0 rounded-full border-4 border-amber-400 dark:border-amber-500 shadow-xl"
                  style={{
                    background: `conic-gradient(#fde68a 0deg 60deg, #e5e7eb 60deg 120deg, #fde68a 120deg 180deg, #e5e7eb 180deg 240deg, #fde68a 240deg 300deg, #e5e7eb 300deg 360deg)`,
                  }}
                />
                <div className="absolute inset-[18%] rounded-full bg-white dark:bg-gray-900 border-2 border-amber-500 flex items-center justify-center shadow-inner font-bold text-amber-600 dark:text-amber-400 text-sm">
                  SPIN
                </div>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-amber-500" />
                <div className="absolute -bottom-1 right-0 w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-700 flex items-center justify-center">
                  <Coins className="h-3 w-3 text-amber-700 dark:text-amber-200" />
                </div>
                <div className="absolute top-2 -right-1 w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-700 flex items-center justify-center">
                  <Coins className="h-2.5 w-2.5 text-amber-700 dark:text-amber-200" />
                </div>
              </div>
            </motion.div>

            {/* Lucky Scratch - robot with coins, Scratch & Reveal */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="relative overflow-hidden rounded-3xl border border-amber-200/80 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/50 dark:to-orange-900/40 p-6 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6"
            >
              <div className="relative z-10 space-y-4 flex-1">
                <div>
                  <h3 className="font-heading text-xl font-bold text-gray-900 dark:text-white">
                    Lucky Scratch
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    Min. order ₹50,000
                  </p>
                </div>
                <Button
                  onClick={playScratchGame}
                  disabled={!!gameLoading}
                  className="rounded-xl bg-white/90 hover:bg-white dark:bg-gray-900/80 dark:hover:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  {gameLoading === "scratch" ? "Revealing..." : "Scratch & Reveal"}
                </Button>
              </div>
              {/* Robot with pile of coins */}
              <div className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-200 to-cyan-300 dark:from-sky-600 dark:to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg border border-white/50">
                  <Bot className="h-14 w-14 text-sky-700 dark:text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-amber-200 dark:bg-amber-700 flex items-center justify-center border-2 border-amber-400 dark:border-amber-500">
                  <Coins className="h-5 w-5 text-amber-800 dark:text-amber-200" />
                </div>
                <div className="absolute bottom-0 left-0 w-7 h-7 rounded-full bg-amber-200 dark:bg-amber-700 flex items-center justify-center">
                  <Coins className="h-3.5 w-3.5 text-amber-800 dark:text-amber-200" />
                </div>
                <div className="absolute top-0 right-0 w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-700 flex items-center justify-center">
                  <Coins className="h-2.5 w-2.5 text-amber-800 dark:text-amber-200" />
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Floating chat bubble - robot + message */}
      <div className="fixed bottom-24 right-4 sm:right-6 z-40 max-w-[280px] animate-in slide-in-from-bottom-4 fade-in duration-500 delay-300">
        <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200 dark:border-gray-700 p-4 rounded-2xl rounded-br-none shadow-xl flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center shrink-0 border border-sky-200 dark:border-sky-700">
            <Bot className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 pt-0.5">
            Let me know if you need any help finding the best deals!
          </p>
        </div>
      </div>

      {/* Circular FAB with magnifying glass (search) */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("focus-search"))}
        className="fixed bottom-6 right-4 sm:right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center border border-white/20"
        aria-label="Search"
      >
        <Search className="h-6 w-6" />
      </button>

      {/* Game modals */}
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

/* Offers for you - three cards with distinct gradient backgrounds */
function OffersCard({
  coupon,
  variant,
  copyCode,
  copied,
}: {
  coupon: Coupon;
  variant: "blue" | "orange" | "purple";
  copyCode: (code: string) => void;
  copied: string | null;
}) {
  const bgClass =
    variant === "blue"
      ? "from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-blue-200/60 dark:border-blue-800/40"
      : variant === "orange"
        ? "from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40 border-amber-200/60 dark:border-amber-800/40"
        : "from-violet-50 to-fuchsia-50 dark:from-violet-950/40 dark:to-fuchsia-950/40 border-violet-200/60 dark:border-violet-800/40";

  return (
    <Card
      className={cn(
        "rounded-3xl border bg-gradient-to-br shadow-lg hover:shadow-xl transition-all overflow-hidden",
        bgClass
      )}
    >
      <CardContent className="p-5 relative">
        {variant === "orange" && (
          <div className="absolute bottom-2 right-2 flex gap-1 opacity-60">
            <Coins className="h-5 w-5 text-amber-500" />
            <Coins className="h-4 w-4 text-amber-500 mt-1" />
          </div>
        )}
        <div>
          <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white leading-tight">
            {coupon.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Min. order ₹{coupon.min_order.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 bg-white/70 dark:bg-black/20 p-2 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
          <code className="flex-1 px-3 py-2 font-mono text-sm font-semibold text-gray-800 dark:text-gray-200 tracking-wide truncate">
            {coupon.code}
          </code>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => copyCode(coupon.code)}
            className="h-9 w-9 rounded-lg shrink-0"
          >
            {copied === coupon.code ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4 text-gray-500" />
            )}
          </Button>
        </div>
        <div className="pt-3 mt-3 border-t border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center text-[10px] text-gray-400 dark:text-gray-500">
          <span>Coupon: {coupon.code.toLowerCase()}</span>
          <span>after ₹{coupon.min_order.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* All Coupons - badges Hot / New / Limited */
function AllCouponsCard({
  coupon,
  badge,
  copyCode,
  copied,
}: {
  coupon: Coupon;
  badge: "Hot" | "New" | "Limited";
  copyCode: (code: string) => void;
  copied: string | null;
}) {
  const badgeClass =
    badge === "Hot"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
      : badge === "New"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
        : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400";

  return (
    <Card className="rounded-3xl border border-gray-200/80 dark:border-gray-700/80 bg-white/90 dark:bg-gray-900/70 shadow-md hover:shadow-lg transition-all overflow-hidden">
      <div className="absolute top-4 left-4 z-10">
        <Badge className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border-0", badgeClass)}>
          {badge}
        </Badge>
      </div>
      <CardContent className="p-5 pt-10">
        <div>
          <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white leading-tight">
            {coupon.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Min. order ₹{coupon.min_order.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
          <code className="flex-1 px-3 py-2 font-mono text-sm font-semibold text-gray-800 dark:text-gray-200 tracking-wide truncate">
            {coupon.code}
          </code>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => copyCode(coupon.code)}
            className="h-9 w-9 rounded-lg shrink-0"
          >
            {copied === coupon.code ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4 text-gray-500" />
            )}
          </Button>
        </div>
        <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-[10px] text-gray-400 dark:text-gray-500">
          <span>Coupon: {coupon.code.toLowerCase()}</span>
          <span>{badge === "Limited" ? "Limited time" : "Valid until Dec 31"}</span>
        </div>
      </CardContent>
    </Card>
  );
}
