"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { StoreMode } from "@/lib/api";

const STORAGE_KEY = "aurashop_store_mode_v2";

type Ctx = {
  storeMode: StoreMode;
  setStoreMode: (m: StoreMode) => void;
  isGroceries: boolean;
};

const StoreModeContext = createContext<Ctx | null>(null);

const LEGACY_GROCKEY = "aurashop_home_grocery_mode";

function readMode(): StoreMode {
  if (typeof window === "undefined") return "general";
  try {
    const v2 = sessionStorage.getItem(STORAGE_KEY);
    if (v2 === "groceries" || v2 === "general") return v2;
    if (sessionStorage.getItem(LEGACY_GROCKEY) === "1") {
      sessionStorage.setItem(STORAGE_KEY, "groceries");
      return "groceries";
    }
    return "general";
  } catch {
    return "general";
  }
}

export function StoreModeProvider({ children }: { children: React.ReactNode }) {
  const [storeMode, setStoreModeState] = useState<StoreMode>("general");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStoreModeState(readMode());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, storeMode);
    } catch {
      // ignore
    }
  }, [storeMode, ready]);

  const setStoreMode = useCallback((m: StoreMode) => {
    setStoreModeState(m);
  }, []);

  const value = useMemo(
    () => ({
      storeMode,
      setStoreMode,
      isGroceries: storeMode === "groceries",
    }),
    [storeMode, setStoreMode]
  );

  return <StoreModeContext.Provider value={value}>{children}</StoreModeContext.Provider>;
}

export function useStoreMode() {
  const c = useContext(StoreModeContext);
  if (!c) throw new Error("useStoreMode must be used within StoreModeProvider");
  return c;
}

/** Safe when provider might be absent (e.g. Storybook) — default general. */
export function useStoreModeOptional(): Ctx | null {
  return useContext(StoreModeContext);
}
