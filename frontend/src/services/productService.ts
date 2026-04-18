import type { Product } from "@/lib/product-types";

const DUMMYJSON_BASE = "https://dummyjson.com";
const INR_PER_USD = 83;

export type CategoryOption = { slug: string; name: string };

type DummyJsonProduct = {
  id: number;
  title: string;
  description: string;
  price: number;
  discountPercentage?: number;
  rating: number;
  stock: number;
  brand?: string;
  category: string;
  thumbnail?: string;
  images?: string[];
  meta?: { createdAt?: string; updatedAt?: string; barcode?: string; qrCode?: string };
};

type ProductsListResponse = {
  products: DummyJsonProduct[];
  total: number;
  skip: number;
  limit: number;
};

type SingleProductResponse = DummyJsonProduct;

let allProductsCache: Product[] | null = null;
let categoriesCache: CategoryOption[] | null = null;
let loadAllPromise: Promise<Product[]> | null = null;
const singleProductCache = new Map<string, Product>();

/** Deterministic “fake” discount 10–30% per product id */
export function fakeDiscountPercent(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 10 + (h % 21);
}

function usdToInr(usd: number): number {
  return Math.round(usd * INR_PER_USD);
}

function formatCategoryName(rawSlug: string): string {
  return rawSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Prefer Unsplash by category; `thumbnail_url` holds DummyJSON image for onError fallback.
 */
function primaryImageUrl(categorySlug: string, thumbnail: string | undefined): string {
  const q = encodeURIComponent(categorySlug.replace(/-/g, " "));
  return `https://source.unsplash.com/400x400/?${q}`;
}

export function mapDummyJsonProduct(raw: DummyJsonProduct, categorySlugHint?: string): Product {
  const id = String(raw.id);
  const slug = categorySlugHint ?? raw.category;
  const categoryName = formatCategoryName(slug);
  const thumb = raw.thumbnail || raw.images?.[0] || "";
  const priceInr = usdToInr(raw.price);
  const discountPercent = fakeDiscountPercent(id);
  const compareAt = Math.round(priceInr / (1 - discountPercent / 100));
  const reviewCount = Math.max(12, Math.min(5000, Math.round((raw.rating || 4) * 180 + (raw.id % 400))));
  /** Prefer real DummyJSON CDN URLs; `source.unsplash.com` is unreliable for cart/order thumbnails. */
  const primaryVisual =
    thumb && /^https?:\/\//i.test(thumb) ? thumb : primaryImageUrl(slug, thumb);

  return {
    id,
    name: raw.title,
    description: raw.description ?? "",
    price: priceInr,
    compare_at_price: compareAt,
    discount_percent: discountPercent,
    currency: "INR",
    category: categoryName,
    category_slug: slug,
    brand: raw.brand,
    rating: raw.rating,
    review_count: reviewCount,
    colors: [],
    sizes: [],
    image_url: primaryVisual,
    thumbnail_url: thumb || undefined,
    tags: [categoryName, raw.brand].filter(Boolean) as string[],
    in_stock: raw.stock > 0,
    stock_count: raw.stock,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/** Load every product (paginated) into cache */
export async function getAllProducts(): Promise<Product[]> {
  if (allProductsCache) return allProductsCache;
  if (loadAllPromise) return loadAllPromise;

  loadAllPromise = (async () => {
    const collected: DummyJsonProduct[] = [];
    let skip = 0;
    const pageSize = 100;
    let total = Infinity;
    while (skip < total) {
      const data = await fetchJson<ProductsListResponse>(
        `${DUMMYJSON_BASE}/products?limit=${pageSize}&skip=${skip}`
      );
      collected.push(...(data.products ?? []));
      total = data.total ?? collected.length;
      if (!data.products?.length) break;
      skip += data.products.length;
    }
    const mapped = collected.map((p) => mapDummyJsonProduct(p));
    allProductsCache = mapped;
    for (const p of mapped) singleProductCache.set(p.id, p);
    return mapped;
  })();

  try {
    return await loadAllPromise;
  } finally {
    loadAllPromise = null;
  }
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  const data = await fetchJson<{ products: DummyJsonProduct[] }>(
    `${DUMMYJSON_BASE}/products/category/${encodeURIComponent(categorySlug)}`
  );
  return (data.products ?? []).map((p) => mapDummyJsonProduct(p, categorySlug));
}

export async function getProductById(id: string): Promise<Product | null> {
  if (singleProductCache.has(id)) return singleProductCache.get(id)!;
  if (allProductsCache) {
    const found = allProductsCache.find((p) => p.id === id);
    if (found) return found;
  }

  try {
    const raw = await fetchJson<SingleProductResponse>(`${DUMMYJSON_BASE}/products/${encodeURIComponent(id)}`);
    const mapped = mapDummyJsonProduct(raw);
    singleProductCache.set(id, mapped);
    return mapped;
  } catch {
    return null;
  }
}

/** All products except the groceries category (Fashion, electronics, home, etc.). */
export async function getNonGroceryProducts(): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => (p.category_slug || "").toLowerCase() !== "groceries");
}

export async function getCategoryOptions(): Promise<CategoryOption[]> {
  if (categoriesCache) return categoriesCache;
  const list = await fetchJson<Array<{ slug: string; name: string }>>(
    `${DUMMYJSON_BASE}/products/categories`
  );
  categoriesCache = list.map((c) => ({ slug: c.slug, name: c.name }));
  return categoriesCache;
}

/** Map display name or mixed case to DummyJSON slug (e.g. "Home Decoration" → "home-decoration"). */
export function toCategorySlug(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "-");
}

export function filterProductsLocal(
  products: Product[],
  params?: {
    category?: string;
    min_price?: number;
    max_price?: number;
    min_rating?: number;
    color?: string;
    limit?: number;
  }
): Product[] {
  let out = [...products];
  if (params?.category) {
    const slug = toCategorySlug(params.category);
    out = out.filter(
      (p) => p.category_slug === params.category || p.category_slug === slug || p.category === params.category
    );
  }
  if (params?.min_price != null) out = out.filter((p) => p.price >= params!.min_price!);
  if (params?.max_price != null) out = out.filter((p) => p.price <= params!.max_price!);
  if (params?.min_rating != null) out = out.filter((p) => p.rating >= params!.min_rating!);
  if (params?.color) {
    const c = params.color.toLowerCase();
    out = out.filter((p) => p.colors.some((x) => x.toLowerCase() === c));
  }
  const limit = params?.limit ?? 200;
  return out.slice(0, limit);
}

/** Invalidate cache (e.g. tests) */
export function clearProductCache(): void {
  allProductsCache = null;
  categoriesCache = null;
  singleProductCache.clear();
}
