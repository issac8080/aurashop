import type { Product } from "@/lib/product-types";

/**
 * Home/catalog-safe image URL: prefer DummyJSON thumbnail (reliable), then category-based Unsplash.
 * Avoids using `image_url` when it points at flaky source.unsplash.com redirects for grid thumbnails.
 */
export function getProductImage(product: Pick<Product, "thumbnail_url" | "category" | "category_slug" | "name">): string {
  const thumb = product.thumbnail_url;
  if (thumb && (thumb.startsWith("http://") || thumb.startsWith("https://"))) {
    return thumb;
  }
  const raw = (product.category_slug || product.category || "shopping").replace(/-/g, " ");
  return `https://source.unsplash.com/400x400/?${encodeURIComponent(raw)}`;
}
