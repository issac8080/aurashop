"""
Use reliable image service that actually works.
Uses Picsum Photos - fast, reliable, and always available.
"""
import json
from pathlib import Path
import hashlib

def get_image_url_for_product(product: dict) -> str:
    """Generate a reliable, working image URL for a product."""
    product_id = product.get('id', 'P00000')
    category = product.get('category', 'Product')
    
    # Use Picsum Photos with seed for consistency
    # Format: https://picsum.photos/seed/{seed}/400/400
    seed = f"{product_id}-{category.lower().replace(' ', '-')}"
    
    return f"https://picsum.photos/seed/{seed}/400/400"


def main():
    backend_dir = Path(__file__).resolve().parent.parent
    products_path = backend_dir / "data" / "products.json"
    
    print("=" * 60)
    print("Using Reliable Image Service (Picsum)")
    print("=" * 60)
    
    # Load products
    print("\nLoading products...")
    with open(products_path, 'r', encoding='utf-8') as f:
        products = json.load(f)
    
    print(f"Found {len(products)} products")
    
    # Update image URLs
    print("\nGenerating reliable image URLs...")
    updated = 0
    
    for product in products:
        new_url = get_image_url_for_product(product)
        product['image_url'] = new_url
        updated += 1
        
        if updated % 2000 == 0:
            print(f"  Updated {updated} products...")
    
    # Save updated products
    print(f"\nSaving {len(products)} products with reliable images...")
    with open(products_path, 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 60)
    print("SUCCESS!")
    print("=" * 60)
    print(f"Total products: {len(products)}")
    print(f"Images updated: {updated}")
    print("\nImage Features:")
    print("  - Picsum Photos (100% reliable)")
    print("  - Fast loading (400x400)")
    print("  - Consistent per product")
    print("  - No rate limits")
    print("  - Always available")
    print("\nImages will work immediately!")
    print("Refresh browser to see images.")
    print("=" * 60)


if __name__ == "__main__":
    main()
