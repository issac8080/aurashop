"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Wallet, Menu, X, Tag, Bell, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { Dialog } from "@/components/ui/dialog";
import { NotificationDialogContent } from "@/components/NotificationDialog";
import { useCart, useAuth } from "@/app/providers";
import { useStoreMode } from "@/context/store-mode-context";
import { useShoppingVibe } from "@/context/shopping-vibe-context";
import { StoreModeToggle } from "@/components/StoreModeToggle";
import { ShoppingVibeSplitControl } from "@/components/shopping-vibe-ui";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/discounts", label: "Discounts", icon: Tag },
  { href: "/wallet", label: "Wallet", icon: Wallet },
];

export function Header() {
  const pathname = usePathname();
  const { cartCount } = useCart();
  const { user } = useAuth();
  const { storeMode, setStoreMode, isGroceries } = useStoreMode();
  const { shoppingVibeOn, setShoppingVibeOn, shoppingVibeMode, setShoppingVibeModePersist } =
    useShoppingVibe();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationCount = (cartCount != null && cartCount > 0 ? 1 : 0) + 1; // cart + out-of-stock

  const openChat = (m?: string) => window.dispatchEvent(new CustomEvent("open-aurashop-chat", { detail: { initialMessage: m } }));

  const userInitial = user
    ? (user.name || "").trim()
      ? (user.name || "").trim()[0]!.toUpperCase()
      : (user.email || "?")[0]!.toUpperCase()
    : null;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full relative aura-header-glass",
        isGroceries && "aura-header--grocery"
      )}
    >
      <div
        className={cn(
          "h-0.5 w-full",
          isGroceries ? "bg-gradient-to-r from-[#1B5E20] to-[#66BB6A]" : "bg-aura-gradient"
        )}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex h-16 sm:h-[4.5rem] items-center justify-between gap-3 sm:gap-4">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="group flex items-center gap-3 shrink-0 min-w-0"
          >
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ring-2 ring-white/40 dark:ring-white/10 transition-all duration-200 group-hover:scale-[1.02]",
                isGroceries
                  ? "bg-gradient-to-br from-[#1B5E20] to-[#2E7D32] shadow-[#1B5E20]/30"
                  : "bg-brand-logo-red shadow-brand-logo-red/25 group-hover:shadow-brand-logo-red/35"
              )}
            >
              <ShoppingBag className="h-6 w-6" />
            </span>
            <span
              className={cn(
                "font-heading font-bold text-xl sm:text-2xl tracking-tight truncate",
                isGroceries ? "text-[#1B5E20] dark:text-emerald-200" : "text-brand-dark-red dark:text-brand-concrete-light"
              )}
            >
              AuraShop
            </span>
          </Link>

          <div className="hidden md:block flex-1" aria-hidden="true" />

          <div className="hidden md:flex shrink-0">
            <Button
              type="button"
              onClick={() => openChat()}
              className={cn(
                "rounded-full font-bold gap-1.5 shadow-md",
                isGroceries
                  ? "bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] hover:opacity-95 text-white"
                  : "bg-gradient-to-r from-[#521109] to-[#D3072A] hover:opacity-95 text-white"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask AI
            </Button>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link key={href} href={href}>
                  <span
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200",
                      isActive
                        ? "bg-brand-logo-red/12 text-brand-dark-red dark:text-brand-concrete-light border border-brand-logo-red/25 shadow-sm"
                        : "text-brand-ink/80 dark:text-brand-concrete/90 hover:text-brand-dark-red dark:hover:text-brand-concrete-light hover:bg-brand-concrete/25 dark:hover:bg-white/10 border border-transparent"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    {label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ShoppingVibeSplitControl
              variant="header"
              isOn={shoppingVibeOn}
              onToggle={() => setShoppingVibeOn((v) => !v)}
              mode={shoppingVibeMode}
              onChangeMode={setShoppingVibeModePersist}
            />
            {user && userInitial ? (
              <Link
                href="/profile"
                title="Profile"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full font-heading text-sm sm:text-base font-extrabold text-white shadow-md border-2 border-white/40 dark:border-white/20 ring-1 ring-black/5 hover:opacity-95 transition-opacity",
                  isGroceries
                    ? "bg-gradient-to-br from-[#1B5E20] to-[#2E7D32]"
                    : "bg-gradient-to-br from-[#521109] to-[#D3072A]"
                )}
              >
                {userInitial}
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="shrink-0 rounded-full px-3.5 py-2 text-xs sm:text-sm font-extrabold border-2 border-brand-logo-red/40 text-brand-dark-red dark:text-brand-concrete-light bg-brand-logo-red/10 hover:bg-brand-logo-red/20 transition-colors whitespace-nowrap"
              >
                Login / Sign up
              </Link>
            )}
            <Dialog open={notificationOpen} onOpenChange={setNotificationOpen}>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-11 w-11 rounded-xl text-brand-ink/75 dark:text-brand-concrete/90 hover:text-brand-logo-red hover:bg-brand-logo-red/10 dark:hover:bg-brand-logo-red/15"
                onClick={() => setNotificationOpen(true)}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-brand-logo-red text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-brand-concrete-light dark:ring-brand-ink">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </Button>
              <NotificationDialogContent />
            </Dialog>
            <Link href="/cart" className="relative" title="Cart">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-11 w-11 rounded-xl text-brand-ink/75 dark:text-brand-concrete/90 hover:text-brand-logo-red hover:bg-brand-logo-red/10 dark:hover:bg-brand-logo-red/15 transition-all duration-200"
              >
                <ShoppingBag className="h-5 w-5" />
                {cartCount != null && cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[1.35rem] h-5 px-1.5 rounded-full bg-brand-dark-red text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-brand-concrete-light dark:ring-brand-ink shadow-md">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-11 w-11 rounded-xl text-brand-ink/75 dark:text-brand-concrete/90 hover:text-brand-logo-red hover:bg-brand-logo-red/10 transition-all duration-200"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-stretch sm:gap-3 gap-2 py-2.5 border-t border-white/25 dark:border-white/5">
          <StoreModeToggle
            value={storeMode}
            onChange={setStoreMode}
            compact
            className="w-full sm:w-auto sm:max-w-[min(20rem,100%)] sm:shrink-0"
          />
          <div
            className={cn(
              "aura-nav-glass flex-1 min-w-0 rounded-2xl focus-within:ring-2 transition-all duration-200 [&_input]:border-0 [&_input]:bg-transparent [&_input]:focus-visible:ring-0 [&_input]:rounded-2xl [&_input]:py-2.5",
              isGroceries
                ? "focus-within:ring-[#2E7D32]/25"
                : "focus-within:ring-brand-logo-red/15"
            )}
          >
            <SearchBar className="w-full" />
          </div>
        </div>

      </div>

      {mobileOpen && (
        <div className="md:hidden absolute left-0 right-0 top-full border-t border-brand-concrete/50 dark:border-white/10 bg-brand-concrete-light dark:bg-brand-ink shadow-xl animate-in slide-in-from-top-2 duration-200 max-h-[min(70vh,calc(100dvh-5rem))] overflow-y-auto overscroll-contain">
          <nav className="container mx-auto px-4 py-5 flex flex-col gap-1 max-w-7xl">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-4 rounded-xl px-4 py-4 text-base font-bold transition-all duration-200 text-left",
                    isActive
                      ? "bg-brand-logo-red/12 text-brand-dark-red dark:text-brand-concrete-light border border-brand-logo-red/25"
                      : "text-brand-ink dark:text-brand-concrete-light hover:bg-brand-concrete/30 dark:hover:bg-white/10"
                  )}
                >
                  {Icon && (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-concrete/40 dark:bg-white/10">
                      <Icon className="h-5 w-5 text-brand-logo-red dark:text-brand-concrete-light" />
                    </span>
                  )}
                  {label}
                </Link>
              );
            })}
            <div className="border-t border-brand-concrete/50 dark:border-white/10 my-2" />
            <p className="px-1 text-sm text-brand-ink/60 dark:text-brand-concrete/70">
              {user ? (
                <>
                  Account: open your <Link href="/profile" className="font-bold text-brand-dark-red" onClick={() => setMobileOpen(false)}>profile</Link> to sign out and manage details.
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="font-bold text-brand-dark-red">Login or sign up</Link> to see orders and wallet in full.
                </>
              )}
            </p>
          </nav>
        </div>
      )}
    </header>
  );
}
