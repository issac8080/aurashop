# Kaggle Flipkart Dataset Setup Guide

## Option 1: Automatic Download (Recommended)

### Step 1: Install kagglehub

Open a **new terminal as Administrator** and run:

```bash
cd backend
pip install kagglehub
```

### Step 2: Set up Kaggle API credentials

1. Go to https://www.kaggle.com/settings
2. Scroll to "API" section
3. Click "Create New Token"
4. This downloads `kaggle.json`
5. Place it in: `C:\Users\YourUsername\.kaggle\kaggle.json`

### Step 3: Run the import script

```bash
cd backend
python scripts/seed_from_kaggle.py
```

This will:
- Download the Flipkart products dataset
- Process and convert to AuraShop format
- Save to `data/products.json`
- You'll get ~5000 real products!

---

## Option 2: Manual Download

If automatic download doesn't work, follow these steps:

### Step 1: Download Dataset Manually

1. Go to: https://www.kaggle.com/datasets/PromptCloudHQ/flipkart-products
2. Click "Download" button
3. Extract the ZIP file
4. You should get a CSV file (e.g., `flipkart_com-ecommerce_sample.csv`)

### Step 2: Place CSV in Backend

Copy the CSV file to:
```
backend/data/flipkart_products.csv
```

### Step 3: Run Manual Import Script

```bash
cd backend
python scripts/import_flipkart_manual.py
```

---

## Option 3: Use the Code Directly

If you already have the dataset downloaded, here's the code to use:

```python
import kagglehub

# Download latest version
path = kagglehub.dataset_download("PromptCloudHQ/flipkart-products")

print("Path to dataset files:", path)
```

Then run:
```bash
cd backend
python scripts/seed_from_kaggle.py
```

---

## What You'll Get

After importing the Kaggle dataset:

✅ **Real Product Data**
- Actual product names from Flipkart
- Real prices in INR
- Genuine product descriptions
- Real ratings and reviews
- Product images (if available)

✅ **Categories Mapped**
- Clothing → Men's, Women's, Kids
- Electronics → Mobile, Computing, Audio
- Home & Living → Furniture, Kitchen, Decor
- Accessories → Watches, Bags, Jewelry
- Footwear → Casual, Formal, Sports
- Beauty → Skincare, Makeup, Fragrance
- And more!

✅ **AuraShop Format**
- Converted to match your existing schema
- Compatible with all features
- Works with search, filters, recommendations
- Includes QR codes for store pickup

---

## Troubleshooting

### Issue: Permission Denied

**Solution:** Run terminal as Administrator

```bash
# Right-click on PowerShell/Terminal
# Select "Run as Administrator"
cd "C:\Users\YourUsername\...\AuraShop\backend"
pip install kagglehub
```

### Issue: Kaggle API Not Configured

**Solution:** Set up API credentials

1. Download `kaggle.json` from Kaggle settings
2. Create folder: `C:\Users\YourUsername\.kaggle\`
3. Place `kaggle.json` there
4. Run script again

### Issue: CSV File Not Found

**Solution:** Check dataset location

```python
import kagglehub
path = kagglehub.dataset_download("PromptCloudHQ/flipkart-products")
print(f"Dataset location: {path}")
# Go to that location and find the CSV file
```

### Issue: Import Script Fails

**Solution:** Use manual import

1. Download CSV manually from Kaggle
2. Place in `backend/data/flipkart_products.csv`
3. Run manual import script (see below)

---

## Manual Import Script

If automatic download doesn't work, use this script:

Create `backend/scripts/import_flipkart_manual.py`:

```python
"""
Manual import for Flipkart dataset.
Place CSV file at: backend/data/flipkart_products.csv
Run: python scripts/import_flipkart_manual.py
"""
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.seed_from_kaggle import process_kaggle_data
import json

def main():
    backend_dir = Path(__file__).resolve().parent.parent
    csv_path = backend_dir / "data" / "flipkart_products.csv"
    out_path = backend_dir / "data" / "products.json"
    
    if not csv_path.exists():
        print(f"ERROR: CSV file not found at {csv_path}")
        print("\nPlease:")
        print("1. Download dataset from: https://www.kaggle.com/datasets/PromptCloudHQ/flipkart-products")
        print("2. Extract the CSV file")
        print(f"3. Place it at: {csv_path}")
        return
    
    print(f"Processing CSV: {csv_path}")
    products = process_kaggle_data(csv_path, max_products=5000)
    
    if not products:
        print("ERROR: No products processed")
        return
    
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2, ensure_ascii=False)
    
    print(f"\nSUCCESS! Imported {len(products)} products")
    print(f"Output: {out_path}")
    print("\nRestart backend to load new products.")

if __name__ == "__main__":
    main()
```

---

## After Import

Once you've successfully imported the dataset:

1. **Restart Backend**
   ```bash
   # Stop current backend (Ctrl+C in terminal 6)
   # Then restart:
   cd backend
   .venv\Scripts\activate
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Verify Products**
   - Open: http://localhost:3000
   - Browse products
   - You should see real Flipkart products!

3. **Test Features**
   - Search for products
   - Filter by category
   - Add to cart
   - Place orders with new products

---

## Benefits of Real Data

Using Kaggle Flipkart dataset gives you:

1. **Realistic Testing**
   - Real product names and descriptions
   - Actual market prices
   - Genuine product categories

2. **Better Demo**
   - Professional product catalog
   - Recognizable brands
   - Real-world variety

3. **Improved AI**
   - Better recommendations
   - More accurate search
   - Realistic product relationships

---

## Next Steps

After importing the dataset:

1. ✅ Test product browsing
2. ✅ Verify search works
3. ✅ Check categories
4. ✅ Test cart and checkout
5. ✅ Try store pickup with QR codes
6. ✅ Test recommendations

Enjoy your AuraShop with real product data! 🎉
