"""
Simple script to download Kaggle Flipkart dataset.
Run this first, then run the import script.
"""

def main():
    print("=" * 60)
    print("Kaggle Flipkart Dataset Downloader")
    print("=" * 60)
    
    # Try to import kagglehub
    try:
        import kagglehub
        print("\n✓ kagglehub is installed")
    except ImportError:
        print("\n✗ kagglehub is not installed")
        print("\nPlease install it first:")
        print("  pip install kagglehub")
        print("\nOr run as administrator:")
        print("  1. Right-click on PowerShell/Terminal")
        print("  2. Select 'Run as Administrator'")
        print("  3. Run: pip install kagglehub")
        return
    
    # Download dataset
    print("\nDownloading Flipkart products dataset...")
    print("(This may take a few minutes)")
    
    try:
        path = kagglehub.dataset_download("PromptCloudHQ/flipkart-products")
        print(f"\n✓ Dataset downloaded successfully!")
        print(f"\nDataset location: {path}")
        
        # List files in the dataset
        from pathlib import Path
        dataset_path = Path(path)
        
        print("\nFiles in dataset:")
        for file in dataset_path.rglob("*"):
            if file.is_file():
                print(f"  - {file.name} ({file.stat().st_size / 1024:.1f} KB)")
        
        print("\n" + "=" * 60)
        print("Next Steps:")
        print("=" * 60)
        print("1. Run the import script:")
        print("   cd backend")
        print("   python scripts/seed_from_kaggle.py")
        print("\n2. Or use manual import if needed:")
        print("   python scripts/import_flipkart_manual.py")
        
    except Exception as e:
        print(f"\n✗ Error downloading dataset: {e}")
        print("\nPossible solutions:")
        print("1. Set up Kaggle API credentials:")
        print("   - Go to https://www.kaggle.com/settings")
        print("   - Click 'Create New Token'")
        print("   - Place kaggle.json in: C:\\Users\\YourUsername\\.kaggle\\")
        print("\n2. Or download manually:")
        print("   - Go to: https://www.kaggle.com/datasets/PromptCloudHQ/flipkart-products")
        print("   - Click Download")
        print("   - Extract and place CSV in: backend/data/flipkart_products.csv")
        print("   - Run: python backend/scripts/import_flipkart_manual.py")

if __name__ == "__main__":
    main()
