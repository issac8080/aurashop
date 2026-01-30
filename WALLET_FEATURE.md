# 💰 Aura Wallet - Cashback Rewards System

## Overview

Aura Wallet is a built-in rewards system that gives customers cashback on every purchase. The cashback is automatically credited to their wallet after order completion and can be used on future purchases.

---

## 🎁 How It Works

### For Customers:

1. **Make a Purchase**
   - Place any order (home delivery or store pickup)
   - Complete the order (delivered/picked up)

2. **Earn Cashback**
   - **1% cashback** on orders under ₹5,000
   - **2% cashback** on orders ₹5,000 and above
   - Cashback automatically credited to wallet

3. **Use Cashback**
   - Valid for **30 days** from credit date
   - Use on any future purchase
   - No minimum order value required

4. **Track Wallet**
   - View balance anytime
   - See transaction history
   - Get alerts for expiring cashback

---

## 💳 Cashback Rates

| Order Value | Cashback Rate | Example |
|-------------|---------------|---------|
| Under ₹5,000 | 1% | ₹2,000 order = ₹20 cashback |
| ₹5,000+ | 2% | ₹10,000 order = ₹200 cashback |

**Validity**: 30 days from credit date

---

## 🎯 Key Features

### 1. Automatic Cashback
- No need to apply codes
- Automatically credited after order completion
- Works for both home delivery and store pickup

### 2. Expiry Management
- Cashback valid for 30 days
- Warning 7 days before expiry
- Expired cashback automatically removed

### 3. Transaction History
- View all credits and debits
- See expiry dates
- Track total earned and spent

### 4. Wallet Balance
- Real-time balance display
- Active cashback tracking
- Expiring soon alerts

---

## 📱 User Interface

### Wallet Page (`/wallet`)

**Balance Card:**
- Large display of current balance
- Total earned (lifetime)
- Total spent (lifetime)
- Expiring soon warning (if applicable)

**Cashback Info Card:**
- Cashback rates (1% and 2%)
- Validity period (30 days)
- How it works

**Transaction History:**
- Chronological list
- Credit/Debit indicators
- Expiry dates for cashback
- Order links

### Header Integration
- Sparkles icon for wallet access
- Quick link in navigation
- Visible on all pages

### Checkout Preview
- Shows estimated cashback
- Displays rate (1% or 2%)
- Encourages completion

### Order Detail
- Cashback earned card (completed orders)
- Amount and rate displayed
- Link to view wallet

---

## 🔧 Technical Implementation

### Backend (`backend/app/wallet_service.py`)

**Core Functions:**
```python
get_wallet(user_id)              # Get or create wallet
calculate_cashback(order_total)   # Calculate cashback amount
add_cashback(user_id, order_id, total)  # Credit cashback
deduct_from_wallet(user_id, amount, order_id)  # Use wallet
get_wallet_summary(user_id)      # Get balance and stats
```

**Data Models:**
- `Wallet` - User wallet with balance and transactions
- `WalletTransaction` - Individual credit/debit records
- Expiry tracking for cashback

**Auto-Cashback:**
- Triggered when order status changes to "delivered" or "picked_up"
- Integrated in `order_service.py` → `update_order_status()`

### API Endpoints

```
GET  /users/{user_id}/wallet
     Returns: wallet data + summary

GET  /users/{user_id}/wallet/transactions?limit=20
     Returns: transaction history

POST /orders/{order_id}/cashback
     Manually trigger cashback (admin use)

GET  /wallet/preview-cashback?order_total=5000
     Preview cashback for order total
```

### Frontend (`frontend/src/app/wallet/page.tsx`)

**Components:**
- Balance display with gradient card
- Earned/Spent stats
- Expiring soon warning
- Transaction list with icons
- Empty state with CTA

**Integrations:**
- Header: Wallet icon link
- Profile: "Aura Wallet" button
- Checkout: Cashback preview
- Order Detail: Cashback earned card

---

## 🎨 UI/UX Highlights

### Visual Design
- **Gradient Cards**: Primary/purple gradient for balance
- **Color Coding**: 
  - Green for credits (cashback, refunds)
  - Red for debits (purchases)
  - Amber for expiry warnings
- **Icons**:
  - Gift icon for cashback
  - Sparkles for wallet
  - Clock for expiry
  - Trending up/down for transactions

### Animations
- Smooth fade-in for cards
- Transaction list stagger animation
- Pulse effect on expiry warnings

### Responsive
- Mobile-friendly layout
- Stacked cards on small screens
- Touch-friendly buttons

---

## 📊 User Flows

### Flow 1: Earn Cashback
```
1. Customer places order (₹6,000)
2. Order delivered/picked up
3. Cashback auto-credited (₹120 = 2%)
4. Customer sees notification on order page
5. Cashback visible in wallet
6. Valid for 30 days
```

### Flow 2: Use Cashback
```
1. Customer has ₹200 in wallet
2. Places new order (₹3,000)
3. At checkout, sees wallet balance
4. Can apply wallet amount
5. Order total reduced
6. Wallet balance updated
```

### Flow 3: Expiry Warning
```
1. Cashback credited on Jan 1
2. Valid until Jan 31
3. On Jan 24 (7 days before), warning shown
4. Customer sees "₹100 expiring soon"
5. Encouraged to use before expiry
6. If not used, auto-removed on Feb 1
```

---

## 🎯 Business Benefits

### Customer Retention
- Incentivizes repeat purchases
- Creates loyalty through rewards
- Reduces cart abandonment

### Increased Order Value
- 2% cashback threshold encourages larger orders
- Customers add items to reach ₹5,000

### Competitive Advantage
- Unique wallet system
- Better than one-time coupons
- Builds long-term relationships

### Data Insights
- Track wallet usage patterns
- Identify high-value customers
- Optimize cashback rates

---

## 📈 Metrics to Track

### Wallet Adoption
- % of users with wallet balance
- Average wallet balance
- Active wallet users

### Cashback Impact
- Total cashback distributed
- Cashback redemption rate
- Average time to use cashback

### Business Impact
- Repeat purchase rate (wallet users vs non-users)
- Average order value increase
- Customer lifetime value

---

## 🔒 Security & Validation

### Cashback Rules
- Only credited after order completion
- Cannot exceed order total
- One cashback per order

### Expiry Enforcement
- Auto-cleanup on wallet access
- Cannot use expired cashback
- Clear expiry dates shown

### Fraud Prevention
- User ID validation
- Order status verification
- Transaction logging

---

## 🚀 Future Enhancements

### Phase 2 Features
- **Referral Rewards**: Earn cashback for referring friends
- **Bonus Cashback**: Special events with 3-5% cashback
- **Wallet Transfer**: Send cashback to friends
- **Tiered Rewards**: VIP users get higher cashback
- **Cashback Bundles**: Combine with product bundles

### Advanced Features
- **Auto-apply**: Automatically use wallet at checkout
- **Cashback Goals**: Gamification with milestones
- **Push Notifications**: Expiry reminders via SMS/email
- **Wallet Top-up**: Add money to wallet
- **Gift Cards**: Convert cashback to gift cards

---

## 🧪 Testing Guide

### Test Case 1: Earn Cashback (Under ₹5,000)
```
1. Place order for ₹2,000
2. Complete order (mark as delivered)
3. Check wallet
4. Should see ₹20 cashback (1%)
5. Expiry date = 30 days from now
```

### Test Case 2: Earn Cashback (Over ₹5,000)
```
1. Place order for ₹10,000
2. Complete order
3. Check wallet
4. Should see ₹200 cashback (2%)
```

### Test Case 3: View Wallet
```
1. Go to /wallet
2. See balance card
3. See cashback rates (1% and 2%)
4. See transaction history
5. Check expiry dates
```

### Test Case 4: Expiry Warning
```
1. Create cashback with near expiry (7 days)
2. Go to wallet
3. Should see amber warning box
4. "₹X expiring soon - Use within 7 days"
```

### Test Case 5: Expired Cashback
```
1. Create cashback with past expiry date
2. Access wallet (triggers cleanup)
3. Balance should exclude expired amount
4. Transaction marked as "Expired"
```

### Test Case 6: Checkout Preview
```
1. Add items to cart (total ₹3,000)
2. Go to checkout
3. Should see green box: "Earn ₹30 cashback (1%)"
4. Change cart to ₹6,000
5. Should update to "Earn ₹120 cashback (2%)"
```

### Test Case 7: Order Detail Cashback
```
1. Complete an order
2. Go to order detail page
3. Should see green "Cashback Earned!" card
4. Shows amount and rate
5. "View Wallet" button present
```

---

## 📝 API Examples

### Get Wallet
```bash
curl http://localhost:8000/users/USER123/wallet
```

Response:
```json
{
  "wallet": {
    "user_id": "USER123",
    "balance": 250.00,
    "total_earned": 500.00,
    "total_spent": 250.00,
    "transactions": [...]
  },
  "summary": {
    "balance": 250.00,
    "active_cashback": 250.00,
    "expiring_soon": 50.00,
    "transaction_count": 10
  }
}
```

### Preview Cashback
```bash
curl http://localhost:8000/wallet/preview-cashback?order_total=7500
```

Response:
```json
{
  "order_total": 7500,
  "cashback_amount": 150.00,
  "cashback_rate": "2%",
  "validity_days": 30
}
```

---

## 🎉 Summary

Aura Wallet is a complete cashback rewards system that:
- ✅ Automatically credits 1-2% cashback
- ✅ Has 30-day validity with expiry warnings
- ✅ Provides beautiful, intuitive UI
- ✅ Integrates seamlessly with orders
- ✅ Encourages repeat purchases
- ✅ Tracks all transactions
- ✅ Works for all order types

**Ready to boost customer loyalty and increase sales!** 🚀
