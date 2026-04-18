"use client";

import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";

const API = "/api";

export function BackendOfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/health`)
      .then((res) => {
        if (!cancelled) setOffline(!res.ok);
      })
      .catch(() => {
        if (!cancelled) setOffline(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-brand-dark-red text-white px-3 sm:px-4 py-2 text-center text-xs sm:text-sm font-bold shadow-sm">
      <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 max-w-full">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="min-w-0">
          Backend not running — recommendations and cart need the API. Run:{" "}
          <code className="inline rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px] sm:text-xs text-white break-all sm:break-normal">
            cd backend && uvicorn app.main:app --reload --port 8000
          </code>
        </span>
      </span>
    </div>
  );
}
