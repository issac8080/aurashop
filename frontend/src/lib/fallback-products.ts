import type { Product } from "./api";

/** Static product list used when backend is unreachable (e.g. ECONNREFUSED). */
export const FALLBACK_PRODUCTS: Product[] = [
  { id: "P001", name: "Classic Cotton T-Shirt", description: "Soft, breathable cotton tee in neutral tones.", price: 899, currency: "INR", category: "Clothing", subcategory: "T-Shirts", brand: "Aura Basics", rating: 4.5, review_count: 234, colors: ["White", "Black", "Navy", "Grey"], sizes: ["S", "M", "L", "XL"], tags: ["casual", "cotton", "neutral"], in_stock: true, stock_count: 45 },
  { id: "P002", name: "Slim Fit Chinos", description: "Lightweight chinos for smart-casual looks.", price: 2499, currency: "INR", category: "Clothing", subcategory: "Pants", brand: "Urban Fit", rating: 4.7, review_count: 189, colors: ["Beige", "Navy", "Olive", "Black"], sizes: ["28", "30", "32", "34"], tags: ["casual", "chinos", "smart-casual"], in_stock: true, stock_count: 28 },
  { id: "P003", name: "Wireless Earbuds Pro", description: "Premium sound, 24hr battery.", price: 2999, currency: "INR", category: "Electronics", subcategory: "Audio", brand: "SoundPeak", rating: 4.6, review_count: 1203, colors: ["Black", "White", "Blue"], sizes: [], tags: ["audio", "wireless", "trending"], in_stock: true, stock_count: 156 },
  { id: "P004", name: "Leather Crossbody Bag", description: "Compact vegan leather bag.", price: 1899, currency: "INR", category: "Accessories", subcategory: "Bags", brand: "Aura Essentials", rating: 4.4, review_count: 87, colors: ["Brown", "Black", "Tan"], sizes: ["One Size"], tags: ["accessories", "bag", "casual"], in_stock: true, stock_count: 12 },
  { id: "P005", name: "Formal White Shirt", description: "Crisp cotton formal shirt.", price: 1599, currency: "INR", category: "Clothing", subcategory: "Shirts", brand: "Aura Formal", rating: 4.8, review_count: 312, colors: ["White", "Light Blue", "Pink"], sizes: ["S", "M", "L", "XL"], tags: ["formal", "office", "white"], in_stock: true, stock_count: 67 },
  { id: "P006", name: "Running Shoes Light", description: "Lightweight running shoes with cushioning.", price: 3499, currency: "INR", category: "Footwear", subcategory: "Sports", brand: "Stride", rating: 4.5, review_count: 445, colors: ["Black", "White", "Grey", "Blue"], sizes: ["7", "8", "9", "10", "11"], tags: ["sports", "running", "trending"], in_stock: true, stock_count: 34 },
  { id: "P007", name: "Denim Jacket", description: "Classic denim jacket. Versatile for layering.", price: 2799, currency: "INR", category: "Clothing", subcategory: "Jackets", brand: "Aura Basics", rating: 4.6, review_count: 178, colors: ["Blue", "Black", "Grey"], sizes: ["S", "M", "L", "XL"], tags: ["casual", "denim", "jacket"], in_stock: true, stock_count: 22 },
  { id: "P008", name: "Smart Watch Sport", description: "Fitness tracking, heart rate, notifications.", price: 4499, currency: "INR", category: "Electronics", subcategory: "Wearables", brand: "TechFit", rating: 4.4, review_count: 892, colors: ["Black", "Silver", "Rose Gold"], sizes: [], tags: ["wearables", "fitness", "trending"], in_stock: true, stock_count: 89 },
  { id: "P009", name: "Cotton Kurti", description: "Comfortable printed kurti.", price: 1299, currency: "INR", category: "Clothing", subcategory: "Ethnic", brand: "Aura Ethnic", rating: 4.5, review_count: 234, colors: ["Mustard", "Teal", "Maroon", "White"], sizes: ["S", "M", "L", "XL"], tags: ["ethnic", "casual", "cotton"], in_stock: true, stock_count: 56 },
  { id: "P010", name: "Minimalist Backpack", description: "Laptop compartment, water-resistant.", price: 1999, currency: "INR", category: "Accessories", subcategory: "Bags", brand: "Urban Fit", rating: 4.6, review_count: 203, colors: ["Black", "Grey", "Navy"], sizes: ["One Size"], tags: ["bag", "work", "travel"], in_stock: true, stock_count: 41 },
  { id: "P011", name: "Party Dress", description: "Elegant midi dress for parties.", price: 3299, currency: "INR", category: "Clothing", subcategory: "Dresses", brand: "Aura Style", rating: 4.7, review_count: 98, colors: ["Black", "Red", "Navy", "Green"], sizes: ["S", "M", "L"], tags: ["party", "dress", "formal"], in_stock: true, stock_count: 18 },
  { id: "P012", name: "Desk Lamp LED", description: "Adjustable brightness, USB charging.", price: 1499, currency: "INR", category: "Electronics", subcategory: "Home", brand: "BrightLife", rating: 4.3, review_count: 156, colors: ["White", "Black"], sizes: [], tags: ["home", "desk", "led"], in_stock: true, stock_count: 72 },
  { id: "P013", name: "Canvas Sneakers", description: "Comfortable everyday sneakers.", price: 1799, currency: "INR", category: "Footwear", subcategory: "Casual", brand: "Stride", rating: 4.5, review_count: 334, colors: ["White", "Grey", "Navy"], sizes: ["7", "8", "9", "10", "11"], tags: ["casual", "sneakers", "neutral"], in_stock: true, stock_count: 52 },
  { id: "P014", name: "Silk Scarf", description: "Light silk blend scarf.", price: 699, currency: "INR", category: "Accessories", subcategory: "Scarves", brand: "Aura Essentials", rating: 4.4, review_count: 167, colors: ["Red", "Blue", "Green", "Neutral"], sizes: ["One Size"], tags: ["accessories", "scarf", "silk"], in_stock: true, stock_count: 89 },
  { id: "P015", name: "Bluetooth Speaker", description: "Portable, waterproof. 12hr playback.", price: 2499, currency: "INR", category: "Electronics", subcategory: "Audio", brand: "SoundPeak", rating: 4.5, review_count: 445, colors: ["Black", "Blue", "Red"], sizes: [], tags: ["audio", "portable", "trending"], in_stock: true, stock_count: 63 },
];

function isNetworkError(e: unknown): boolean {
  if (e instanceof TypeError && e.message?.includes("fetch")) return true;
  if (e instanceof Error && (e.message?.includes("ECONNREFUSED") || e.message?.includes("Failed to fetch"))) return true;
  return false;
}

function filterProducts(
  products: Product[],
  params?: { category?: string; min_price?: number; max_price?: number; min_rating?: number; color?: string; limit?: number }
): Product[] {
  let out = [...products];
  if (params?.category) out = out.filter((p) => p.category === params.category);
  if (params?.min_price != null) out = out.filter((p) => p.price >= params!.min_price!);
  if (params?.max_price != null) out = out.filter((p) => p.price <= params!.max_price!);
  if (params?.min_rating != null) out = out.filter((p) => p.rating >= params!.min_rating!);
  if (params?.color) out = out.filter((p) => p.colors.some((c) => c.toLowerCase() === params!.color!.toLowerCase()));
  const limit = params?.limit ?? 50;
  return out.slice(0, limit);
}

export async function fetchWithFallback<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<{ data: T; offline: boolean }> {
  try {
    const data = await fn();
    return { data, offline: false };
  } catch (e) {
    if (isNetworkError(e)) return { data: fallback, offline: true };
    throw e;
  }
}

export function getFallbackProducts(params?: Parameters<typeof filterProducts>[1]): Product[] {
  return filterProducts(FALLBACK_PRODUCTS, params);
}

export function getFallbackProduct(id: string): Product | null {
  return FALLBACK_PRODUCTS.find((p) => p.id === id) ?? null;
}
