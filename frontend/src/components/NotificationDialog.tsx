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
        {/* Cart abandonment – soft yellow / orange */}
        {hasCartItems && (
          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                  <ShoppingCart className="h-6 w-6 text-amber-700 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-100">
                    You have {cartCount} item{cartCount !== 1 ? "s" : ""} in your cart
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Don&apos;t lose your cart — complete your order
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href="/cart">
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl">
                    View cart
                  </Button>
                </Link>
                <Link href="/checkout">
                  <Button size="sm" variant="outline" className="border-amber-600 text-amber-700 dark:text-amber-300 rounded-xl">
                    Checkout
                    <ChevronRight className="h-4 w-4 ml-0.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Out of stock – book online – teal / mint */}
        <div className="rounded-2xl border border-teal-200 dark:border-teal-800 bg-teal-50/90 dark:bg-teal-950/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/20">
                <Package className="h-6 w-6 text-teal-700 dark:text-teal-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Out of stock at your store?
                </p>
                <p className="text-sm text-teal-700 dark:text-teal-300">
                  Book online and get it delivered. Many popular items are available for delivery.
                </p>
              </div>
            </div>
            <Link href="/products" className="shrink-0">
              <Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white rounded-xl">
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
