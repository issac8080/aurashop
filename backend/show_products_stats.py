import json
from pathlib import Path

data_file = Path(__file__).parent / "data" / "products.json"

with open(data_file, encoding='utf-8') as f:
    products = json.load(f)

print("=" * 60)
print("FLIPKART PRODUCTS IMPORT - SUCCESS!")
print("=" * 60)
print(f"\nTotal Products: {len(products)}")

# Count by category
cats = {}
for p in products:
    cat = p['category']
    cats[cat] = cats.get(cat, 0) + 1

print(f"\nCategories ({len(cats)}):")
for cat, count in sorted(cats.items()):
    print(f"  {cat}: {count} products")

print("\nSample Products:")
for i, p in enumerate(products[:10], 1):
    name = p['name'][:50] + "..." if len(p['name']) > 50 else p['name']
    print(f"  {i}. {name}")
    print(f"     Category: {p['category']} | Price: Rs.{p['price']} | Brand: {p['brand']}")

print("\n" + "=" * 60)
print("Products ready to use!")
print("Restart the backend to load new products.")
print("=" * 60)
