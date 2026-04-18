"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart, useAuth } from "@/app/providers";
import { cn } from "@/lib/utils";
import { getReturnStatusDisplay, type ReturnOrderSummary } from "@/lib/return-tracking";

const API = "/api";

type OrderRow = { id: string };

function hasStoredAuraUser(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!localStorage.getItem("aura_user");
  } catch {
    return false;
  }
}

export default function ReturnsTrackingPage() {
  const router = useRouter();
  const { sessionId } = useCart();
  const { user: authUser } = useAuth();
  const userId = authUser?.email ?? sessionId ?? "";

  const [returns, setReturns] = useState<ReturnOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authUser) return;
    if (!hasStoredAuraUser()) {
      router.replace("/login?from=/returns/tracking");
    }
  }, [authUser, router]);

  useEffect(() => {
    if (!authUser) return;

    async function load() {
      setLoading(true);
      try {
        const ordersRes = await fetch(`${API}/users/${userId}/orders`);
        const ordersJson = await ordersRes.json().catch(() => ({}));
        const orderList: OrderRow[] = Array.isArray(ordersJson?.orders) ? ordersJson.orders : [];

        const results = await Promise.allSettled(
          orderList.map(async (o) => {
            const r = await fetch(`${API}/returns/order/${encodeURIComponent(o.id)}`);
            if (!r.ok) return null;
            const data = (await r.json().catch(() => null)) as ReturnOrderSummary | null;
            return data?.id ? data : null;
          })
        );

        const list: ReturnOrderSummary[] = [];
        for (const p of results) {
          if (p.status === "fulfilled" && p.value) list.push(p.value);
        }
        list.sort((a, b) => {
          const ta = new Date(b.updated_at || b.created_at || 0).getTime();
          const tb = new Date(a.updated_at || a.created_at || 0).getTime();
          return ta - tb;
        });
        setReturns(list);
      } catch {
        setReturns([]);
      } finally {
        setLoading(false);
      }
    }

    if (userId) load();
    else setLoading(false);
  }, [authUser, userId, router]);

  if (!authUser) {
    if (hasStoredAuraUser()) {
      return (
        <div className="py-24 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-brand-logo-red border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="py-6 sm:py-10 max-w-3xl mx-auto space-y-6 text-left">
      <div className="flex items-center gap-3">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-xl" aria-label="Back to profile">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-brand-dark-red dark:text-brand-concrete-light">
            Returns & Refunds
          </h1>
          <p className="text-sm text-brand-ink/70 dark:text-brand-concrete/80 mt-0.5">
            Track your return requests — status is managed by our team.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center rounded-2xl border-2 border-brand-concrete/60 dark:border-white/10 bg-white dark:bg-brand-ink/50">
          <div className="animate-spin h-8 w-8 border-4 border-brand-logo-red border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-sm text-brand-ink/65 dark:text-brand-concrete/80">Loading returns…</p>
        </div>
      ) : returns.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-2xl border-2 border-dashed border-brand-concrete dark:border-white/15 bg-brand-concrete-light/40 dark:bg-white/5">
            <CardContent className="py-14 px-6 text-center space-y-4">
              <Package className="h-14 w-14 mx-auto text-brand-ink/35 dark:text-brand-concrete/40" />
              <p className="font-heading font-bold text-brand-dark-red dark:text-brand-concrete-light">No returns yet</p>
              <p className="text-sm text-brand-ink/70 dark:text-brand-concrete/80 max-w-sm mx-auto">
                When you start a return from a delivered order, it will show up here.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <Button asChild className="rounded-xl bg-brand-logo-red hover:bg-brand-logo-red/90 text-white font-bold">
                  <Link href="/profile">Back to profile</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl border-brand-logo-red/40 font-bold">
                  <Link href="/products">Continue shopping</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <ul className="space-y-4">
          {returns.map((r, i) => {
            const disp = getReturnStatusDisplay(r.status);
            const productName = r.order?.product_name || "Product";
            return (
              <motion.li
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="rounded-2xl border-2 border-brand-concrete/70 dark:border-white/10 bg-white dark:bg-brand-ink/80 shadow-md overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <CardTitle className="text-base font-bold text-brand-ink dark:text-brand-concrete-light leading-snug">
                        {productName}
                      </CardTitle>
                      <Badge variant="outline" className={cn("rounded-lg text-xs shrink-0", disp.className)}>
                        {disp.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="text-xs sm:text-sm text-brand-ink/65 dark:text-brand-concrete/80 space-y-1 font-mono">
                      <p>
                        <span className="text-brand-ink/50 dark:text-brand-concrete/55">Order</span>{" "}
                        <span className="font-semibold text-brand-ink dark:text-brand-concrete-light">{r.order_id}</span>
                      </p>
                      <p>
                        <span className="text-brand-ink/50 dark:text-brand-concrete/55">Return ID</span>{" "}
                        <span className="font-semibold text-brand-ink dark:text-brand-concrete-light">#{r.id}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" className="rounded-xl bg-brand-logo-red hover:bg-brand-logo-red/90 text-white font-bold">
                        <Link href={`/returns/${r.id}`}>View details</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="rounded-xl font-bold border-brand-concrete">
                        <Link href={`/orders/${r.order_id}`}>View order</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.li>
            );
          })}
        </ul>
      )}

      {!loading && returns.length > 0 && (
        <p className="text-xs text-center text-brand-ink/55 dark:text-brand-concrete/60">
          Need to start a return? Open a <RefreshCw className="inline h-3 w-3 align-text-bottom" /> return from a delivered order.
        </p>
      )}
    </div>
  );
}
