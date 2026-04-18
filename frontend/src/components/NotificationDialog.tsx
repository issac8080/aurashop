"use client";

import Link from "next/link";
import { ShoppingCart, Package, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCart } from "@/app/providers";

export function NotificationDialogContent() {
  const { cartCount } = useCart();
  const hasCartItems = cartCount != null && cartCount > 0;

  return (
    <DialogContent className="max-w-md" showClose={true}>
      <DialogTitle className="sr-only">Notifications</DialogTitle>
      <div className="space-y-3 pt-2">
        {hasCartItems && (
          <div className="rounded-2xl border-2 border-brand-logo-red/35 dark:border-brand-logo-red/40 bg-brand-concrete-light dark:bg-brand-dark-red/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-logo-red/15">
                  <ShoppingCart className="h-6 w-6 text-brand-logo-red dark:text-brand-concrete-light" />
                </div>
                <div className="text-left min-w-0">
                  <p className="font-bold text-brand-dark-red dark:text-brand-concrete-light">
                    You have {cartCount} item{cartCount !== 1 ? "s" : ""} in your cart
                  </p>
                  <p className="text-sm text-brand-ink/75 dark:text-brand-concrete/85">
                    Don&apos;t lose your cart — complete your order
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href="/cart">
                  <Button size="sm" className="bg-brand-logo-red hover:bg-brand-logo-red/90 text-white rounded-xl">
                    View cart
                  </Button>
                </Link>
                <Link href="/checkout">
                  <Button size="sm" variant="outline" className="border-brand-logo-red text-brand-dark-red dark:text-brand-concrete-light rounded-xl">
                    Checkout
                    <ChevronRight className="h-4 w-4 ml-0.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-brand-concrete dark:border-brand-concrete/50 bg-brand-concrete-light/95 dark:bg-brand-ink/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-logo-red/12">
                <Package className="h-6 w-6 text-brand-logo-red dark:text-brand-concrete-light" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-bold text-brand-ink dark:text-brand-concrete-light">
                  Out of stock at your store?
                </p>
                <p className="text-sm text-brand-ink/70 dark:text-brand-concrete/80">
                  Book online and get it delivered. Many popular items are available for delivery.
                </p>
              </div>
            </div>
            <Link href="/products" className="shrink-0">
              <Button size="sm" className="bg-brand-dark-red hover:bg-brand-dark-red/90 text-white rounded-xl">
                Book online
                <ChevronRight className="h-4 w-4 ml-0.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}
