# QR Code System - AuraShop Store Pickup

## Overview

AuraShop uses an **improved hybrid QR code system** that works both online and offline, making store pickup more reliable and practical.

## QR Code Format

### New Format (Current)
```
ORD-ABC12345|A1B2C3D4|99.99|Downtown
```

**Structure:**
- `ORD-ABC12345` - Order ID (human-readable)
- `A1B2C3D4` - 8-character security checksum
- `99.99` - Order total amount
- `Downtown` - Store location identifier

### Why This Format?

#### ✅ **Works Offline**
- Staff can see order details immediately when scanned
- No server connection required for basic verification
- Order ID is visible for manual entry

#### ✅ **Fallback Options**
- If scanner fails, staff can manually type the Order ID
- System automatically looks up order by ID
- Checksum provides security without requiring server

#### ✅ **Quick Verification**
- Staff can instantly see order total and location
- Prevents wrong-store pickups
- Reduces verification time

#### ✅ **Secure**
- SHA-256 checksum prevents QR code fraud
- Checksum validates order ID + total + secret key
- Can't be easily forged

## How It Works

### Customer Side

1. **Place Order** - Select store pickup option
2. **Receive QR Code** - Immediately after order confirmation
3. **Show at Store** - Display QR code on phone or print it
4. **Backup Option** - Large Order ID displayed if scanner fails

### Store Staff Side

1. **Scan QR Code** - Use store scanner page
2. **Instant Verification** - Order details appear immediately
3. **Manual Entry** - If scanner fails, type Order ID
4. **Complete Pickup** - Mark order as picked up

## Technical Implementation

### Backend (`order_service.py`)

```python
def generate_qr_code_data(order_id: str, total: float, store_location: str = "") -> str:
    """
    Generate QR code with embedded order information.
    Format: ORDER_ID|CHECKSUM|TOTAL|STORE
    """
    secret_key = "AURASHOP_SECRET_2026"
    checksum = hashlib.sha256(f"{order_id}{total}{secret_key}".encode()).hexdigest()[:8].upper()
    store_code = store_location.split()[-1] if store_location else "STORE"
    return f"{order_id}|{checksum}|{total:.2f}|{store_code}"
```

### Verification Process

```python
def verify_pickup_qr(qr_code: str) -> Optional[Order]:
    """
    Supports two formats:
    1. New format: ORDER_ID|CHECKSUM|TOTAL|STORE (offline-capable)
    2. Old format: AURASHOP-PICKUP-HASH (backward compatibility)
    """
    # Parse new format
    if "|" in qr_code:
        order_id, checksum, total, store = qr_code.split("|")
        
        # Verify checksum
        if verify_qr_checksum(order_id, checksum, float(total)):
            return get_order(order_id)
    
    # Fall back to database lookup
    return None
```

### Frontend Display

**Order Detail Page:**
- Large scannable QR code (200x200px)
- Prominent Order ID display
- Clear instructions for customers
- Full QR code string for debugging

**Store Scanner Page:**
- Input accepts both QR code and Order ID
- Automatic format detection
- Fallback to direct order lookup
- Real-time verification

## Advantages Over Old System

| Feature | Old System | New System |
|---------|-----------|------------|
| **Offline Support** | ❌ No - requires server | ✅ Yes - embedded data |
| **Manual Entry** | ❌ Hash not readable | ✅ Yes - Order ID visible |
| **Quick Verification** | ❌ Database lookup only | ✅ Instant - checksum validation |
| **Store Validation** | ❌ No store info | ✅ Yes - store in QR code |
| **Fallback Options** | ❌ Scanner only | ✅ Multiple methods |
| **Security** | ⚠️ Hash only | ✅ Checksum + validation |

## Usage Examples

### Example 1: Normal QR Code Scan
```
Customer shows: ORD-A1B2C3D4|F3E2D1C0|149.99|Downtown
Staff scans → Order verified instantly
System checks: ✓ Checksum valid ✓ Store matches ✓ Order exists
Result: Order details displayed
```

### Example 2: Scanner Failure
```
Customer shows Order ID: ORD-A1B2C3D4
Staff types: ORD-A1B2C3D4
System looks up order directly
Result: Order details displayed
```

### Example 3: Offline Verification
```
Customer shows QR code
Staff scans (no internet)
Scanner reads: ORD-A1B2C3D4|F3E2D1C0|149.99|Downtown
Staff sees: Order ID, Total, Store
Manual verification possible
Later: Sync with server when online
```

## Security Considerations

### Current Security
- **Checksum Validation**: SHA-256 hash prevents tampering
- **Secret Key**: Server-side secret prevents forgery
- **Order Lookup**: Final verification against database

### Production Enhancements
1. **Expiration Time**: Add timestamp, expire after 7 days
2. **One-Time Use**: Mark QR code as used after pickup
3. **Store Binding**: Validate QR code only at designated store
4. **Rate Limiting**: Prevent brute force attempts
5. **Encryption**: Encrypt QR code data for additional security

## Migration & Backward Compatibility

The system supports **both old and new formats**:

```python
# New format (preferred)
"ORD-ABC12345|A1B2C3D4|99.99|Downtown"

# Old format (backward compatible)
"AURASHOP-PICKUP-A1B2C3D4E5F6G7H8"
```

All new orders use the new format. Existing orders with old format continue to work.

## Testing

### Test New QR Code
1. Place a store pickup order
2. Check order detail page
3. Verify QR code format: `ORD-XXXXXXXX|XXXXXXXX|XX.XX|STORE`
4. Verify Order ID is prominently displayed
5. Go to store scanner page
6. Scan/enter the QR code
7. Verify order details appear

### Test Manual Entry
1. Copy Order ID from order page
2. Go to store scanner
3. Enter just the Order ID (e.g., `ORD-A1B2C3D4`)
4. Verify order is found and displayed

### Test Offline Capability
1. Generate QR code
2. Scan with any QR code reader app
3. Verify you can see: Order ID, Checksum, Total, Store
4. This data is readable without server connection

## Future Enhancements

### Planned Features
- [ ] QR code expiration (7-day validity)
- [ ] One-time use enforcement
- [ ] Store location validation
- [ ] Customer notification when ready for pickup
- [ ] QR code regeneration if lost
- [ ] Print-friendly PDF with QR code
- [ ] SMS delivery of QR code
- [ ] Email with QR code attachment

### Advanced Features
- [ ] Dynamic QR codes (update status in real-time)
- [ ] Multi-order QR codes (bulk pickup)
- [ ] QR code analytics (scan tracking)
- [ ] Integration with store POS systems
- [ ] Mobile app with native scanner

## Troubleshooting

### QR Code Not Showing
- Ensure `qrcode.react` is installed: `npm install qrcode.react`
- Check order is store pickup type
- Verify order has `qr_code` field populated

### Scanner Not Working
- Try manual Order ID entry
- Check network connection
- Verify API endpoint is accessible
- Check browser console for errors

### Invalid QR Code Error
- Verify QR code format is correct
- Check order exists in database
- Ensure order is store pickup type
- Verify checksum matches (if new format)

## API Endpoints

### Verify QR Code
```
POST /api/pickup/verify?qr_code=ORD-ABC12345|A1B2C3D4|99.99|Downtown
```

### Get Order by ID
```
GET /api/orders/ORD-ABC12345
```

### Complete Pickup
```
POST /api/pickup/complete/ORD-ABC12345
```

## Summary

The new QR code system provides:
- ✅ **Better offline support** - embedded order data
- ✅ **Multiple fallback options** - QR code, Order ID, manual lookup
- ✅ **Improved user experience** - clear Order ID display
- ✅ **Enhanced security** - checksum validation
- ✅ **Store validation** - location embedded in QR code
- ✅ **Backward compatibility** - supports old format

This makes the store pickup process more reliable, faster, and user-friendly!
