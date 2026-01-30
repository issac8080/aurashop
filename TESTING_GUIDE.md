# 🧪 Testing Guide - Verify All Features Work

## ⚡ Quick Test (2 minutes)

### 1. Search (15 seconds)
```
✓ Type "electronics" in search bar
✓ Press Enter
✓ See 3-4 products
```

### 2. Recommendations (15 seconds)
```
✓ Go to home page
✓ Scroll to "Recommended for You"
✓ See 8 products in carousel
```

### 3. Chatbot (30 seconds)
```
✓ Click chat button (bottom-right, gradient with pulse)
✓ Type: "Best casual wear under ₹3000"
✓ Get response with product suggestions
✓ See product IDs mentioned (P001, P002, etc.)
```

### 4. Add to Cart (30 seconds)
```
✓ Click "Add to cart" on any product
✓ Cart badge pulses and shows "1"
✓ Click cart icon
✓ See product in cart
```

### 5. Cancel Order (30 seconds)
```
✓ Go to cart → Checkout
✓ Fill form → Place order
✓ On order detail page, see "Cancel Order" button
✓ Click → Confirm → Status changes to "Cancelled"
```

---

## 🔍 Detailed Testing

### Feature 1: Search Functionality

**Test Case 1.1: Basic Search**
```
Steps:
1. Click in search bar (header)
2. Type "casual"
3. Press Enter

Expected:
- Navigate to /search?q=casual
- See "X results for 'casual'"
- Products with "casual" in name/description/tags appear
- Can add to cart from results
```

**Test Case 1.2: Empty Search**
```
Steps:
1. Click search bar
2. Press Enter without typing

Expected:
- Nothing happens (stays on current page)
```

**Test Case 1.3: No Results**
```
Steps:
1. Search for "xyz123nonexistent"

Expected:
- See "0 results for 'xyz123nonexistent'"
- Empty state with message
```

**Test Case 1.4: Clear Search**
```
Steps:
1. Type "electronics"
2. Click X button in search bar

Expected:
- Search input clears
- Can type new query
```

---

### Feature 2: Recommendations

**Test Case 2.1: Home Page Recommendations**
```
Steps:
1. Go to http://localhost:3000

Expected:
- "Recommended for You" section visible
- 8 products in horizontal carousel
- Can scroll left/right
- AI badges visible (Best Match, Value for Money, etc.)
```

**Test Case 2.2: Product Page Top Picks**
```
Steps:
1. Go to /products

Expected:
- Blue banner: "Top picks based on your browsing"
- Products shown below
```

**Test Case 2.3: Cart Upsells**
```
Steps:
1. Add 2 products to cart
2. Go to /cart

Expected:
- "People like you also bought" section
- 4 recommended products
- Can add to cart from there
```

**Test Case 2.4: Product Detail Similar Items**
```
Steps:
1. Click any product
2. Scroll down

Expected:
- "Similar products" section
- 4 related products
- Same category or style
```

---

### Feature 3: AI Chatbot

**Test Case 3.1: Open Chat**
```
Steps:
1. Look for gradient button (bottom-right)
2. Should pulse/animate
3. Click it

Expected:
- Chat panel slides in from right
- Welcome message visible
- 6 suggested prompts shown
- Input field at bottom
```

**Test Case 3.2: Simple Query**
```
Steps:
1. Open chat
2. Type: "Show me electronics"
3. Press Enter

Expected:
- Loading indicator
- Response within 2-5 seconds
- Mentions product IDs (P001, P002, etc.)
- Inline product cards appear
```

**Test Case 3.3: Complex Query**
```
Steps:
1. Type: "Best casual wear for office under ₹3000"

Expected:
- Response explains reasoning
- Mentions budget constraint
- Suggests 2-4 products
- Product cards show prices under ₹3000
```

**Test Case 3.4: Comparison Query**
```
Steps:
1. Type: "Compare P001 and P002"

Expected:
- Response highlights differences
- Mentions price, features, ratings
- Helps decide between them
```

**Test Case 3.5: Suggested Prompts**
```
Steps:
1. Click any suggested prompt

Expected:
- Prompt fills input
- Sends automatically
- Gets relevant response
```

**Test Case 3.6: Product Card Click**
```
Steps:
1. Get response with product cards
2. Click a product card

Expected:
- Navigate to product detail page
- Chat closes
```

---

### Feature 4: Add to Cart

**Test Case 4.1: From Home Page**
```
Steps:
1. Go to home
2. Find any product card
3. Click "Add to cart"

Expected:
- Cart badge appears/increments
- Badge pulses with animation
- Product added to cart
```

**Test Case 4.2: From Products Page**
```
Steps:
1. Go to /products
2. Click "Add to cart" on any product

Expected:
- Same as 4.1
```

**Test Case 4.3: From Search Results**
```
Steps:
1. Search for "electronics"
2. Click "Add to cart" on result

Expected:
- Same as 4.1
```

**Test Case 4.4: From Product Detail**
```
Steps:
1. Click any product
2. On detail page, click "Add to cart"

Expected:
- Same as 4.1
```

**Test Case 4.5: Multiple Items**
```
Steps:
1. Add 3 different products
2. Check cart badge

Expected:
- Badge shows "3"
- If > 9, shows "9+"
```

**Test Case 4.6: View Cart**
```
Steps:
1. Add 2 products
2. Click cart icon (header)

Expected:
- Navigate to /cart
- See 2 products listed
- Each with name, price, image
- Remove button on each
- Order summary on right
```

---

### Feature 5: Cancel Order

**Test Case 5.1: Place Order**
```
Steps:
1. Add products to cart
2. Go to checkout
3. Fill: Name "Test", Phone "1234567890"
4. Select "Store Pickup"
5. Choose "AuraShop Downtown"
6. Click "Place Order"

Expected:
- Navigate to /orders/ORD-XXXXXXXX
- See order details
- See QR code (large, scannable)
- Status: "Pending"
```

**Test Case 5.2: Cancel Button Visible**
```
Steps:
1. On order detail page
2. Scroll to order summary (right side)

Expected:
- Red "Cancel Order" button at bottom
- Below order total
- Has X icon
```

**Test Case 5.3: Cancel Order**
```
Steps:
1. Click "Cancel Order"
2. See confirmation dialog
3. Click "OK"

Expected:
- Button shows "Cancelling..."
- After 1-2 seconds:
  - Status badge changes to "Cancelled" (red)
  - Cancel button disappears
  - Alert: "Order cancelled successfully"
```

**Test Case 5.4: Cancel Button Hidden**
```
Steps:
1. Create order
2. Use store scanner to complete pickup
   OR manually change status to "delivered"
3. Refresh order page

Expected:
- No "Cancel Order" button
- Only for completed orders
```

**Test Case 5.5: Cancel from Profile**
```
Steps:
1. Go to /profile
2. See order in history
3. Click order
4. Cancel it

Expected:
- Same as 5.3
- Can return to profile
- Order shows "Cancelled" badge
```

---

## 🎯 Integration Tests

### End-to-End Flow 1: Browse → Search → Cart → Checkout
```
1. Open home page
2. Search for "casual"
3. Add 2 products to cart
4. Go to cart
5. Proceed to checkout
6. Place order (home delivery)
7. View order details
8. Cancel order

Expected: All steps work smoothly
```

### End-to-End Flow 2: Chat → Add to Cart → Pickup
```
1. Open chat
2. Ask "Show trending products"
3. Click product card
4. Add to cart from detail page
5. Checkout with store pickup
6. Get QR code
7. Go to /store-scanner
8. Verify QR code
9. Complete pickup

Expected: Full pickup flow works
```

### End-to-End Flow 3: Profile Management
```
1. Go to profile
2. Edit name and email
3. Save
4. Place 2 orders
5. View order history
6. Click each order
7. Cancel one order
8. Check stats update

Expected: Profile and orders sync
```

---

## 🐛 Error Scenarios

### Test: Backend Offline
```
Steps:
1. Stop backend (Ctrl+C)
2. Refresh frontend
3. Try to browse

Expected:
- Orange banner at top: "Backend is offline"
- Products still show (fallback data)
- Cart works (session storage)
- Chat shows fallback message
```

### Test: Invalid Search
```
Steps:
1. Search for special characters: "!@#$%"

Expected:
- No crash
- Shows "0 results"
- Can search again
```

### Test: Network Error During Checkout
```
Steps:
1. Open DevTools → Network tab
2. Set to "Offline"
3. Try to place order

Expected:
- Error message
- "Failed to place order"
- Can retry when back online
```

---

## 📊 Performance Tests

### Test: Page Load Speed
```
Expected:
- Home page: < 2 seconds
- Product page: < 1 second
- Search results: < 1 second
- Cart page: < 1 second
```

### Test: Chat Response Time
```
Expected:
- With OpenAI: 2-5 seconds
- With fallback: < 1 second
```

### Test: Add to Cart Responsiveness
```
Expected:
- Badge updates: < 500ms
- Smooth animation
- No lag
```

---

## ✅ Test Results Template

Copy and fill out:

```
Date: ___________
Tester: ___________

QUICK TESTS:
[ ] Search
[ ] Recommendations
[ ] Chatbot
[ ] Add to Cart
[ ] Cancel Order

DETAILED TESTS:
Search:
[ ] 1.1 Basic Search
[ ] 1.2 Empty Search
[ ] 1.3 No Results
[ ] 1.4 Clear Search

Recommendations:
[ ] 2.1 Home Page
[ ] 2.2 Product Page
[ ] 2.3 Cart Upsells
[ ] 2.4 Similar Items

Chatbot:
[ ] 3.1 Open Chat
[ ] 3.2 Simple Query
[ ] 3.3 Complex Query
[ ] 3.4 Comparison
[ ] 3.5 Suggested Prompts
[ ] 3.6 Product Cards

Add to Cart:
[ ] 4.1 From Home
[ ] 4.2 From Products
[ ] 4.3 From Search
[ ] 4.4 From Detail
[ ] 4.5 Multiple Items
[ ] 4.6 View Cart

Cancel Order:
[ ] 5.1 Place Order
[ ] 5.2 Button Visible
[ ] 5.3 Cancel Order
[ ] 5.4 Button Hidden
[ ] 5.5 From Profile

INTEGRATION:
[ ] Browse → Cart → Checkout
[ ] Chat → Cart → Pickup
[ ] Profile Management

ERRORS:
[ ] Backend Offline
[ ] Invalid Search
[ ] Network Error

PERFORMANCE:
[ ] Page Load Speed
[ ] Chat Response
[ ] Cart Updates

OVERALL STATUS: ___________
ISSUES FOUND: ___________
```

---

## 🚀 All Tests Passing?

If yes, you're ready to:
- ✅ Demo to judges
- ✅ Present to stakeholders
- ✅ Deploy to production
- ✅ Win the hackathon! 🏆

If no, check:
- `FIXES_APPLIED.md` for solutions
- Backend terminal for errors
- Browser console for errors
- Network tab for failed requests
