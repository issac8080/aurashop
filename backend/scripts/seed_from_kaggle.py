"""
Seed products from Kaggle Flipkart dataset.
Downloads and processes real product data from Flipkart.

Run: python scripts/seed_from_kaggle.py
Output: data/products.json
"""
import json
import csv
import random
from pathlib import Path

def download_kaggle_dataset():
    """Download Flipkart products dataset from Kaggle."""
    try:
        import kagglehub
        print("Downloading Flipkart products dataset from Kaggle...")
        path = kagglehub.dataset_download("PromptCloudHQ/flipkart-products")
        print(f"Dataset downloaded to: {path}")
        return Path(path)
    except ImportError:
        print("ERROR: kagglehub not installed. Install with: pip install kagglehub")
        return None
    except Exception as e:
        print(f"ERROR downloading dataset: {e}")
        return None


def find_csv_file(dataset_path: Path) -> Path:
    """Find the CSV file in the dataset directory."""
    if not dataset_path or not dataset_path.exists():
        return None
    
    # Look for CSV files
    csv_files = list(dataset_path.glob("*.csv"))
    if csv_files:
        print(f"Found CSV file: {csv_files[0]}")
        return csv_files[0]
    
    # Check subdirectories
    for subdir in dataset_path.iterdir():
        if subdir.is_dir():
            csv_files = list(subdir.glob("*.csv"))
            if csv_files:
                print(f"Found CSV file: {csv_files[0]}")
                return csv_files[0]
    
    return None


def map_category(original_category: str) -> tuple[str, str]:
    """Map Flipkart categories to AuraShop categories."""
    category_map = {
        # Clothing
        "men's clothing": ("Clothing", "Men's Wear"),
        "women's clothing": ("Clothing", "Women's Wear"),
        "clothing": ("Clothing", "Casual Wear"),
        "men": ("Clothing", "Men's Wear"),
        "women": ("Clothing", "Women's Wear"),
        "kids": ("Clothing", "Kids Wear"),
        "baby": ("Toys & Games", "Baby Products"),
        
        # Electronics
        "mobiles": ("Electronics", "Mobile"),
        "mobile": ("Electronics", "Mobile"),
        "laptop": ("Electronics", "Computing"),
        "computer": ("Electronics", "Computing"),
        "electronics": ("Electronics", "Gadgets"),
        "camera": ("Electronics", "Cameras"),
        "headphone": ("Electronics", "Audio"),
        "speaker": ("Electronics", "Audio"),
        "television": ("Electronics", "Home"),
        "tv": ("Electronics", "Home"),
        
        # Home
        "home": ("Home & Living", "Decor"),
        "furniture": ("Home & Living", "Furniture"),
        "kitchen": ("Home & Living", "Kitchen"),
        "appliances": ("Home & Living", "Appliances"),
        
        # Accessories
        "watches": ("Accessories", "Watches"),
        "watch": ("Accessories", "Watches"),
        "bags": ("Accessories", "Bags"),
        "bag": ("Accessories", "Bags"),
        "jewellery": ("Accessories", "Jewelry"),
        "jewelry": ("Accessories", "Jewelry"),
        
        # Footwear
        "footwear": ("Footwear", "Casual"),
        "shoes": ("Footwear", "Casual"),
        "shoe": ("Footwear", "Casual"),
        
        # Beauty
        "beauty": ("Beauty", "Skincare"),
        "cosmetics": ("Beauty", "Makeup"),
        "fragrance": ("Beauty", "Fragrance"),
        
        # Sports
        "sports": ("Sports & Outdoors", "Fitness"),
        "fitness": ("Sports & Outdoors", "Fitness"),
        
        # Books
        "books": ("Books & Stationery", "Books"),
        "book": ("Books & Stationery", "Books"),
        
        # Toys
        "toys": ("Toys & Games", "Educational"),
        "toy": ("Toys & Games", "Educational"),
        "games": ("Toys & Games", "Board Games"),
    }
    
    original_lower = original_category.lower() if original_category else ""
    
    # Try exact match
    if original_lower in category_map:
        return category_map[original_lower]
    
    # Try partial match
    for key, value in category_map.items():
        if key in original_lower or original_lower in key:
            return value
    
    # Default
    return ("Accessories", "General")


def clean_price(price_str: str) -> float:
    """Extract numeric price from string."""
    if not price_str:
        return random.randint(499, 4999)
    
    try:
        # Remove currency symbols and commas
        cleaned = price_str.replace("₹", "").replace("Rs", "").replace(",", "").strip()
        price = float(cleaned)
        
        # Reasonable price range
        if price < 50:
            price = price * 100  # Might be in hundreds
        if price > 100000:
            price = price / 10  # Might be too high
        
        return round(price, 2)
    except:
        return random.randint(499, 4999)


def clean_rating(rating_str: str) -> float:
    """Extract numeric rating."""
    if not rating_str:
        return round(random.uniform(3.5, 5.0), 1)
    
    try:
        rating = float(str(rating_str).split()[0])
        if 0 <= rating <= 5:
            return round(rating, 1)
    except:
        pass
    
    return round(random.uniform(3.5, 5.0), 1)


def extract_image_urls(image_field: str) -> list[str]:
    """Extract all image URLs from the image field."""
    if not image_field:
        return []
    
    try:
        # Remove brackets and parse as list
        cleaned = image_field.strip('[]')
        # Split by comma and clean each URL
        urls = []
        for url in cleaned.split('",'):
            url = url.strip(' "')
            if url.startswith('http'):
                # Update old Flipkart URLs to use HTTPS
                url = url.replace('http://', 'https://')
                urls.append(url)
        return urls
    except:
        return []


def extract_colors_from_text(text: str) -> list[str]:
    """Extract color names from product text."""
    colors = ["Black", "White", "Blue", "Red", "Green", "Grey", "Navy", "Brown", 
              "Pink", "Yellow", "Orange", "Purple", "Beige", "Silver", "Gold"]
    
    found_colors = []
    text_lower = text.lower() if text else ""
    
    for color in colors:
        if color.lower() in text_lower:
            found_colors.append(color)
    
    if not found_colors:
        found_colors = random.sample(colors, random.randint(2, 4))
    
    return found_colors[:5]


def process_kaggle_data(csv_path: Path, max_products: int = 50000) -> list[dict]:
    """Process Kaggle CSV data into AuraShop format."""
    products = []
    
    print(f"Reading CSV file: {csv_path}")
    
    try:
        with open(csv_path, 'r', encoding='utf-8', errors='ignore') as f:
            # Try to detect delimiter
            sample = f.read(1024)
            f.seek(0)
            
            # Common delimiters
            delimiter = ','
            if '\t' in sample:
                delimiter = '\t'
            
            reader = csv.DictReader(f, delimiter=delimiter)
            
            # Print available columns
            fieldnames = reader.fieldnames
            print(f"CSV Columns: {fieldnames}")
            
            # Map common column names
            name_col = None
            price_col = None
            category_col = None
            rating_col = None
            image_col = None
            desc_col = None
            brand_col = None
            
            for col in fieldnames:
                col_lower = col.lower()
                if 'product_name' in col_lower or 'name' in col_lower or 'title' in col_lower:
                    name_col = col
                elif 'price' in col_lower or 'retail_price' in col_lower:
                    price_col = col
                elif 'category' in col_lower or 'product_category' in col_lower:
                    category_col = col
                elif 'rating' in col_lower:
                    rating_col = col
                elif 'image' in col_lower:
                    image_col = col
                elif 'description' in col_lower or 'desc' in col_lower:
                    desc_col = col
                elif 'brand' in col_lower:
                    brand_col = col
            
            print(f"Mapped columns:")
            print(f"  Name: {name_col}")
            print(f"  Price: {price_col}")
            print(f"  Category: {category_col}")
            print(f"  Rating: {rating_col}")
            print(f"  Image: {image_col}")
            print(f"  Description: {desc_col}")
            print(f"  Brand: {brand_col}")
            
            count = 0
            for row in reader:
                if count >= max_products:
                    break
                
                # Extract data
                name = row.get(name_col, "").strip() if name_col else f"Product {count+1}"
                if not name or len(name) < 3:
                    continue
                
                # Clean name (remove extra spaces, limit length)
                name = " ".join(name.split())[:100]
                
                price = clean_price(row.get(price_col, "") if price_col else "")
                
                original_category = row.get(category_col, "") if category_col else ""
                category, subcategory = map_category(original_category)
                
                rating = clean_rating(row.get(rating_col, "") if rating_col else "")
                
                # Extract image URLs from the image field
                image_field = row.get(image_col, "") if image_col else ""
                image_urls = extract_image_urls(image_field)
                
                # Use first image as primary, or fallback
                if image_urls:
                    image_url = image_urls[0]
                else:
                    image_url = f"https://via.placeholder.com/400x400/CCCCCC/666666?text={name[:20]}"
                
                description = row.get(desc_col, "") if desc_col else ""
                if not description:
                    description = f"Quality {name.lower()}. Perfect for everyday use."
                else:
                    description = " ".join(description.split())[:200]
                
                brand = row.get(brand_col, "") if brand_col else "AuraShop"
                if not brand or len(brand) < 2:
                    brand = "AuraShop"
                
                # Extract colors from name and description
                colors = extract_colors_from_text(f"{name} {description}")
                
                # Generate other fields
                pid = f"P{count+1:05d}"
                review_count = random.randint(50, 2000)
                stock_count = random.randint(10, 300)
                in_stock = random.random() > 0.05
                
                tags = [category.lower(), subcategory.lower()] + colors[:2]
                tags = [t.lower() for t in tags]
                tags = list(dict.fromkeys(tags))[:5]
                
                products.append({
                    "id": pid,
                    "name": name,
                    "description": description,
                    "price": float(price),
                    "currency": "INR",
                    "category": category,
                    "subcategory": subcategory,
                    "brand": brand,
                    "rating": rating,
                    "review_count": review_count,
                    "colors": colors,
                    "sizes": [],  # Not available in dataset
                    "image_url": image_url,
                    "tags": tags,
                    "in_stock": in_stock,
                    "stock_count": stock_count if in_stock else 0,
                })
                
                count += 1
                
                if count % 500 == 0:
                    print(f"Processed {count} products...")
            
            print(f"Successfully processed {len(products)} products")
            
    except Exception as e:
        print(f"ERROR processing CSV: {e}")
        import traceback
        traceback.print_exc()
    
    return products


def main():
    """Main function to download and process Kaggle dataset."""
    backend_dir = Path(__file__).resolve().parent.parent
    data_dir = backend_dir / "data"
    data_dir.mkdir(exist_ok=True)
    out_path = data_dir / "products.json"
    
    print("=" * 60)
    print("AuraShop - Kaggle Flipkart Dataset Importer")
    print("=" * 60)
    
    # Download dataset
    dataset_path = download_kaggle_dataset()
    if not dataset_path:
        print("\nERROR: Could not download dataset.")
        print("Please install kagglehub: pip install kagglehub")
        print("And ensure you have Kaggle API credentials set up.")
        return
    
    # Find CSV file
    csv_path = find_csv_file(dataset_path)
    if not csv_path:
        print(f"\nERROR: Could not find CSV file in {dataset_path}")
        return
    
    # Process data
    products = process_kaggle_data(csv_path, max_products=50000)
    
    if not products:
        print("\nERROR: No products were processed.")
        return
    
    # Save to JSON
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 60)
    print("SUCCESS!")
    print("=" * 60)
    print(f"Total products: {len(products)}")
    print(f"Categories: {len(set(p['category'] for p in products))}")
    print(f"Output file: {out_path}")
    
    # Show sample
    print("\nSample products:")
    for p in products[:3]:
        print(f"  - {p['name']} ({p['category']}) - ₹{p['price']}")
    
    print("\nProducts saved successfully!")
    print("Restart the backend to load new products.")


if __name__ == "__main__":
    main()
