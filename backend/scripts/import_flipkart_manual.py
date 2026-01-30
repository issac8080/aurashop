"""
Manual import for Flipkart dataset.
Place CSV file at: backend/data/flipkart_products.csv
Run: python scripts/import_flipkart_manual.py
"""
from pathlib import Path
import sys
import json

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.seed_from_kaggle import process_kaggle_data

def main():
    backend_dir = Path(__file__).resolve().parent.parent
    csv_path = backend_dir / "data" / "flipkart_products.csv"
    out_path = backend_dir / "data" / "products.json"
    
    print("=" * 60)
    print("AuraShop - Manual Flipkart Dataset Import")
    print("=" * 60)
    
    if not csv_path.exists():
        print(f"\nERROR: CSV file not found at:")
        print(f"  {csv_path}")
        print("\nPlease:")
        print("1. Download dataset from:")
        print("   https://www.kaggle.com/datasets/PromptCloudHQ/flipkart-products")
        print("2. Extract the CSV file")
        print(f"3. Rename it to: flipkart_products.csv")
        print(f"4. Place it in: {backend_dir / 'data'}")
        print("\nThen run this script again.")
        return
    
    print(f"\nFound CSV file: {csv_path}")
    print("Processing ALL products (this may take a few minutes)...")
    
    products = process_kaggle_data(csv_path, max_products=50000)
    
    if not products:
        print("\nERROR: No products were processed")
        print("Check if the CSV file is valid and contains product data.")
        return
    
    # Save to JSON
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 60)
    print("SUCCESS!")
    print("=" * 60)
    print(f"Total products imported: {len(products)}")
    print(f"Categories: {len(set(p['category'] for p in products))}")
    print(f"Output file: {out_path}")
    
    # Show sample
    print("\nSample products:")
    for p in products[:5]:
        print(f"  - {p['name'][:50]}... ({p['category']}) - ₹{p['price']}")
    
    print("\n✓ Products saved successfully!")
    print("\nNext steps:")
    print("1. Restart the backend server")
    print("2. Open http://localhost:3000")
    print("3. Browse your new products!")

if __name__ == "__main__":
    main()
