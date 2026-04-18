"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, ShoppingCart, Sparkles, Heart, Eye } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn, formatPrice } from "@/lib/utils";
import { getProductImageSrc, getProductImagePlaceholder } from "@/lib/unsplash";
import { isWishlisted, toggleWishlistId } from "@/lib/wishlist";
import type { Product } from "@/lib/api";

type HighlightBadge = "best_match" | "value" | "trending" | "popular" | null;

const BADGE_CONFIG: Record<NonNullable<HighlightBadge>, { label: string; className: string; why: string }> = {
  best_match: { label: "Best match", className: "pill-ai-best", why: "Aura AI ranked this highest for you based on signals we have." },
  value: { label: "Best value", className: "pill-ai-value", why: "Strong rating and price compared to similar items." },
  trending: { label: "Trending", className: "pill-ai-trending", why: "Popular with shoppers in the last few days." },
  popular: { label: "Popular", className: "pill-ai-value", why: "Highly reviewed and often purchased." },
};

function ProductImage({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const [src, setSrc] = useState(() =>
    getProductImageSrc(product.image_url, product.category, product.id, product.name, product.thumbnail_url)
  );

  useEffect(() => {
    setSrc(getProductImageSrc(product.image_url, product.category, product.id, product.name, product.thumbnail_url));
  }, [product.id, product.image_url, product.category, product.name, product.thumbnail_url]);

  return (
    <img
      src={src}
      alt={product.name}
      className={className}
      loading="lazy"
      onError={() => {
        if (product.thumbnail_url && src !== product.thumbnail_url) {
          setSrc(product.thumbnail_url);
        } else {
          setSrc(getProductImagePlaceholder(product.name));
        }
      }}
    />
  );
}

export function ProductCard({
  product,
  badge = null,
  sellingFast: _sellingFast = false,
  onAddToCart,
  sessionId: _sessionId,
  trackClick,
}: {
  product: Product;
  badge?: HighlightBadge;
  sellingFast?: boolean;
  onAddToCart?: (productId: string) => void;
  sessionId?: string;
  trackClick?: (productId: string) => void;
}) {
  const [wishlisted, setWishlisted] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  useEffect(() => {
    setWishlisted(isWishlisted(product.id));
  }, [product.id]);

  const handleClick = () => {
    trackClick?.(product.id);
  };

  const badgeConfig = badge ? BADGE_CONFIG[badge] : null;

  const lowStock =
    product.stock_count != null && product.stock_count > 0 && product.stock_count < 10;
  const showFireTrending = product.rating > 4.5;
  const showPopular = product.review_count >= 220 && product.rating >= 4.2 && product.rating <= 4.55;

  const onWishClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlisted(toggleWishlistId(product.id));
  };

  const onQuickClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickOpen(true);
  };

  return (
    <div className="h-full">
      <Card
        className={cn(
          "overflow-hidden group h-full flex flex-col rounded-2xl sm:rounded-3xl",
          "border-2 border-[#521109]/18 dark:border-brand-logo-red/30",
          "bg-gradient-to-b from-[#fffdfb] via-[#faf7f4] to-brand-concrete-light/65",
          "dark:from-[#181210] dark:via-[#14100e] dark:to-[#0c0a09]",
          "shadow-md shadow-[#521109]/8 hover:shadow-xl hover:shadow-[#D3072A]/14",
          "hover:border-[#D3072A]/45 hover:-translate-y-1",
          "transition-all duration-300 backdrop-blur-[2px]"
        )}
      >
        <div className="relative">
          <Link href={`/products/${product.id}`} onClick={handleClick} className="block">
            <div className="aspect-square bg-gradient-to-b from-[#521109]/[0.06] to-muted/40 relative overflow-hidden ring-1 ring-inset ring-[#D3072A]/15">
              <ProductImage
                product={product}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
              />
              <div className="absolute top-3 left-3 right-14 z-[1] flex flex-wrap gap-1.5 max-w-[calc(100%-3rem)]">
                {badgeConfig && (
                  <span
                    title={badgeConfig.why}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-bold text-white shadow-lg",
                      badgeConfig.className
                    )}
                  >
                    <Sparkles className="h-3 w-3 shrink-0" />
                    <span className="truncate">{badgeConfig.label}</span>
                  </span>
                )}
                {showFireTrending && (
                  <span className="inline-flex items-center rounded-full bg-orange-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                    🔥 Trending
                  </span>
                )}
                {showPopular && !showFireTrending && (
                  <span className="inline-flex items-center rounded-full bg-violet-600/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                    ⭐ Popular
                  </span>
                )}
              </div>
              {lowStock && (
                <span
                  className="absolute top-3 right-3 z-[1] rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-md max-w-[46%] text-center leading-tight"
                  title="Low stock"
                >
                  ⚡ Only few left
                </span>
              )}
            </div>
          </Link>
          <div className="absolute bottom-2 right-2 z-[2] flex gap-1.5">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-lg bg-white/95 shadow-md border border-[#521109]/20 hover:bg-brand-concrete-light hover:border-[#D3072A]/35"
              aria-label="Quick view"
              onClick={onQuickClick}
            >
              <Eye className="h-4 w-4 text-[#521109]" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-lg bg-white/95 shadow-md border border-[#521109]/20 hover:bg-brand-concrete-light hover:border-[#D3072A]/35"
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              onClick={onWishClick}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  wishlisted ? "fill-brand-logo-red text-brand-logo-red" : "text-brand-ink"
                )}
              />
            </Button>
          </div>
        </div>
        <CardContent className="p-4 sm:p-5 flex-1 flex flex-col min-w-0 gap-1">
          <Link href={`/products/${product.id}`} onClick={handleClick}>
            <p className="font-semibold text-sm sm:text-base line-clamp-2 text-[#521109] dark:text-brand-concrete-light group-hover:text-[#D3072A] transition-colors leading-snug text-left">
              {product.name}
            </p>
          </Link>
          <p className="text-[#521109]/70 dark:text-brand-concrete/75 text-xs mt-0.5 truncate text-left font-medium">
            {product.category}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <Star className="h-4 w-4 fill-brand-logo-red text-brand-logo-red shrink-0" />
            <span className="text-xs font-semibold">{product.rating}</span>
            <span className="text-xs text-muted-foreground">({product.review_count})</span>
          </div>
          {product.compare_at_price != null && product.compare_at_price > product.price ? (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mt-3">
              <span className="line-through text-muted-foreground text-sm font-medium">
                {formatPrice(product.compare_at_price)}
              </span>
              <span className="font-bold text-primary text-lg">{formatPrice(product.price)}</span>
              {product.discount_percent != null ? (
                <span className="text-[11px] font-bold rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5">
                  {product.discount_percent}% off
                </span>
              ) : null}
            </div>
          ) : (
            <p className="font-bold text-primary text-lg mt-3 text-left">{formatPrice(product.price)}</p>
          )}
        </CardContent>
        <CardFooter className="p-4 sm:p-5 pt-0">
          <Button
            size="sm"
            className="w-full rounded-xl font-bold bg-brand-logo-red hover:bg-brand-logo-red/90 text-white shadow-lg shadow-brand-logo-red/20"
            onClick={(e) => {
              e.preventDefault();
              onAddToCart?.(product.id);
            }}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to cart
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent className="max-w-sm text-left">
          <DialogTitle className="font-heading text-brand-dark-red dark:text-brand-concrete-light pr-8">{product.name}</DialogTitle>
          <div className="relative aspect-square rounded-xl overflow-hidden bg-muted mt-2">
            <ProductImage product={product} className="w-full h-full object-cover" />
          </div>
          <p className="text-sm text-muted-foreground">{product.category}</p>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-brand-logo-red text-brand-logo-red" />
            <span className="text-sm font-bold">{product.rating}</span>
            <span className="text-sm text-muted-foreground">({product.review_count} reviews)</span>
          </div>
          {product.compare_at_price != null && product.compare_at_price > product.price ? (
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="line-through text-muted-foreground">{formatPrice(product.compare_at_price)}</span>
              <p className="font-heading text-2xl font-bold text-primary">{formatPrice(product.price)}</p>
            </div>
          ) : (
            <p className="font-heading text-2xl font-bold text-primary">{formatPrice(product.price)}</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button className="flex-1 font-bold" asChild>
              <Link href={`/products/${product.id}`} onClick={() => setQuickOpen(false)}>
                View full details
              </Link>
            </Button>
            <Button
              variant="outline"
              className="font-bold border-brand-logo-red/40"
              onClick={() => {
                setQuickOpen(false);
                onAddToCart?.(product.id);
              }}
            >
              Add to cart
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
