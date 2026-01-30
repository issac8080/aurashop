"""
Test script for the new QR code system.
Run this to verify QR code generation and verification works correctly.
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.order_service import generate_qr_code_data, verify_qr_checksum

def test_qr_generation():
    """Test QR code generation."""
    print("=" * 60)
    print("Testing QR Code Generation")
    print("=" * 60)
    
    # Test case 1: Basic order
    order_id = "ORD-ABC12345"
    total = 99.99
    store = "AuraShop Downtown"
    
    qr_code = generate_qr_code_data(order_id, total, store)
    print(f"\n1. Basic Order:")
    print(f"   Order ID: {order_id}")
    print(f"   Total: ${total}")
    print(f"   Store: {store}")
    print(f"   QR Code: {qr_code}")
    
    # Parse the QR code
    parts = qr_code.split("|")
    print(f"\n   Parsed:")
    print(f"   - Order ID: {parts[0]}")
    print(f"   - Checksum: {parts[1]}")
    print(f"   - Total: ${parts[2]}")
    print(f"   - Store: {parts[3]}")
    
    # Test case 2: Different order
    order_id2 = "ORD-XYZ98765"
    total2 = 149.50
    store2 = "AuraShop Mall"
    
    qr_code2 = generate_qr_code_data(order_id2, total2, store2)
    print(f"\n2. Another Order:")
    print(f"   Order ID: {order_id2}")
    print(f"   Total: ${total2}")
    print(f"   Store: {store2}")
    print(f"   QR Code: {qr_code2}")
    
    # Test case 3: No store location
    order_id3 = "ORD-TEST1234"
    total3 = 50.00
    
    qr_code3 = generate_qr_code_data(order_id3, total3)
    print(f"\n3. Order Without Store:")
    print(f"   Order ID: {order_id3}")
    print(f"   Total: ${total3}")
    print(f"   QR Code: {qr_code3}")


def test_qr_verification():
    """Test QR code checksum verification."""
    print("\n" + "=" * 60)
    print("Testing QR Code Verification")
    print("=" * 60)
    
    # Test valid checksum
    order_id = "ORD-ABC12345"
    total = 99.99
    qr_code = generate_qr_code_data(order_id, total)
    parts = qr_code.split("|")
    checksum = parts[1]
    
    is_valid = verify_qr_checksum(order_id, checksum, total)
    print(f"\n1. Valid Checksum:")
    print(f"   Order ID: {order_id}")
    print(f"   Total: ${total}")
    print(f"   Checksum: {checksum}")
    print(f"   Valid: {is_valid} [PASS]" if is_valid else f"   Valid: {is_valid} [FAIL]")
    
    # Test invalid checksum (tampered)
    fake_checksum = "AAAAAAAA"
    is_valid2 = verify_qr_checksum(order_id, fake_checksum, total)
    print(f"\n2. Invalid Checksum (Tampered):")
    print(f"   Order ID: {order_id}")
    print(f"   Total: ${total}")
    print(f"   Checksum: {fake_checksum}")
    print(f"   Valid: {is_valid2} [PASS]" if not is_valid2 else f"   Valid: {is_valid2} [FAIL]")
    
    # Test wrong total
    wrong_total = 199.99
    is_valid3 = verify_qr_checksum(order_id, checksum, wrong_total)
    print(f"\n3. Wrong Total (Fraud Attempt):")
    print(f"   Order ID: {order_id}")
    print(f"   Total: ${wrong_total} (should be ${total})")
    print(f"   Checksum: {checksum}")
    print(f"   Valid: {is_valid3} [PASS]" if not is_valid3 else f"   Valid: {is_valid3} [FAIL]")


def test_qr_parsing():
    """Test QR code parsing and offline readability."""
    print("\n" + "=" * 60)
    print("Testing Offline Readability")
    print("=" * 60)
    
    order_id = "ORD-DEMO1234"
    total = 75.50
    store = "AuraShop Express"
    
    qr_code = generate_qr_code_data(order_id, total, store)
    
    print(f"\nQR Code: {qr_code}")
    print("\nWhat staff can see without server:")
    print(f"  Order ID: {qr_code.split('|')[0]}")
    print(f"  Total: ${qr_code.split('|')[2]}")
    print(f"  Store: {qr_code.split('|')[3]}")
    print(f"  Security: {qr_code.split('|')[1]}")
    print("\nAll information visible offline!")


def main():
    """Run all tests."""
    print("\nAuraShop QR Code System Test Suite\n")
    
    test_qr_generation()
    test_qr_verification()
    test_qr_parsing()
    
    print("\n" + "=" * 60)
    print("All Tests Complete!")
    print("=" * 60)
    print("\nThe new QR code system:")
    print("  - Generates human-readable codes")
    print("  - Includes order details for offline use")
    print("  - Validates checksums for security")
    print("  - Works without server connection")
    print("  - Supports manual Order ID entry")
    print("\n")


if __name__ == "__main__":
    main()
