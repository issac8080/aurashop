"""
Seed script: generates 5000+ products across categories with image URLs.
Run from backend: python scripts/seed_products.py
Output: data/products.json
"""
import json
import random
from pathlib import Path

# Product image base - Picsum gives consistent image per seed
IMAGE_BASE = "https://picsum.photos/seed"

CATEGORIES = {
    "Clothing": {
        "subcategories": ["T-Shirts", "Pants", "Shirts", "Jackets", "Ethnic", "Dresses", "Shorts", "Sweaters", "Activewear", "Jeans", "Skirts", "Blazers"],
        "brands": ["Aura Basics", "Urban Fit", "Aura Formal", "Aura Ethnic", "Aura Style", "Comfort Wear", "Street Style", "Premium Cotton", "Trendy Threads"],
        "price_range": (399, 8999),
        "colors": ["White", "Black", "Navy", "Grey", "Beige", "Olive", "Maroon", "Teal", "Mustard", "Red", "Blue", "Pink", "Brown", "Green"],
        "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
        "name_templates": ["Classic {adj} {type}", "Slim Fit {type}", "Premium {type}", "Casual {type}", "Designer {type}", "Comfort {type}", "Trendy {type}", "Essential {type}"],
    },
    "Electronics": {
        "subcategories": ["Audio", "Wearables", "Home", "Mobile", "Computing", "Gaming", "Cameras", "Storage", "Chargers", "Cables", "Smart Home"],
        "brands": ["SoundPeak", "TechFit", "BrightLife", "Aura Tech", "ProGadget", "SmartLife", "NextGen", "PowerUp", "ConnectPro"],
        "price_range": (499, 49999),
        "colors": ["Black", "White", "Silver", "Blue", "Space Grey", "Rose Gold", "Red", "Graphite"],
        "sizes": [],
        "name_templates": ["Pro {type}", "Wireless {type}", "Smart {type}", "Premium {type}", "Ultra {type}", "Compact {type}", "Advanced {type}"],
    },
    "Accessories": {
        "subcategories": ["Bags", "Scarves", "Watches", "Belts", "Hats", "Sunglasses", "Jewelry", "Wallets", "Phone Cases", "Keychains", "Umbrellas"],
        "brands": ["Aura Essentials", "Urban Fit", "Classic Style", "Minimalist", "Luxe Accents", "Everyday Carry", "Trendy Bits"],
        "price_range": (299, 5999),
        "colors": ["Black", "Brown", "Tan", "Navy", "Red", "Blue", "Green", "Gold", "Silver", "Multi"],
        "sizes": ["One Size", "S", "M", "L"],
        "name_templates": ["Classic {type}", "Minimalist {type}", "Designer {type}", "Premium {type}", "Everyday {type}", "Stylish {type}"],
    },
    "Footwear": {
        "subcategories": ["Sports", "Casual", "Formal", "Sandals", "Boots", "Sneakers", "Loafers", "Flip-Flops", "Running", "Walking"],
        "brands": ["Stride", "Comfort Step", "Urban Walk", "Aura Footwear", "Active Step", "Classic Sole", "Trendy Kicks"],
        "price_range": (599, 8999),
        "colors": ["Black", "White", "Grey", "Navy", "Brown", "Blue", "Red", "Beige", "Olive"],
        "sizes": ["6", "7", "8", "9", "10", "11", "12"],
        "name_templates": ["Comfort {type}", "Classic {type}", "Sport {type}", "Premium {type}", "Everyday {type}", "Lightweight {type}"],
    },
    "Home & Living": {
        "subcategories": ["Furniture", "Decor", "Kitchen", "Bedding", "Lighting", "Storage", "Garden", "Bath", "Rugs", "Curtains"],
        "brands": ["Home Aura", "Living Space", "Cozy Corner", "Urban Home", "Minimal Living", "Comfort Home", "Style Nest"],
        "price_range": (499, 24999),
        "colors": ["White", "Grey", "Beige", "Brown", "Black", "Navy", "Green", "Wood", "Natural"],
        "sizes": ["Small", "Medium", "Large", "One Size"],
        "name_templates": ["Modern {type}", "Classic {type}", "Cozy {type}", "Minimal {type}", "Premium {type}", "Essential {type}"],
    },
    "Beauty": {
        "subcategories": ["Skincare", "Makeup", "Haircare", "Fragrance", "Personal Care", "Nails", "Tools", "Men's Grooming", "Body Care"],
        "brands": ["Aura Beauty", "Pure Glow", "Natural Touch", "Glow Up", "Fresh Face", "Luxe Beauty", "Simple Care"],
        "price_range": (199, 4999),
        "colors": ["Natural", "Nude", "Pink", "Red", "Brown", "Black", "Multi", "Clear"],
        "sizes": ["50ml", "100ml", "200ml", "One Size", "Standard"],
        "name_templates": ["Nourishing {type}", "Premium {type}", "Daily {type}", "Pro {type}", "Natural {type}", "Luxe {type}"],
    },
    "Sports & Outdoors": {
        "subcategories": ["Fitness", "Camping", "Cycling", "Yoga", "Running", "Gym", "Outdoor Gear", "Water Sports", "Winter Sports"],
        "brands": ["Active Aura", "Outdoor Pro", "Fit Life", "Peak Performance", "Trail Master", "Sport Elite", "Adventure Gear"],
        "price_range": (499, 12999),
        "colors": ["Black", "Navy", "Red", "Orange", "Green", "Grey", "Blue", "Yellow"],
        "sizes": ["S", "M", "L", "XL", "One Size", "Universal"],
        "name_templates": ["Pro {type}", "Training {type}", "Outdoor {type}", "Sport {type}", "Performance {type}", "Essential {type}"],
    },
    "Books & Stationery": {
        "subcategories": ["Books", "Notebooks", "Pens", "Art Supplies", "Office", "Planners", "Diaries", "Cards"],
        "brands": ["Aura Books", "Write Well", "Creative Desk", "Office Pro", "Paper Craft", "Ink & Paper"],
        "price_range": (49, 2999),
        "colors": ["Black", "Blue", "Red", "Multi", "White", "Grey", "Brown"],
        "sizes": ["A4", "A5", "Pocket", "Standard", "One Size"],
        "name_templates": ["Classic {type}", "Premium {type}", "Professional {type}", "Creative {type}", "Essential {type}"],
    },
    "Toys & Games": {
        "subcategories": ["Educational", "Action Figures", "Board Games", "Puzzles", "Outdoor Toys", "Electronic Toys", "Arts & Crafts"],
        "brands": ["Play Aura", "Fun Learn", "Kids World", "Smart Play", "Creative Kids", "Family Fun"],
        "price_range": (199, 4999),
        "colors": ["Multi", "Red", "Blue", "Green", "Yellow", "Pink", "Orange"],
        "sizes": ["Small", "Medium", "Large", "One Size"],
        "name_templates": ["Fun {type}", "Educational {type}", "Creative {type}", "Classic {type}", "Interactive {type}"],
    },
}

DESCRIPTIONS = [
    "Premium quality. Perfect for everyday use.",
    "Comfortable and stylish. A great choice.",
    "Designed for comfort and durability.",
    "Popular choice among customers. Highly rated.",
    "Best value for money. Trusted brand.",
    "Trending product. Get yours today.",
    "Quality materials. Long-lasting.",
    "Great for gifting. Well packaged.",
]

def generate_products(total: int = 5000) -> list[dict]:
    random.seed(42)
    products = []
    used_names = set()

    for i in range(1, total + 1):
        pid = f"P{i:05d}"
        category = random.choice(list(CATEGORIES.keys()))
        config = CATEGORIES[category]
        sub = random.choice(config["subcategories"])

        # Unique name
        adj = random.choice(["Classic", "Premium", "Slim", "Comfort", "Designer", "Trendy", "Essential", "Pro", "Smart", "Modern"])
        type_name = sub.replace(" ", "") if len(sub) < 12 else sub[:10]
        name_template = random.choice(config["name_templates"])
        name = name_template.format(adj=adj, type=sub)
        if name in used_names:
            name = f"{name} {random.randint(1, 99)}"
        used_names.add(name)

        price = random.randint(*config["price_range"])
        if price % 100 >= 50:
            price = (price // 100) * 100 + 99
        else:
            price = (price // 100) * 100 + 99
        price = max(99, min(price, 99999))

        rating = round(random.uniform(3.5, 5.0), 1)
        review_count = random.randint(15, 3500)
        num_colors = random.randint(2, min(6, len(config["colors"])))
        colors = random.sample(config["colors"], num_colors)
        sizes = config["sizes"][: random.randint(0, max(1, len(config["sizes"])))] if config["sizes"] else []
        if not sizes and category in ("Clothing", "Footwear"):
            sizes = config["sizes"]

        tags = [c.lower() for c in colors[:2]] + [sub.lower(), category.lower()]
        random.shuffle(tags)
        tags = list(dict.fromkeys(tags))[:5]

        stock_count = random.randint(5, 500)
        in_stock = random.random() > 0.02

        # Consistent image per product (Picsum seed)
        image_url = f"{IMAGE_BASE}/{pid}/400/400"

        products.append({
            "id": pid,
            "name": name,
            "description": random.choice(DESCRIPTIONS) + f" Ideal for {sub.lower()} and {category.lower()}.",
            "price": float(price),
            "currency": "INR",
            "category": category,
            "subcategory": sub,
            "brand": random.choice(config["brands"]),
            "rating": rating,
            "review_count": review_count,
            "colors": colors,
            "sizes": sizes if sizes else [],
            "image_url": image_url,
            "tags": tags,
            "in_stock": in_stock,
            "stock_count": stock_count if in_stock else 0,
        })

    return products


def main():
    backend_dir = Path(__file__).resolve().parent.parent
    data_dir = backend_dir / "data"
    data_dir.mkdir(exist_ok=True)
    out_path = data_dir / "products.json"

    count = 5000
    print(f"Generating {count} products...")
    products = generate_products(count)
    print(f"Categories: {len(set(p['category'] for p in products))}")
    print(f"Sample IDs: {[p['id'] for p in products[:5]]}")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2, ensure_ascii=False)

    print(f"Written {len(products)} products to {out_path}")


if __name__ == "__main__":
    main()
