"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { getProductImage } from "@/lib/unsplash";
import type { Product } from "@/lib/api";

type BadgeType = "best_match" | "value" | "trending" | null;

export function ProductCard({
  product,
  badge = null,
  onAddToCart,
  sessionId,
  trackClick,
}: {
  product: Product;
  badge?: BadgeType;
  onAddToCart?: (productId: string) => void;
  sessionId?: string;
  trackClick?: (productId: string) => void;
}) {
  const handleClick = () => {
    trackClick?.(product.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="overflow-hidden group h-full flex flex-col">
        <Link href={`/products/${product.id}`} onClick={handleClick} className="block">
          <div className="aspect-square bg-muted relative overflow-hidden">
            <Image
              src={getProductImage(product.category, product.id)}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
            {badge && (
              <div className="absolute top-2 left-2">
                <Badge
                  variant={
                    badge === "best_match"
                      ? "default"
                      : badge === "value"
                      ? "success"
                      : "trending"
                  }
                >
                  {badge === "best_match"
                    ? "Best Match"
                    : badge === "value"
                    ? "Value for Money"
                    : "Trending"}
                </Badge>
              </div>
            )}
          </div>
        </Link>
        <CardContent className="p-3 flex-1">
          <Link href={`/products/${product.id}`} onClick={handleClick}>
            <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {product.name}
            </p>
          </Link>
          <p className="text-muted-foreground text-xs mt-0.5">{product.category}</p>
          <div className="flex items-center gap-1 mt-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium">{product.rating}</span>
            <span className="text-xs text-muted-foreground">({product.review_count})</span>
          </div>
          <p className="font-semibold text-primary mt-1">{formatPrice(product.price)}</p>
        </CardContent>
        <CardFooter className="p-3 pt-0">
          <Button
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.preventDefault();
              onAddToCart?.(product.id);
            }}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Add to cart
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
