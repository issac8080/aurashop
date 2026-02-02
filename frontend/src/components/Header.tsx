"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingBag, ShoppingCart, User, Wallet, Menu, X, LogIn, LogOut, Tag, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { Dialog } from "@/components/ui/dialog";
import { NotificationDialogContent } from "@/components/NotificationDialog";
import { useCart, useAuth } from "@/app/providers";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/discounts", label: "Discounts", icon: Tag },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/profile", label: "Profile", icon: User },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { cartCount } = useCart();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationCount = (cartCount != null && cartCount > 0 ? 1 : 0) + 1; // cart + out-of-stock

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full relative bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-b border-gray-200/80 dark:border-white/10 shadow-sm">
      {/* Top accent bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex h-16 sm:h-[4.5rem] items-center justify-between gap-4">
          {/* Logo - clear and prominent */}
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="group flex items-center gap-3 shrink-0 min-w-0"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-600 text-white shadow-lg shadow-teal-500/25 ring-2 ring-white/30 dark:ring-white/10 transition-all duration-200 group-hover:shadow-teal-500/35 group-hover:scale-[1.02]">
              <ShoppingCart className="h-6 w-6" />
            </span>
            <span className="font-heading font-bold text-xl sm:text-2xl tracking-tight text-gray-900 dark:text-white truncate">
              AuraShop
            </span>
          </Link>

          {/* Desktop search - centered, spacious */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="w-full rounded-2xl bg-gray-100/90 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 shadow-inner focus-within:border-teal-400/60 focus-within:ring-2 focus-within:ring-teal-400/20 transition-all duration-200 [&_input]:border-0 [&_input]:bg-transparent [&_input]:focus-visible:ring-0 [&_input]:rounded-2xl [&_input]:py-2.5">
              <SearchBar className="w-full" />
            </div>
          </div>

          {/* Desktop nav - clean pills */}
          <nav className="hidden lg:flex items-center gap-2">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link key={href} href={href}>
                  <span
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                      isActive
                        ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-400/25 shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 border border-transparent"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    {label}
                  </span>
                </Link>
              );
            })}
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 ml-1"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            ) : (
              <Link href="/login" className="ml-1">
                <span className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-400/25 hover:bg-teal-500/20 transition-all duration-200">
                  <LogIn className="h-4 w-4" />
                  Login
                </span>
              </Link>
            )}
          </nav>

          {/* Right: Wallet, Profile (mobile), Cart, Menu */}
          <div className="flex items-center gap-2">
            <Link href="/wallet" className="lg:hidden" title="Wallet">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-xl text-gray-600 dark:text-gray-400 hover:text-teal-600 hover:bg-teal-500/10 dark:hover:bg-teal-500/20"
              >
                <Wallet className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/profile" className="lg:hidden" title="Profile">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-xl text-gray-600 dark:text-gray-400 hover:text-teal-600 hover:bg-teal-500/10 dark:hover:bg-teal-500/20"
              >
                <User className="h-5 w-5" />
              </Button>
            </Link>
            <Dialog open={notificationOpen} onOpenChange={setNotificationOpen}>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-11 w-11 rounded-xl text-gray-600 dark:text-gray-400 hover:text-teal-600 hover:bg-teal-500/10 dark:hover:bg-teal-500/20"
                onClick={() => setNotificationOpen(true)}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-teal-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
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
                className="relative h-11 w-11 rounded-xl text-gray-600 dark:text-gray-400 hover:text-teal-600 hover:bg-teal-500/10 dark:hover:bg-teal-500/20 transition-all duration-200"
              >
                <ShoppingBag className="h-5 w-5" />
                {cartCount != null && cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[1.35rem] h-5 px-1.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-md">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-11 w-11 rounded-xl text-gray-600 dark:text-gray-400 hover:text-teal-600 hover:bg-teal-500/10 transition-all duration-200"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile search - full width under main row */}
        <div className="md:hidden border-t border-gray-200/80 dark:border-white/10 px-4 py-3 bg-gray-50/80 dark:bg-white/[0.02]">
          <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm [&_input]:py-2.5">
            <SearchBar />
          </div>
        </div>
      </div>

      {/* Mobile menu - full-width panel */}
      {mobileOpen && (
        <div className="lg:hidden absolute left-0 right-0 top-full border-t border-gray-200 dark:border-white/10 bg-white dark:bg-gray-950 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <nav className="container mx-auto px-4 py-5 flex flex-col gap-1 max-w-7xl">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-4 rounded-xl px-4 py-4 text-base font-semibold transition-all duration-200",
                    isActive
                      ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-400/25"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                  )}
                >
                  {Icon && (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10">
                      <Icon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </span>
                  )}
                  {label}
                </Link>
              );
            })}
            <div className="border-t border-gray-200 dark:border-white/10 my-2" />
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-4 rounded-xl px-4 py-4 text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 w-full text-left transition-all duration-200"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10">
                  <LogOut className="h-5 w-5 text-red-500" />
                </span>
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-4 rounded-xl px-4 py-4 text-base font-semibold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-400/25 hover:bg-teal-500/20 transition-all duration-200"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/20">
                  <LogIn className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </span>
                Login
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
