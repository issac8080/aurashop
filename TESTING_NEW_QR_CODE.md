# Testing the New QR Code System

## Quick Test Guide

Follow these steps to test the improved QR code system:

### 1. Place a Store Pickup Order

1. Open the frontend: http://localhost:3000
2. Browse products and add items to cart
3. Go to checkout
4. **Select "Store Pickup"** (important!)
5. Choose a store location
6. Place the order

### 2. View the New QR Code

After placing the order, you'll be redirected to the order detail page. You should see:

**✅ What to Look For:**
- Large QR code (200x200px) in a white card
- **NEW:** Prominent Order ID display below the QR code
  - Text: "Order ID (if scanner fails):"
  - Large font Order ID (e.g., `ORD-ABC12345`)
  - Help text: "Staff can manually enter this order ID"
- Full QR code string at the bottom

**Example QR Code Format:**
```
ORD-ABC12345|97B98D7E|99.99|Downtown
```

**Parts Explained:**
- `ORD-ABC12345` - Your order ID (human-readable)
- `97B98D7E` - Security checksum
- `99.99` - Order total
- `Downtown` - Store location

### 3. Test the Store Scanner

#### Option A: Scan Full QR Code

1. Go to: http://localhost:3000/store-scanner
2. Copy the full QR code string from your order page
3. Paste it into the scanner input
4. Click "Verify"
5. **Expected Result:** Order details appear immediately

#### Option B: Enter Just the Order ID (NEW!)

1. Go to: http://localhost:3000/store-scanner
2. Copy ONLY the Order ID (e.g., `ORD-ABC12345`)
3. Paste it into the scanner input
4. Click "Verify"
5. **Expected Result:** System finds the order and displays details

### 4. Complete the Pickup

After verification:
1. Review the order details shown
2. Click "Complete Pickup"
3. **Expected Result:** Success message appears
4. Order status changes to "Picked Up"

## What's Different from Before?

### Old System
```
QR Code: AURASHOP-PICKUP-A1B2C3D4E5F6G7H8
- Just a hash
- Meaningless without server
- No fallback option
```

### New System
```
QR Code: ORD-ABC12345|97B98D7E|99.99|Downtown
- Contains Order ID
- Shows total and store
- Can use Order ID alone
- Works offline
```

## Test Scenarios

### Scenario 1: Happy Path (QR Code Scan)
```
1. Place order → Get QR code
2. Go to scanner → Paste full QR code
3. Verify → See order details
4. Complete → Success!
```

### Scenario 2: Scanner Failure (Order ID Fallback) - NEW!
```
1. Place order → Get QR code
2. Scanner broken/not working
3. Customer shows Order ID: ORD-ABC12345
4. Staff types Order ID only
5. Verify → See order details
6. Complete → Success!
```

### Scenario 3: Offline Verification - NEW!
```
1. Place order → Get QR code: ORD-ABC12345|97B98D7E|99.99|Downtown
2. No internet connection
3. Staff can still see:
   - Order ID: ORD-ABC12345
   - Total: $99.99
   - Store: Downtown
4. Manual verification possible
5. Complete later when online
```

## Verification Checklist

Use this checklist to verify everything works:

### Frontend (Customer Side)
- [ ] QR code displays on order detail page
- [ ] QR code is large and scannable (200x200px)
- [ ] Order ID is prominently displayed
- [ ] Order ID is in large, readable font
- [ ] Help text explains manual entry option
- [ ] Full QR code string is shown at bottom
- [ ] QR code format is: `ORD-XXXXXXXX|XXXXXXXX|XX.XX|STORE`

### Frontend (Store Scanner)
- [ ] Scanner accepts full QR code
- [ ] Scanner accepts Order ID only
- [ ] Placeholder shows: "ORD-ABC12345 or scan QR code"
- [ ] Help text mentions manual entry
- [ ] Order details display after verification
- [ ] Can complete pickup successfully

### Backend
- [ ] New QR code format is generated
- [ ] Checksum is validated correctly
- [ ] Order ID lookup works
- [ ] Backward compatibility maintained (if old orders exist)

## Common Issues & Solutions

### Issue: QR Code Shows Old Format
**Problem:** QR code still shows `AURASHOP-PICKUP-XXXXXXXX`
**Solution:** 
- Backend may not have reloaded
- Check terminal 6 for reload message
- If needed, restart backend: Ctrl+C then run again

### Issue: Order ID Not Showing
**Problem:** Order ID section not visible on order page
**Solution:**
- Clear browser cache
- Hard refresh: Ctrl+Shift+R
- Restart frontend if needed

### Issue: Scanner Doesn't Accept Order ID
**Problem:** Typing Order ID doesn't work
**Solution:**
- Make sure Order ID starts with "ORD-"
- Try full QR code instead
- Check browser console for errors

### Issue: "Invalid QR code" Error
**Problem:** Valid QR code shows as invalid
**Solution:**
- Verify order is store pickup (not delivery)
- Check QR code format has 4 parts separated by |
- Ensure backend has reloaded with new code

## Backend Test Script

You can also run the automated test:

```bash
python backend/test_qr_code.py
```

**Expected Output:**
```
Testing QR Code Generation
✓ Basic order: ORD-ABC12345|97B98D7E|99.99|Downtown
✓ Different order: ORD-XYZ98765|9F513A9F|149.50|Mall

Testing QR Code Verification
✓ Valid checksum: PASS
✓ Invalid checksum rejected: PASS
✓ Wrong total rejected: PASS

Testing Offline Readability
✓ All information visible offline!

All Tests Complete!
```

## Example Test Flow

Here's a complete test you can run:

```
1. Open http://localhost:3000
2. Add "Wireless Headphones" to cart
3. Go to checkout
4. Select "Store Pickup"
5. Choose "AuraShop Downtown"
6. Place order
7. Note the Order ID (e.g., ORD-ABC12345)
8. Note the full QR code (e.g., ORD-ABC12345|97B98D7E|99.99|Downtown)
9. Open http://localhost:3000/store-scanner in new tab
10. Test A: Paste full QR code → Should verify
11. Test B: Paste just Order ID → Should also verify
12. Click "Complete Pickup"
13. Go back to order page → Status should be "Picked Up"
```

## Success Criteria

The new system is working correctly if:

1. ✅ QR code contains Order ID (not just hash)
2. ✅ Order ID is displayed prominently on order page
3. ✅ Scanner accepts both full QR code and Order ID
4. ✅ Order details show immediately after verification
5. ✅ Can complete pickup successfully
6. ✅ All information is human-readable

## Next Steps After Testing

Once you've verified everything works:

1. Test with multiple orders
2. Try different store locations
3. Test with different order totals
4. Verify checksum security (try tampering)
5. Test backward compatibility (if old orders exist)

## Questions?

If you encounter any issues:

1. Check the documentation: `QR_CODE_SYSTEM.md`
2. Review implementation: `QR_CODE_IMPROVEMENTS.md`
3. Run test script: `python backend/test_qr_code.py`
4. Check backend logs in terminal 6
5. Check frontend console for errors

---

**Happy Testing!** 🎉

The new QR code system is designed to be more practical, reliable, and user-friendly for real-world store pickup scenarios.
