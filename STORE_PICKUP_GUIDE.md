# Store Pickup & Order Management Guide

## 🏪 In-Store Pickup with QR Code

### How It Works

1. **Customer Journey:**
   - Browse products and add to cart
   - Go to checkout
   - Select "Store Pickup" delivery method
   - Choose preferred store location
   - Place order
   - Receive order confirmation with **QR code**

2. **Store Staff Journey:**
   - Customer arrives at store
   - Customer shows QR code (on phone or printed)
   - Staff scans QR code
   - System verifies order
   - Staff hands over products
   - Order marked as "Picked Up"

### Features

#### For Customers:
- **3 Store Locations** to choose from:
  - AuraShop Downtown (City Center)
  - AuraShop Mall (North District)
  - AuraShop Express (South Area)

- **QR Code Display**:
  - Large, scannable QR code on order detail page
  - Alphanumeric code shown below QR (for manual entry)
  - Can be screenshot or printed

- **Order Tracking**:
  - Real-time status updates
  - Notifications when order is ready for pickup
  - Order history in profile

#### For Store Staff:
- **QR Scanner** (can use phone camera or dedicated scanner)
- **Order Verification** endpoint: `POST /pickup/verify?qr_code=XXX`
- **Complete Pickup** endpoint: `POST /pickup/complete/{order_id}`

---

## 👤 Profile & Order Management

### Profile Features

**Personal Information:**
- Name
- Email
- Phone number
- Saved addresses
- Preferred stores

**Order History:**
- All past orders
- Order status tracking
- Quick reorder
- Order details with QR codes

**Quick Stats:**
- Total orders count
- Completed orders
- Pending orders

### Order Statuses

| Status | Description | Customer Action |
|--------|-------------|-----------------|
| **Pending** | Order placed, awaiting confirmation | Wait for confirmation |
| **Confirmed** | Order confirmed by store | - |
| **Ready for Pickup** | Order is ready at store | Go to store with QR code |
| **Out for Delivery** | Order is being delivered | Wait at delivery address |
| **Delivered** | Order delivered successfully | - |
| **Picked Up** | Order picked up from store | - |
| **Cancelled** | Order cancelled | - |

---

## 🔌 API Endpoints

### Orders

```
POST /orders
- Create new order (home delivery or store pickup)
- Body: { user_id, items[], delivery_method, delivery_address?, store_location? }
- Returns: Order with QR code (if pickup)

GET /orders/{order_id}
- Get order details
- Returns: Full order info including QR code

GET /users/{user_id}/orders
- Get all orders for user
- Returns: List of orders

POST /orders/{order_id}/status
- Update order status (admin/store use)
- Body: { status: OrderStatus }
```

### Store Pickup

```
GET /stores
- Get available stores for pickup
- Returns: List of stores with id, name, address

POST /pickup/verify?qr_code=XXX
- Verify QR code for pickup
- Returns: Order details if valid

POST /pickup/complete/{order_id}
- Mark order as picked up
- Returns: Updated order
```

### Profile

```
GET /users/{user_id}/profile
- Get user profile
- Returns: Profile with name, email, phone, addresses, preferred_stores

POST /users/{user_id}/profile
- Create or update profile
- Body: { name?, email?, phone?, addresses?, preferred_stores? }
- Returns: Updated profile
```

---

## 🎯 User Flows

### Flow 1: Store Pickup Order

```
1. Customer adds products to cart
2. Click "Proceed to checkout" in cart
3. Enter name and phone
4. Select "Store Pickup"
5. Choose store location
6. Click "Place Order"
7. Redirected to order detail page
8. See QR code prominently displayed
9. Go to store and show QR code
10. Staff scans → Order marked "Picked Up"
```

### Flow 2: Home Delivery Order

```
1. Customer adds products to cart
2. Click "Proceed to checkout"
3. Enter name, phone, and delivery address
4. Select "Home Delivery"
5. Click "Place Order"
6. Redirected to order detail page
7. Track delivery status
8. Receive order at home
```

### Flow 3: View Order History

```
1. Click profile icon in header
2. See "My Orders" section
3. Click any order to see details
4. View QR code (if pickup order)
5. Check order status
```

---

## 💡 Demo Script

**For Hackathon Judges:**

### 1. Place Store Pickup Order
```
"Let me show you our in-store pickup feature..."
- Add items to cart
- Go to checkout
- Show store selection UI
- Place order
- "Here's the QR code the customer will show at the store"
```

### 2. Show Profile & Orders
```
"Customers can manage everything from their profile..."
- Open profile page
- Show order history
- Click on order to see details
- "Each pickup order has a unique QR code"
```

### 3. Explain Store Process
```
"At the store, staff simply scan the QR code..."
- Show QR code on phone
- Explain verification process
- "System instantly verifies and marks as picked up"
```

---

## 🔒 Security Features

1. **Unique QR Codes**: Each order gets SHA-256 hashed QR code
2. **Order Verification**: QR code must match active pickup order
3. **Status Checks**: Can only pick up orders in "ready_for_pickup" status
4. **User Association**: Orders tied to user ID for security

---

## 🚀 Future Enhancements

Potential additions:
- SMS notifications when order ready
- Real-time QR scanner in app (camera access)
- Store inventory check before order
- Estimated pickup time
- Rating system for pickup experience
- Multiple pickup person support (delegate pickup)
- Locker integration for contactless pickup

---

## 📱 Mobile Experience

All features are fully responsive:
- QR code scales properly on mobile
- Easy to screenshot and show
- Profile page optimized for touch
- Order history scrollable
- Store selection touch-friendly

---

Built for seamless omnichannel shopping! 🛍️
