/** Shared product shape for catalog, cart display, and recommendations. */
export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  /** DummyJSON category slug (e.g. `smartphones`) for API filters */
  category_slug?: string;
  subcategory?: string;
  brand?: string;
  rating: number;
  review_count: number;
  colors: string[];
  sizes: string[];
  image_url?: string;
  /** Original thumbnail from DummyJSON — used if primary image fails */
  thumbnail_url?: string;
  tags: string[];
  in_stock: boolean;
  stock_count?: number;
  /** Strikethrough MRP for UI (INR) */
  compare_at_price?: number;
  /** Display discount 10–30 (percent) */
  discount_percent?: number;
};
