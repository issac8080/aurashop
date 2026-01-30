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
    <div className="sticky top-0 z-50 w-full bg-amber-500/90 text-amber-950 px-4 py-2 text-center text-sm font-medium shadow-sm">
      <span className="inline-flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Backend not running — recommendations and cart need the API. Run:{" "}
        <code className="rounded bg-amber-600/30 px-1.5 py-0.5 font-mono text-xs">
          cd backend && uvicorn app.main:app --reload --port 8000
        </code>
      </span>
    </div>
  );
}
