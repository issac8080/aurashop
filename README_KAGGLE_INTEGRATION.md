# Kaggle Flipkart Dataset Integration

## Overview

AuraShop now supports importing real product data from the **Kaggle Flipkart Products Dataset**! This gives you thousands of real products with actual names, prices, and descriptions instead of synthetic data.

## Quick Start (3 Steps)

### Step 1: Install kagglehub

**Option A: Regular Installation**
```bash
pip install kagglehub
```

**Option B: If you get permission errors**
```bash
# Run PowerShell as Administrator
# Right-click PowerShell → "Run as Administrator"
pip install kagglehub
```

### Step 2: Download Dataset

**Easy way:**
```bash
python download_kaggle_dataset.py
```

This will:
- Check if kagglehub is installed
- Download the Flipkart dataset
- Show you where it's located
- Tell you what to do next

### Step 3: Import Products

```bash
cd backend
python scripts/seed_from_kaggle.py
```

This will:
- Find the downloaded dataset
- Process ~5000 products
- Convert to AuraShop format
- Save to `data/products.json`

**Done!** Restart your backend and you'll have real products!

---

## Alternative: Manual Download

If automatic download doesn't work:

### 1. Download Manually

1. Go to: https://www.kaggle.com/datasets/PromptCloudHQ/flipkart-products
2. Click "Download" (you may need to sign in to Kaggle)
3. Extract the ZIP file
4. Find the CSV file (e.g., `flipkart_com-ecommerce_sample.csv`)

### 2. Place CSV File

Copy the CSV to:
```
backend/data/flipkart_products.csv
```

### 3. Run Manual Import

```bash
cd backend
python scripts/import_flipkart_manual.py
```

---

## What You Get

### Real Product Data

✅ **Actual Flipkart Products**
- Real product names
- Genuine descriptions
- Market prices in INR
- Product ratings
- Brand names
- Product images (when available)

### Categories Included

The dataset includes products from:
- **Clothing** - Men's, Women's, Kids wear
- **Electronics** - Mobiles, Laptops, Audio, Cameras
- **Home & Living** - Furniture, Kitchen, Decor
- **Accessories** - Watches, Bags, Jewelry
- **Footwear** - Casual, Formal, Sports shoes
- **Beauty** - Skincare, Makeup, Fragrance
- **Sports & Outdoors** - Fitness, Camping, Yoga
- **Books & Stationery** - Books, Notebooks, Pens
- **Toys & Games** - Educational, Board games

### AuraShop Format

All products are converted to match your schema:
```json
{
  "id": "P00001",
  "name": "Product Name",
  "description": "Product description",
  "price": 999.00,
  "currency": "INR",
  "category": "Electronics",
  "subcategory": "Mobile",
  "brand": "Brand Name",
  "rating": 4.5,
  "review_count": 150,
  "colors": ["Black", "White"],
  "sizes": [],
  "image_url": "https://...",
  "tags": ["electronics", "mobile"],
  "in_stock": true,
  "stock_count": 50
}
```

---

## Files Created

### Scripts

1. **`download_kaggle_dataset.py`** (root)
   - Simple downloader script
   - Checks installation
   - Downloads dataset
   - Shows next steps

2. **`backend/scripts/seed_from_kaggle.py`**
   - Main import script
   - Downloads and processes dataset
   - Converts to AuraShop format
   - Saves to products.json

3. **`backend/scripts/import_flipkart_manual.py`**
   - Manual import option
   - For pre-downloaded CSV files
   - Same output format

### Documentation

1. **`KAGGLE_DATASET_SETUP.md`**
   - Complete setup guide
   - Troubleshooting tips
   - Multiple installation options

2. **`README_KAGGLE_INTEGRATION.md`** (this file)
   - Quick start guide
   - Overview and benefits

---

## Usage Examples

### Example 1: First Time Setup

```bash
# 1. Install kagglehub
pip install kagglehub

# 2. Download dataset
python download_kaggle_dataset.py

# 3. Import products
cd backend
python scripts/seed_from_kaggle.py

# 4. Restart backend
# Stop current server (Ctrl+C)
.venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 5. Open frontend
# Go to http://localhost:3000
```

### Example 2: Update Products

```bash
# Re-download and import latest data
cd backend
python scripts/seed_from_kaggle.py

# Restart backend to load new products
```

### Example 3: Manual Import

```bash
# 1. Download CSV from Kaggle website
# 2. Place in backend/data/flipkart_products.csv
# 3. Run import
cd backend
python scripts/import_flipkart_manual.py
```

---

## Troubleshooting

### Issue: kagglehub not installed

**Error:**
```
ModuleNotFoundError: No module named 'kagglehub'
```

**Solution:**
```bash
pip install kagglehub
```

If that fails, run as administrator:
```bash
# Right-click PowerShell → Run as Administrator
pip install kagglehub
```

---

### Issue: Kaggle API not configured

**Error:**
```
Kaggle credentials not found
```

**Solution:**

1. Go to https://www.kaggle.com/settings
2. Scroll to "API" section
3. Click "Create New Token"
4. Download `kaggle.json`
5. Place it here: `C:\Users\YourUsername\.kaggle\kaggle.json`

Or use manual download method instead.

---

### Issue: Permission denied

**Error:**
```
[Errno 13] Permission denied
```

**Solution:**

Run terminal as Administrator:
1. Right-click PowerShell/Terminal
2. Select "Run as Administrator"
3. Navigate to project folder
4. Run the command again

---

### Issue: CSV file not found

**Error:**
```
Could not find CSV file in dataset
```

**Solution:**

The dataset structure might have changed. Try:

1. Check where dataset was downloaded:
   ```python
   import kagglehub
   path = kagglehub.dataset_download("PromptCloudHQ/flipkart-products")
   print(path)
   ```

2. Go to that folder and find the CSV file

3. Copy it to: `backend/data/flipkart_products.csv`

4. Run manual import:
   ```bash
   python backend/scripts/import_flipkart_manual.py
   ```

---

### Issue: No products imported

**Error:**
```
No products were processed
```

**Solution:**

Check the CSV file format:
1. Open the CSV in a text editor
2. Check if it has headers (first row)
3. Check if it has data rows
4. Verify columns exist (product_name, price, category, etc.)

If CSV is valid but import fails, check the script output for column mapping.

---

## Features Maintained

All AuraShop features work with Kaggle data:

✅ **Search & Filter**
- Search by product name
- Filter by category
- Filter by price range
- Sort by price/rating

✅ **Shopping**
- Add to cart
- Checkout process
- Order management
- Order history

✅ **Store Pickup**
- QR code generation
- Store scanner
- Pickup verification
- Works with real products!

✅ **AI Features**
- Product recommendations
- Smart search
- Personalization
- All work with real data

---

## Data Processing

### Category Mapping

Flipkart categories are automatically mapped to AuraShop categories:

| Flipkart Category | AuraShop Category | Subcategory |
|-------------------|-------------------|-------------|
| Men's Clothing | Clothing | Men's Wear |
| Women's Clothing | Clothing | Women's Wear |
| Mobiles | Electronics | Mobile |
| Laptop | Electronics | Computing |
| Watches | Accessories | Watches |
| Footwear | Footwear | Casual |
| Beauty | Beauty | Skincare |
| Sports | Sports & Outdoors | Fitness |
| Books | Books & Stationery | Books |
| Toys | Toys & Games | Educational |

### Price Cleaning

Prices are automatically cleaned and normalized:
- Removes currency symbols (₹, Rs)
- Removes commas
- Converts to float
- Validates reasonable range
- Defaults to random price if invalid

### Rating Extraction

Ratings are extracted and validated:
- Extracts numeric rating (0-5)
- Rounds to 1 decimal place
- Defaults to 3.5-5.0 if missing

### Color Extraction

Colors are extracted from product text:
- Searches for common color names
- Extracts from name and description
- Provides 2-5 colors per product
- Falls back to random colors if none found

---

## Benefits

### 1. Realistic Demo

- Professional product catalog
- Recognizable brands and products
- Real market prices
- Actual product descriptions

### 2. Better Testing

- Test with real-world data
- Diverse product range
- Various price points
- Different categories

### 3. Improved AI

- Better recommendations
- More accurate search results
- Realistic product relationships
- Enhanced personalization

### 4. Production Ready

- Real product data structure
- Proven data format
- Market-tested categories
- Professional presentation

---

## Comparison

### Before (Synthetic Data)

```json
{
  "name": "Classic Premium T-Shirts",
  "price": 799.0,
  "description": "Premium quality. Perfect for everyday use.",
  "brand": "Aura Basics"
}
```

### After (Kaggle Data)

```json
{
  "name": "Peter England Men's Solid Regular Fit Casual Shirt",
  "price": 1299.0,
  "description": "Comfortable cotton shirt with modern fit...",
  "brand": "Peter England"
}
```

---

## Next Steps

After importing Kaggle data:

1. ✅ **Browse Products**
   - Open http://localhost:3000
   - See real Flipkart products
   - Test search and filters

2. ✅ **Test Shopping**
   - Add products to cart
   - Complete checkout
   - Place orders

3. ✅ **Try Store Pickup**
   - Select store pickup
   - Get QR code
   - Test scanner

4. ✅ **Check Recommendations**
   - View product recommendations
   - Test personalization
   - See related products

5. ✅ **Customize Further**
   - Add more products
   - Update categories
   - Enhance descriptions
   - Add custom images

---

## Support

If you encounter issues:

1. Check `KAGGLE_DATASET_SETUP.md` for detailed setup
2. Review error messages in console
3. Try manual download method
4. Check Kaggle API credentials
5. Verify CSV file format

---

## Summary

You now have three ways to get products:

1. **Synthetic Data** (original)
   - Run: `python backend/scripts/seed_products.py`
   - Gets: 5000 generated products

2. **Kaggle Data** (new - automatic)
   - Run: `python backend/scripts/seed_from_kaggle.py`
   - Gets: Real Flipkart products

3. **Kaggle Data** (new - manual)
   - Download CSV manually
   - Run: `python backend/scripts/import_flipkart_manual.py`
   - Gets: Real Flipkart products

Choose the method that works best for you!

---

**Enjoy your AuraShop with real product data!** 🎉
