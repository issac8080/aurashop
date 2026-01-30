/**
 * Unsplash image URLs for product categories and backgrounds.
 * Using Unsplash Source API for random high-quality images.
 */

const UNSPLASH_BASE = "https://source.unsplash.com";

export function getProductImage(category: string, id: string): string {
  const categoryMap: Record<string, string> = {
    Clothing: "fashion,clothing",
    Electronics: "technology,gadgets",
    Accessories: "accessories,fashion",
    Footwear: "shoes,sneakers",
  };
  const query = categoryMap[category] || "product,shopping";
  // Use id as seed for consistent images per product
  const seed = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `${UNSPLASH_BASE}/400x400/?${query}&sig=${seed}`;
}

export function getHeroBackground(): string {
  return `${UNSPLASH_BASE}/1920x1080/?shopping,fashion,modern&blur`;
}

export function getCategoryBackground(category: string): string {
  const categoryMap: Record<string, string> = {
    Clothing: "fashion,style",
    Electronics: "technology,modern",
    Accessories: "luxury,accessories",
    Footwear: "shoes,style",
  };
  const query = categoryMap[category] || "shopping";
  return `${UNSPLASH_BASE}/1920x600/?${query}&blur=2`;
}
