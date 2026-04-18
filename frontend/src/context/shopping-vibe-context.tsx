"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useShoppingVibeAudio } from "@/hooks/useShoppingVibeAudio";
import { getShoppingVibeUrls, type ShoppingVibeMode } from "@/lib/shopping-vibe-urls";

const SHOPPING_VIBE_MODE_KEY = "aurashop-shopping-vibe-mode";

function readStoredVibeMode(): ShoppingVibeMode {
  if (typeof window === "undefined") return "chill";
  try {
    const v = localStorage.getItem(SHOPPING_VIBE_MODE_KEY);
    if (v === "chill" || v === "energetic" || v === "calm") return v;
  } catch {
    /* ignore */
  }
  return "chill";
}

export type ShoppingVibeContextValue = {
  shoppingVibeOn: boolean;
  setShoppingVibeOn: Dispatch<SetStateAction<boolean>>;
  toggleShoppingVibe: () => void;
  shoppingVibeMode: ShoppingVibeMode;
  setShoppingVibeModePersist: (m: ShoppingVibeMode) => void;
};

const ShoppingVibeContext = createContext<ShoppingVibeContextValue | null>(null);

export function ShoppingVibeProvider({ children }: { children: ReactNode }) {
  const [shoppingVibeOn, setShoppingVibeOn] = useState(false);
  const [shoppingVibeMode, setShoppingVibeMode] = useState<ShoppingVibeMode>("chill");
  const vibeUrls = useMemo(() => getShoppingVibeUrls(), []);

  useEffect(() => {
    setShoppingVibeMode(readStoredVibeMode());
  }, []);

  const setShoppingVibeModePersist = useCallback((m: ShoppingVibeMode) => {
    setShoppingVibeMode(m);
    try {
      localStorage.setItem(SHOPPING_VIBE_MODE_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);

  const handleShoppingVibePlaybackFailed = useCallback(() => {
    setShoppingVibeOn(false);
  }, []);

  const toggleShoppingVibe = useCallback(() => {
    setShoppingVibeOn((v) => !v);
  }, []);

  useShoppingVibeAudio({
    panelOpen: true,
    enabled: shoppingVibeOn,
    mode: shoppingVibeMode,
    urls: vibeUrls,
    onPlaybackFailed: handleShoppingVibePlaybackFailed,
  });

  const value = useMemo(
    () => ({
      shoppingVibeOn,
      setShoppingVibeOn,
      toggleShoppingVibe,
      shoppingVibeMode,
      setShoppingVibeModePersist,
    }),
    [shoppingVibeOn, shoppingVibeMode, setShoppingVibeModePersist, toggleShoppingVibe]
  );

  return <ShoppingVibeContext.Provider value={value}>{children}</ShoppingVibeContext.Provider>;
}

export function useShoppingVibe() {
  const ctx = useContext(ShoppingVibeContext);
  if (!ctx) throw new Error("useShoppingVibe must be used within ShoppingVibeProvider");
  return ctx;
}
