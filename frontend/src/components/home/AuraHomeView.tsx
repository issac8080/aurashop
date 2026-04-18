"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShoppingCart,
  Star,
  HelpCircle,
  ShoppingBasket,
  Smartphone,
  Shirt,
  Headphones,
  Home,
  Sparkles,
  Dumbbell,
  BookOpen,
  Gamepad2,
  CircleDollarSign,
  Percent,
  Trophy,
  Pill,
  Flame,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeProductImage } from "@/components/HomeProductImage";
import { formatPrice, cn } from "@/lib/utils";
import { useStoreMode } from "@/context/store-mode-context";
import type { Product } from "@/lib/api";

const PICK_TAG_STYLES = [
  { label: "BEST MATCH", g: "bg-[#1B5E20] text-white", r: "bg-[#B3001B] text-white" },
  { label: "DEAL OF THE DAY", g: "bg-orange-500 text-white", r: "bg-orange-500 text-white" },
  { label: "TRENDING", g: "bg-violet-600 text-white", r: "bg-purple-600 text-white" },
  { label: "NEW", g: "bg-sky-600 text-white", r: "bg-sky-600 text-white" },
  { label: "POPULAR", g: "bg-amber-600 text-white", r: "bg-amber-600 text-white" },
];

const QUICK_CATEGORIES: { label: string; href: string; color: string; icon: string; Icon?: LucideIcon }[] = [
  { label: "Grocery", href: "/products?store=groceries&category=groceries", color: "bg-emerald-100", icon: "🛒", Icon: ShoppingBasket },
  { label: "Mobiles", href: "/products?category=smartphones", color: "bg-sky-100", icon: "📱", Icon: Smartphone },
  { label: "Fashion", href: "/products?category=mens-shirts", color: "bg-rose-100", icon: "👕", Icon: Shirt },
  { label: "Electronics", href: "/products?category=laptops", color: "bg-violet-100", icon: "🎧", Icon: Headphones },
  { label: "Home", href: "/products?category=home-decoration", color: "bg-orange-100", icon: "🏠", Icon: Home },
  { label: "Beauty", href: "/products?category=fragrances", color: "bg-pink-200", icon: "💄", Icon: Sparkles },
  { label: "Sports", href: "/products?category=sports", color: "bg-slate-200", icon: "⚽", Icon: Dumbbell },
  { label: "Toys", href: "/products?category=kids-bikes", color: "bg-amber-100", icon: "🧸", Icon: Gamepad2 },
  { label: "Pharmacy", href: "/search?q=health", color: "bg-teal-100", icon: "💊", Icon: Pill },
  { label: "Spin wheel", href: "/?game=spin", color: "bg-amber-100", icon: "🎡", Icon: Percent },
  { label: "Jackpot", href: "/?game=jackpot", color: "bg-rose-100", icon: "🎰", Icon: Trophy },
  { label: "Guess price", href: "/?game=guess", color: "bg-cyan-100", icon: "?", Icon: CircleDollarSign },
  { label: "Top Offers", href: "/discounts", color: "bg-red-100", icon: "🔥", Icon: Flame },
];

const GROCERY_SCROLLER_LABELS = new Set([
  "Grocery",
  "Pharmacy",
  "Spin wheel",
  "Jackpot",
  "Guess price",
  "Top Offers",
]);

const GRID_CATS: { name: string; href: string; color: string; ImageIcon: LucideIcon }[] = [
  { name: "Grocery", href: "/products?store=groceries&category=groceries", color: "bg-lime-100", ImageIcon: ShoppingBasket },
  { name: "Mobiles", href: "/products?category=smartphones", color: "bg-sky-100", ImageIcon: Smartphone },
  { name: "Fashion", href: "/products?category=mens-shirts", color: "bg-pink-200", ImageIcon: Shirt },
  { name: "Electronics", href: "/products?category=laptops", color: "bg-violet-200", ImageIcon: Headphones },
  { name: "Home & Kitchen", href: "/products?category=home-decoration", color: "bg-orange-200", ImageIcon: Home },
  { name: "Beauty", href: "/products?category=fragrances", color: "bg-rose-200", ImageIcon: Sparkles },
  { name: "Sports", href: "/products?category=sports", color: "bg-stone-200", ImageIcon: Dumbbell },
  { name: "Books", href: "/search?q=book", color: "bg-amber-200", ImageIcon: BookOpen },
];

function mrpFor(p: Product) {
  if (p.compare_at_price && p.compare_at_price > p.price) return p.compare_at_price;
  return Math.round(p.price * 1.2);
}

function discPct(p: Product) {
  const m = mrpFor(p);
  if (m <= p.price) return 0;
  return Math.round(((m - p.price) / m) * 100);
}

export type AuraHomeViewProps = {
  user: { name?: string; email?: string } | null;
  loading: boolean;
  recommended: Product[];
  catalog: Product[];
  onTrackProductClick: (id: string) => void;
  onAddToCart: (id: string) => void;
  onPlayGames: () => void;
  whyPickOpen: number | null;
  onWhyPick: (i: number | null) => void;
  pickReasons: { label: string; why: string }[];
  heroIndex: number;
  onHeroIndex: (i: number) => void;
  onPersonalizePrompt: (message: string) => void;
  personalizePrompts: { label: string; message: string }[];
};

function primaryClasses(g: boolean) {
  return g ? "bg-[#2E7D32] hover:bg-[#1B5E20] text-white" : "bg-[#B3001B] hover:bg-[#8E0014] text-white";
}

function primaryText(g: boolean) {
  return g ? "text-[#1B5E20]" : "text-[#B3001B]";
}

export function AuraHomeView(p: AuraHomeViewProps) {
  const { isGroceries: g } = useStoreMode();
  const name = p.user?.name?.split(" ")[0] || p.user?.email?.split("@")[0] || "You";
  const heroList = p.catalog.length >= 3 ? p.catalog.slice(0, 3) : p.catalog;
  const currentHero = heroList[Math.min(p.heroIndex, Math.max(0, heroList.length - 1))] || null;
  const discountH = useMemo(() => 20 + (p.heroIndex * 3) % 20, [p.heroIndex]);

  return (
    <div
      className={cn(
        "w-full -mx-4 sm:-mx-6 max-w-[100vw] overflow-x-hidden",
        g ? "bg-gradient-to-b from-emerald-50/40 to-transparent" : "bg-gradient-to-b from-rose-50/30 to-transparent"
      )}
    >
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4 sm:space-y-5">
        {/* Category circles */}
        <div className="overflow-x-auto scrollbar-hide -mx-1">
          <div className="flex gap-2 sm:gap-3 min-w-0 py-1">
            {QUICK_CATEGORIES.filter((c) => !g || GROCERY_SCROLLER_LABELS.has(c.label)).map((c) => {
              const Picto = c.Icon;
              return (
                <Link key={c.label} href={c.href} className="flex flex-col items-center min-w-[4.2rem] shrink-0 group">
                  <div
                    className={cn(
                      "h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center border border-black/5 shadow-sm group-hover:scale-105 transition-transform",
                      c.color
                    )}
                  >
                    {Picto ? (
                      <Picto className="h-6 w-6 sm:h-7 sm:w-7 text-foreground/80" strokeWidth={1.75} aria-hidden />
                    ) : (
                      <span className="text-lg sm:text-xl" aria-hidden>
                        {c.icon}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-center leading-tight mt-1.5 text-foreground/80 max-w-[4.2rem]">
                    {c.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Hero + side banners */}
        <div className="grid lg:grid-cols-[1fr_240px] gap-3 sm:gap-4">
          <div className={cn("relative rounded-2xl overflow-hidden min-h-[200px] sm:min-h-[240px] text-white shadow-lg", g ? "bg-gradient-to-br from-[#1B5E20] to-[#2E7D32]" : "bg-gradient-to-br from-[#3d0508] to-[#B3001B]")}>
            <AnimatePresence mode="wait">
              {p.loading && !currentHero ? (
                <div className="absolute inset-0 animate-pulse bg-white/20" />
              ) : currentHero ? (
                <motion.div
                  key={currentHero.id}
                  initial={{ opacity: 0.85 }}
                  animate={{ opacity: 1 }}
                  className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 h-full"
                >
                  <div className="flex-1 space-y-2 sm:space-y-3 z-[1]">
                    <span className="inline-block text-[10px] font-extrabold tracking-wider bg-white/20 border border-white/30 px-2 py-0.5 rounded">Best Seller</span>
                    <h1 className="text-xl sm:text-2xl font-extrabold line-clamp-2 leading-tight text-white text-left">{currentHero.name}</h1>
                    <p className="text-white/80 text-sm line-clamp-1 text-left">
                      {currentHero.category} {currentHero.brand && `· ${currentHero.brand}`}
                    </p>
                    <p className="text-xs text-white/80 text-left">
                      {g
                        ? "Everyday value · Great quality · Fast delivery to your area"
                        : "4.2″ display · Heart rate · SpO₂ · 7-day battery"}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold">Up to {discountH}% OFF</span>
                      <Link href={`/products/${currentHero.id}`} onClick={() => p.onTrackProductClick(currentHero.id)}>
                        <Button className="bg-white text-black hover:bg-white/90 font-bold rounded-md px-5">Shop Now</Button>
                      </Link>
                    </div>
                    {heroList.length > 1 && (
                      <div className="flex gap-1.5 pt-2">
                        {heroList.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            aria-label={`Slide ${i + 1}`}
                            onClick={() => p.onHeroIndex(i)}
                            className={cn("h-1.5 rounded-full transition-all", p.heroIndex === i ? "w-6 bg-white" : "w-1.5 bg-white/40")}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/products/${currentHero.id}`}
                    onClick={() => p.onTrackProductClick(currentHero.id)}
                    className="w-full sm:w-44 sm:shrink-0 self-center"
                  >
                    <div className="rounded-xl overflow-hidden border-2 border-white/30 bg-black/10 max-h-36 sm:max-h-44">
                      <HomeProductImage product={currentHero} className="!aspect-[4/3] h-36 w-full sm:h-44" />
                    </div>
                  </Link>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <div className="flex flex-col gap-2 sm:gap-3 min-h-0">
            <Link
              href={g ? "/products?store=groceries" : "/products?category=groceries"}
              className="relative flex-1 rounded-2xl bg-amber-100/90 p-3 border border-amber-200/80 shadow-sm min-h-[120px] overflow-hidden"
            >
              <div className="relative z-[1] text-left max-w-[65%]">
                <p className="text-[10px] font-extrabold text-amber-800 uppercase">Grocery</p>
                <p className="font-extrabold text-amber-900 text-sm leading-tight">Summer Grocery Savings</p>
                <p className="text-xs text-amber-800 mt-0.5">Up to 50% OFF</p>
                <Button className="mt-2 h-7 text-xs" variant="secondary">
                  Shop Grocery
                </Button>
              </div>
            </Link>
            <Link
              href={g ? "/products?store=groceries" : "/products?category=laptops"}
              className="relative flex-1 rounded-2xl bg-orange-50 p-3 border border-orange-200/80 shadow-sm min-h-[120px]"
            >
              <div className="relative z-[1] text-left max-w-[65%]">
                <p className="text-[10px] font-extrabold text-orange-800 uppercase">{g ? "Grocery" : "Electronics"}</p>
                <p className="font-extrabold text-foreground text-sm">{g ? "Stock up & save" : "Mega Sale"}</p>
                <p className="text-xs text-orange-800 mt-0.5">{g ? "Up to 40% on staples" : "From ₹999"}</p>
                <Button className={cn("mt-2 h-7 text-xs", primaryClasses(g))}>{g ? "Shop now" : "Grab Deals"}</Button>
              </div>
            </Link>
          </div>
        </div>

        {/* Service bar */}
        <div className={cn("aurashop-bleed -mx-3 sm:-mx-6", g ? "bg-emerald-50" : "bg-rose-50/80")}>
          <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-0 px-3 sm:px-6 py-3 text-center sm:text-left sm:divide-x sm:divide-border/50">
            {[
              { t: "Free Delivery", s: "On orders above ₹499" },
              { t: "Lowest Prices", s: "Deals every day" },
              { t: "Easy Returns", s: "Within 7 days" },
              { t: "Secure Payments", s: "100% protected" },
            ].map((x) => (
              <div key={x.t} className="px-1 sm:px-4 text-[11px] sm:text-sm text-left">
                <p className="font-extrabold text-foreground">{x.t}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{x.s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Picked for you */}
        <section className="rounded-2xl border border-border/80 bg-white p-3 sm:p-4 shadow-sm">
          <div className="flex items-start sm:items-center justify-between gap-2 mb-3">
            <div>
              <h2 className={cn("text-lg sm:text-2xl font-extrabold", primaryText(g))}>
                Picked just for {name}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground text-left">Based on your browsing and preferences.</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link
                href={g ? "/products?store=groceries" : "/products?sort=best_for_you"}
                className={cn("text-sm font-extrabold", primaryText(g), "whitespace-nowrap")}
              >
                View all →
              </Link>
            </div>
          </div>
          {p.loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1">
              {p.recommended.slice(0, 8).map((pr, i) => {
                const tag = PICK_TAG_STYLES[i % PICK_TAG_STYLES.length];
                const mrp = mrpFor(pr);
                const d = discPct(pr);
                return (
                  <div
                    key={pr.id}
                    className="flex-shrink-0 w-[150px] sm:w-[170px] rounded-2xl border border-border/70 bg-white overflow-hidden shadow-sm"
                  >
                    <Link
                      href={`/products/${pr.id}`}
                      onClick={() => p.onTrackProductClick(pr.id)}
                      className="block relative"
                    >
                      <HomeProductImage product={pr} className="aspect-[4/5] border-0" />
                      <span className={cn("absolute top-1.5 left-1.5 z-[1] text-[7px] sm:text-[8px] font-extrabold tracking-wide px-1.5 py-0.5 rounded", g ? tag.g : tag.r)}>{tag.label}</span>
                    </Link>
                    <div className="p-2.5 text-left">
                      <p className="font-bold text-xs line-clamp-2 min-h-8 text-foreground">{pr.name}</p>
                      <div className="flex items-center gap-0.5 mt-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-500 shrink-0" />
                        <span className="text-[10px] font-semibold">{pr.rating}</span>
                        <span className="text-[9px] text-muted-foreground">({pr.review_count})</span>
                      </div>
                      <div className="flex items-center flex-wrap gap-1 text-[8px] mt-1.5 min-h-8">
                        <span className="line-clamp-1 rounded border border-dashed border-muted-foreground/30 px-1.5 text-muted-foreground">{p.pickReasons[i % p.pickReasons.length].label}</span>
                        <button
                          type="button"
                          onClick={() => p.onWhyPick(p.whyPickOpen === i ? null : i)}
                          className={cn("shrink-0 text-[8px] font-extrabold", primaryText(g), "inline-flex items-center gap-0.5")}
                        >
                          <HelpCircle className="h-2.5 w-2.5" />
                          Why?
                        </button>
                      </div>
                      {p.whyPickOpen === i && (
                        <p className="text-[8px] text-muted-foreground leading-relaxed border rounded-md p-1.5 bg-muted/30 -mt-0.5">
                          {p.pickReasons[i % p.pickReasons.length].why}
                        </p>
                      )}
                      <div className="flex items-baseline gap-1.5 flex-wrap mt-1.5">
                        <span className={cn("text-sm font-extrabold", primaryText(g))}>{formatPrice(pr.price)}</span>
                        {d > 0 && (
                          <>
                            <span className="text-[10px] line-through text-muted-foreground">{formatPrice(mrp)}</span>
                            <span className="text-[10px] text-emerald-600 font-extrabold">{d}% off</span>
                          </>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => p.onAddToCart(pr.id)}
                        className={cn(
                          "w-full mt-1.5 h-8 text-xs font-bold",
                          g ? "border-[#2E7D32] text-[#1B5E20] hover:bg-emerald-50" : "border-[#B3001B] text-[#B3001B] hover:bg-rose-50"
                        )}
                      >
                        <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[10px] text-center text-muted-foreground mt-3 text-left pl-0">Optional: tune recommendations with AI —</p>
          <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
            {p.personalizePrompts.map((q) => (
              <Button
                key={q.label}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => p.onPersonalizePrompt(q.message)}
                className="h-7 text-[9px] rounded-full"
              >
                {q.label}
              </Button>
            ))}
          </div>
        </section>

        {/* Shop by category grid */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className={cn("text-base sm:text-xl font-extrabold", primaryText(g))}>Shop by Category</h2>
            <Link href={g ? "/products?store=groceries" : "/products"} className={cn("text-sm font-extrabold", primaryText(g))}>
              Explore all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {GRID_CATS.filter((c) => !g || c.name === "Grocery")
              .slice(0, g ? 1 : 8)
              .map((c) => {
                const GIcon = c.ImageIcon;
                return (
                  <Link
                    key={c.name + c.href}
                    href={c.href}
                    className={cn(
                      "relative overflow-hidden rounded-2xl p-4 h-24 sm:h-28 flex items-end font-extrabold text-foreground/90 text-sm sm:text-base shadow-sm border border-black/5",
                      c.color
                    )}
                  >
                    <GIcon
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-16 w-16 sm:h-20 sm:w-20 text-foreground/20 pointer-events-none"
                      strokeWidth={1.25}
                      aria-hidden
                    />
                    <span className="relative z-[1]">{c.name}</span>
                  </Link>
                );
              })}
          </div>
        </section>

        {/* Top offers + games */}
        <section>
          <h2 className={cn("text-base sm:text-xl font-extrabold mb-2", primaryText(g))}>Top offers for you</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3 text-left h-full">
              <p className="text-xs font-extrabold text-amber-800">Bank offer</p>
              <p className="text-sm font-extrabold mt-1">HDFC 10% instant off</p>
            </div>
            <div className="rounded-2xl bg-violet-50 border border-violet-100 p-3 h-full text-left">
              <p className="text-xs font-extrabold">New user</p>
              <p className="text-sm font-extrabold">
                Flat ₹200 off — <span className="font-mono text-xs">AURA200</span>
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 h-full text-left">
              <p className="text-xs font-extrabold">Flash sale</p>
              <p className="text-sm font-extrabold">Deals under ₹499</p>
            </div>
            <button
              type="button"
              onClick={p.onPlayGames}
              className={cn("rounded-2xl p-3 h-full text-left border-2 text-white shadow-md", g ? "bg-gradient-to-br from-[#1B5E20] to-[#2E7D32] border-[#1B5E20]" : "bg-gradient-to-br from-[#B3001B] to-[#d41130] border-[#B3001B]")}
            >
              <p className="text-xs font-extrabold">Play &amp; win</p>
              <p className="text-sm font-extrabold mt-1">Spin · Guess price · Jackpot</p>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
