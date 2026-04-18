"use client";

import { ShoppingBasket, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoreMode } from "@/lib/api";

type Props = {
  value: StoreMode;
  onChange: (mode: StoreMode) => void;
  className?: string;
  /** Compact for header; full width is default. */
  compact?: boolean;
};

/**
 * Instamart-style store switch: groceries vs everything else (no mixing).
 */
export function StoreModeToggle({ value, onChange, className, compact }: Props) {
  return (
    <div
      className={cn(
        "inline-flex rounded-2xl p-1 gap-0.5",
        compact ? "w-auto max-w-none py-0.5 px-0.5" : "w-full max-w-md",
        "bg-white/50 dark:bg-black/40 border border-[#521109]/15 dark:border-white/10",
        "shadow-[inset_0_1px_2px_rgba(82,17,9,0.06)] backdrop-blur-sm",
        className
      )}
      role="tablist"
      aria-label="Store type"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "general"}
        onClick={() => onChange("general")}
        className={cn(
          "flex-1 flex items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-all duration-200",
          compact ? "py-1.5 px-2" : "py-2.5 px-3",
          value === "general"
            ? "bg-gradient-to-r from-[#521109] to-[#D3072A] text-white shadow-md shadow-[#521109]/20"
            : "text-brand-ink/75 dark:text-brand-concrete/80 hover:bg-white/70 dark:hover:bg-white/5"
        )}
      >
        <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 opacity-90" />
        <span className="truncate">{compact ? "Aura" : "Fashion & more"}</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "groceries"}
        onClick={() => onChange("groceries")}
        className={cn(
          "flex-1 flex items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-all duration-200",
          compact ? "py-1.5 px-2" : "py-2.5 px-3",
          value === "groceries"
            ? "bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] text-white shadow-md shadow-[#1B5E20]/20"
            : "text-brand-ink/75 dark:text-brand-concrete/80 hover:bg-white/70 dark:hover:bg-white/5"
        )}
      >
        <ShoppingBasket className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 opacity-90" />
        <span className="truncate">Groceries</span>
      </button>
    </div>
  );
}
