"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getProductImage } from "@/lib/product-image";
import { getProductImagePlaceholder } from "@/lib/unsplash";
import type { Product } from "@/lib/api";

type Props = {
  product: Product;
  /** Defaults to aspect-square product cards; override for hero (e.g. `h-[280px] max-w-xl rounded-2xl`) */
  className?: string;
  imgClassName?: string;
};

/**
 * Thumbnail-first product image: lazy, object-cover, stable box, fallback chain.
 */
export function HomeProductImage({ product, className, imgClassName }: Props) {
  const [src, setSrc] = useState(() => getProductImage(product));

  useEffect(() => {
    setSrc(getProductImage(product));
  }, [product.id, product.thumbnail_url, product.category, product.category_slug]);

  return (
    <div className={cn("relative overflow-hidden bg-muted/60 aspect-square w-full", className)}>
      <img
        src={src}
        alt={product.name}
        loading="lazy"
        decoding="async"
        className={cn("absolute inset-0 h-full w-full object-cover", imgClassName)}
        onError={() => {
          if (product.thumbnail_url && src !== product.thumbnail_url) {
            setSrc(product.thumbnail_url);
            return;
          }
          setSrc(getProductImagePlaceholder(product.name));
        }}
      />
    </div>
  );
}
