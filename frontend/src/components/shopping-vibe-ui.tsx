"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ShoppingVibeMode } from "@/lib/shopping-vibe-urls";

export const SHOPPING_VIBE_MODES = [
  { id: "chill" as const, label: "Chill" },
  { id: "energetic" as const, label: "Energetic" },
  { id: "calm" as const, label: "Calm" },
];

/** Music on/off + second segment opens mood (Chill / Energetic / Calm). */
export function ShoppingVibeSplitControl({
  isOn,
  onToggle,
  mode,
  onChangeMode,
  variant,
  className,
}: {
  isOn: boolean;
  onToggle: () => void;
  mode: ShoppingVibeMode;
  onChangeMode: (m: ShoppingVibeMode) => void;
  variant: "header" | "chat";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const isChat = variant === "chat";

  return (
    <div ref={wrapRef} className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "flex h-11 items-stretch overflow-hidden rounded-xl border shadow-sm",
          isChat
            ? "border-white/20 bg-white/10"
            : isOn
              ? "border-transparent bg-g10x-gradient text-white"
              : "border-brand-concrete/55 bg-white/95 dark:border-white/15 dark:bg-brand-ink/95"
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={isOn}
          aria-label={isOn ? "Turn shopping music off" : "Turn shopping music on"}
          title={isOn ? "Music on — tap to turn off" : "Music off — tap to turn on"}
          className={cn(
            "flex items-center gap-2 px-3 sm:px-3.5 text-left transition-opacity hover:opacity-95",
            isChat ? "text-white" : isOn ? "text-white" : "text-brand-ink dark:text-brand-concrete-light"
          )}
        >
          <Headphones className="h-5 w-5 shrink-0" aria-hidden />
          <span className="hidden sm:inline text-[11px] font-bold tracking-tight">Music</span>
        </button>
        <div
          className={cn(
            "w-px shrink-0 self-stretch my-2",
            isChat ? "bg-white/25" : isOn ? "bg-white/35" : "bg-brand-concrete/40 dark:bg-white/20"
          )}
          aria-hidden
        />
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Change music style"
          title="Music style"
          onClick={() => {
            setOpen((o) => !o);
            if (!isOn) onToggle();
          }}
          className={cn(
            "flex items-center justify-center px-2.5 min-w-[2.5rem] transition-colors",
            isChat
              ? "text-white/90 hover:bg-white/10"
              : isOn
                ? "text-white hover:bg-white/10"
                : "text-brand-ink hover:bg-brand-logo-red/10 dark:text-brand-concrete-light dark:hover:bg-white/10"
          )}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open && (
        <ul
          role="listbox"
          className={cn(
            "absolute right-0 top-[calc(100%+6px)] z-[60] min-w-[10rem] rounded-xl border py-1 shadow-lg",
            isChat
              ? "border-white/15 bg-brand-ink text-white"
              : "border-brand-concrete/60 bg-white dark:border-white/15 dark:bg-brand-ink dark:text-brand-concrete-light"
          )}
        >
          {SHOPPING_VIBE_MODES.map(({ id, label }) => (
            <li key={id}>
              <button
                type="button"
                role="option"
                aria-selected={mode === id}
                onClick={() => {
                  onChangeMode(id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-xs font-bold transition-colors",
                  mode === id
                    ? isChat
                      ? "bg-white/15 text-white"
                      : "bg-brand-logo-red/10 text-brand-dark-red dark:bg-brand-logo-red/20 dark:text-white"
                    : isChat
                      ? "hover:bg-white/10 text-white/90"
                      : "hover:bg-brand-concrete/30 dark:hover:bg-white/10"
                )}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Tap on → music on, tap again → off. */
export function ShoppingVibeToggleButton({
  isOn,
  onToggle,
  variant,
  className,
}: {
  isOn: boolean;
  onToggle: () => void;
  variant: "header" | "chat";
  className?: string;
}) {
  if (variant === "chat") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-pressed={isOn}
        aria-label={isOn ? "Turn shopping music off" : "Turn shopping music on"}
        onClick={onToggle}
        className={cn(
          "rounded-full h-9 w-9 shrink-0 border transition-colors",
          isOn
            ? "border-transparent bg-g10x-gradient text-white shadow-md hover:opacity-95"
            : "border-white/15 text-white/75 hover:text-white hover:bg-white/10 bg-white/5",
          className
        )}
      >
        <Headphones className="h-4 w-4" aria-hidden />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onToggle}
      aria-pressed={isOn}
      aria-label={isOn ? "Turn shopping music off" : "Turn shopping music on"}
      title={isOn ? "Music on — tap to turn off" : "Music off — tap to turn on"}
      className={cn(
        "h-11 shrink-0 rounded-xl border px-2.5 sm:px-3 transition-colors gap-2",
        isOn
          ? "border-transparent bg-g10x-gradient text-white shadow-sm hover:opacity-95"
          : "border-brand-concrete/55 bg-white/95 text-brand-ink hover:border-brand-logo-red/40 hover:bg-brand-logo-red/10 dark:border-white/15 dark:bg-brand-ink/95 dark:text-brand-concrete-light dark:hover:bg-brand-logo-red/15",
        className
      )}
    >
      <Headphones className="h-5 w-5 shrink-0" aria-hidden />
      <span className="hidden sm:inline text-[11px] font-bold tracking-tight">Music</span>
    </Button>
  );
}

/** Shown only while music is on — pick mood without a second “power” control. */
export function ShoppingVibeMoodStrip({
  mode,
  onChange,
  variant,
  className,
}: {
  mode: ShoppingVibeMode;
  onChange: (m: ShoppingVibeMode) => void;
  variant: "header" | "chat";
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Music mood"
      className={cn("flex flex-wrap items-center justify-end gap-1 sm:gap-1.5", className)}
    >
      {SHOPPING_VIBE_MODES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={mode === id}
          onClick={() => onChange(id)}
          className={cn(
            "rounded-lg px-2 sm:px-2.5 py-1 text-[10px] font-bold tracking-wide transition-colors border min-w-0",
            mode === id
              ? "border-transparent bg-g10x-gradient text-white shadow-sm"
              : variant === "chat"
                ? "border-brand-concrete/40 bg-brand-concrete/15 text-brand-concrete-light hover:bg-white/10"
                : "border-brand-concrete/50 bg-white/80 text-brand-ink hover:bg-brand-concrete-light/90 dark:border-white/12 dark:bg-white/10 dark:text-brand-concrete-light dark:hover:bg-white/15"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
