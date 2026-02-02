"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Target, MessageCircle, Shirt, Gift, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fetchProducts, type Product } from "@/lib/api";
import { getProductImageSrc } from "@/lib/unsplash";
import { formatPrice } from "@/lib/utils";

const STYLE_OPTIONS = [
  { id: "casual", label: "Casual", emoji: "👟" },
  { id: "formal", label: "Formal", emoji: "👔" },
  { id: "sporty", label: "Sporty", emoji: "🏃" },
  { id: "trendy", label: "Trendy", emoji: "✨" },
];

const BUDGET_OPTIONS = [
  { id: "under5k", label: "Under ₹5,000", value: 5000 },
  { id: "5k20k", label: "₹5,000 – ₹20,000", value: 20000 },
  { id: "20kplus", label: "₹20,000+", value: 100000 },
];

const OCCASION_OPTIONS = [
  { id: "casual", label: "Casual day out" },
  { id: "office", label: "Office / Work" },
  { id: "party", label: "Party / Evening" },
  { id: "date", label: "Date night" },
  { id: "travel", label: "Travel" },
];

function openChat(initialMessage?: string) {
  window.dispatchEvent(
    new CustomEvent("open-aurashop-chat", { detail: { initialMessage } })
  );
}

export function AIActionBar() {
  const [styleQuizOpen, setStyleQuizOpen] = useState(false);
  const [buildOutfitOpen, setBuildOutfitOpen] = useState(false);
  const [surpriseOpen, setSurpriseOpen] = useState(false);

  const [styleStep, setStyleStep] = useState(1);
  const [styleChoice, setStyleChoice] = useState<string | null>(null);
  const [budgetChoice, setBudgetChoice] = useState<string | null>(null);
  const [occasionChoice, setOccasionChoice] = useState<string | null>(null);

  const [outfitOccasion, setOutfitOccasion] = useState<string | null>(null);

  const [surpriseProduct, setSurpriseProduct] = useState<Product | null>(null);
  const [surpriseLoading, setSurpriseLoading] = useState(false);

  const handleAskAI = () => openChat();
  const handleBuildOutfit = () => setBuildOutfitOpen(true);
  const handleSurpriseMe = () => setSurpriseOpen(true);
  const handleStyleQuiz = () => {
    setStyleStep(1);
    setStyleChoice(null);
    setBudgetChoice(null);
    setOccasionChoice(null);
    setStyleQuizOpen(true);
  };

  const handleStyleQuizSubmit = () => {
    const style = styleChoice || "casual";
    const budget = budgetChoice === "under5k" ? "under 5000" : budgetChoice === "5k20k" ? "5000 to 20000" : "above 20000";
    const occasion = occasionChoice || "daily";
    openChat(`I prefer ${style} style, budget ${budget}, for ${occasion}. Suggest products for me.`);
    setStyleQuizOpen(false);
  };

  const handleBuildOutfitSubmit = () => {
    if (!outfitOccasion) return;
    const label = OCCASION_OPTIONS.find((o) => o.id === outfitOccasion)?.label || outfitOccasion;
    openChat(`Build me a complete outfit for: ${label}. Suggest 3-5 matching items.`);
    setBuildOutfitOpen(false);
  };

  const handleSurpriseMeClick = async () => {
    setSurpriseLoading(true);
    setSurpriseProduct(null);
    try {
      const { products } = await fetchProducts({ limit: 50 });
      if (products?.length) {
        const random = products[Math.floor(Math.random() * products.length)];
        setSurpriseProduct(random);
      }
    } catch {
      openChat("Surprise me with a product recommendation!");
      setSurpriseOpen(false);
    } finally {
      setSurpriseLoading(false);
    }
  };

  const actions = [
    { id: "quiz", label: "Take Style Quiz", emoji: "🎯", icon: Target, onClick: handleStyleQuiz },
    { id: "ask", label: "Chat with AI", emoji: "🧠", icon: MessageCircle, onClick: handleAskAI },
    { id: "outfit", label: "Build My Outfit", emoji: "🛍", icon: Shirt, onClick: handleBuildOutfit },
    { id: "surprise", label: "Surprise Me ✨", emoji: "🎁", icon: Gift, onClick: handleSurpriseMe },
  ];

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative -mx-4 sm:-mx-6 lg:-mx-8"
      >
        <div className="flex gap-3 overflow-x-auto scroll-smooth pb-2 px-4 sm:px-6 lg:px-8 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {actions.map(({ id, label, emoji, icon: Icon, onClick }) => (
            <motion.button
              key={id}
              onClick={onClick}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex items-center gap-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/90 shadow-sm hover:shadow-md hover:border-primary/30 dark:hover:border-primary/40 flex-shrink-0 px-5 py-4 text-left transition-all min-w-[180px] sm:min-w-[200px]"
              )}
            >
              <span className="text-2xl">{emoji}</span>
              <div className="min-w-0">
                <span className="font-semibold text-gray-900 dark:text-white block truncate text-sm sm:text-base">
                  {label}
                </span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500 shrink-0 ml-auto" />
            </motion.button>
          ))}
          <div className="flex-shrink-0 w-2" aria-hidden />
        </div>
      </motion.section>

      {/* Style Quiz – bottom sheet style modal */}
      <Dialog open={styleQuizOpen} onOpenChange={setStyleQuizOpen}>
        <DialogContent
          className="fixed bottom-0 left-0 right-0 top-auto w-full max-w-none translate-y-0 rounded-t-3xl border-b-0 p-6 pb-10 sm:bottom-auto sm:left-[50%] sm:right-auto sm:top-[50%] sm:max-w-lg sm:max-h-[85vh] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border-b sm:pb-6 overflow-y-auto"
          showClose={true}
        >
          <DialogTitle className="sr-only">Style Quiz</DialogTitle>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Target className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white">Style Quiz</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Quick picks → AI recommendations</p>
            </div>
          </div>
          <AnimatePresence mode="wait">
            {styleStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">What&apos;s your style?</p>
                <div className="grid grid-cols-2 gap-3">
                  {STYLE_OPTIONS.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setStyleChoice(o.id)}
                      className={cn(
                        "rounded-xl border-2 p-4 text-left font-medium transition-all",
                        styleChoice === o.id
                          ? "border-violet-500 bg-violet-500/10 text-violet-800 dark:text-violet-200"
                          : "border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600"
                      )}
                    >
                      <span className="mr-2">{o.emoji}</span>
                      {o.label}
                    </button>
                  ))}
                </div>
                <Button className="w-full mt-4" onClick={() => setStyleStep(2)} disabled={!styleChoice}>
                  Next
                </Button>
              </motion.div>
            )}
            {styleStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Budget range?</p>
                <div className="space-y-2">
                  {BUDGET_OPTIONS.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setBudgetChoice(o.id)}
                      className={cn(
                        "w-full rounded-xl border-2 p-3 text-left font-medium transition-all",
                        budgetChoice === o.id
                          ? "border-violet-500 bg-violet-500/10 text-violet-800 dark:text-violet-200"
                          : "border-gray-200 dark:border-gray-700 hover:border-violet-300"
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setStyleStep(1)}>Back</Button>
                  <Button className="flex-1" onClick={() => setStyleStep(3)} disabled={!budgetChoice}>Next</Button>
                </div>
              </motion.div>
            )}
            {styleStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Occasion?</p>
                <div className="space-y-2">
                  {["Daily wear", "Party", "Work", "Travel"].map((o, i) => (
                    <button
                      key={o}
                      onClick={() => setOccasionChoice(o.toLowerCase().replace(" ", "_"))}
                      className={cn(
                        "w-full rounded-xl border-2 p-3 text-left font-medium transition-all",
                        occasionChoice === o.toLowerCase().replace(" ", "_")
                          ? "border-violet-500 bg-violet-500/10 text-violet-800 dark:text-violet-200"
                          : "border-gray-200 dark:border-gray-700 hover:border-violet-300"
                      )}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setStyleStep(2)}>Back</Button>
                  <Button className="flex-1" onClick={handleStyleQuizSubmit} disabled={!occasionChoice}>
                    <Sparkles className="h-4 w-4 mr-2 inline" />
                    Get AI picks
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Build My Outfit */}
      <Dialog open={buildOutfitOpen} onOpenChange={setBuildOutfitOpen}>
        <DialogContent className="max-w-lg rounded-2xl sm:rounded-2xl p-6" showClose={true}>
          <DialogTitle className="sr-only">Build My Outfit</DialogTitle>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Shirt className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white">Build My Outfit</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pick an occasion → AI suggests a full look</p>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Choose occasion</p>
          <div className="space-y-2">
            {OCCASION_OPTIONS.map((o) => (
              <button
                key={o.id}
                onClick={() => setOutfitOccasion(o.id)}
                className={cn(
                  "w-full rounded-xl border-2 p-3 text-left font-medium transition-all",
                  outfitOccasion === o.id
                    ? "border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                    : "border-gray-200 dark:border-gray-700 hover:border-amber-300"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <Button className="w-full mt-6" onClick={handleBuildOutfitSubmit} disabled={!outfitOccasion}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Build outfit with AI
          </Button>
        </DialogContent>
      </Dialog>

      {/* Surprise Me */}
      <Dialog open={surpriseOpen} onOpenChange={(open) => { if (!open) setSurpriseProduct(null); setSurpriseOpen(open); }}>
        <DialogContent className="max-w-md rounded-2xl p-6" showClose={true}>
          <DialogTitle className="sr-only">Surprise Me</DialogTitle>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
              <Gift className="h-6 w-6 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white">Surprise Me</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">We&apos;ll pick something you might love</p>
            </div>
          </div>
          {!surpriseProduct && (
            <Button
              className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
              onClick={handleSurpriseMeClick}
              disabled={surpriseLoading}
            >
              {surpriseLoading ? "Finding something…" : "🎁 Surprise me!"}
            </Button>
          )}
          {surpriseProduct && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800/50"
            >
              <Link
                href={`/products/${surpriseProduct.id}`}
                onClick={() => setSurpriseOpen(false)}
                className="block p-4"
              >
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-xl bg-gray-200 dark:bg-gray-700 shrink-0 overflow-hidden">
                    <img
                      src={getProductImageSrc(surpriseProduct.image_url, surpriseProduct.category, surpriseProduct.id, surpriseProduct.name)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{surpriseProduct.name}</p>
                    <p className="text-sm text-primary font-medium mt-1">{formatPrice(surpriseProduct.price)}</p>
                    <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-2">
                      View product
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
              <div className="px-4 pb-4">
                <Button variant="outline" size="sm" className="w-full" onClick={handleSurpriseMeClick} disabled={surpriseLoading}>
                  {surpriseLoading ? "Finding another…" : "Surprise me again"}
                </Button>
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
