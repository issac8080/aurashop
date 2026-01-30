# ⚡ AuraShop Quick Start Guide

## 🚀 Setup (5 minutes)

### Step 1: Backend Setup
```powershell
cd backend
copy .env.example .env
# Edit .env and add: OPENAI_API_KEY=sk-your-key-here
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
✅ Backend running at `http://localhost:8000`

### Step 2: Frontend Setup (New Terminal)
```powershell
cd frontend
npm install
npm run dev
```
✅ Frontend running at `http://localhost:3000`

### Step 3: Open Browser
Navigate to: `http://localhost:3000`

---

## 🎮 Quick Feature Tour (2 minutes)

### 1. Home Page (15 seconds)
- See stunning hero with Unsplash background
- Scroll to "Recommended for You" carousel
- Hover over products (zoom effect)

### 2. Search (15 seconds)
- Type "electronics" in search bar
- Press Enter
- See filtered results

### 3. AI Chat (30 seconds)
- Click gradient chat button (bottom-right)
- Try: **"Best casual wear for office under ₹3000"**
- See personalized response with product cards
- Click a product card

### 4. Add to Cart (15 seconds)
- Click "Add to cart" on any product
- See cart badge pulse
- Click cart icon

### 5. Store Pickup (45 seconds)
- Click "Proceed to checkout"
- Enter name: "Test User", phone: "1234567890"
- Click "Store Pickup" card
- Select "AuraShop Downtown"
- Click "Place Order"
- **See QR code** - This is the key feature!

### 6. Store Scanner (20 seconds)
- Open new tab: `http://localhost:3000/store-scanner`
- Copy the QR code from previous order
- Paste in scanner
- Click "Verify"
- Click "Complete Pickup"
- See success animation

### 7. Profile (10 seconds)
- Click profile icon in header
- See order history
- Click on order to view QR code again

---

## 🎯 Demo Script for Judges (3 minutes)

### Introduction (20 seconds)
**"AuraShop is an AI-powered shopping assistant that combines intelligent recommendations with seamless omnichannel fulfillment."**

### Part 1: AI Intelligence (60 seconds)
**"Let me show you the AI capabilities..."**

1. Open chat
2. Type: "Gift ideas for tech lover"
3. Show response with reasoning
4. "Notice how it understands intent and suggests relevant products"
5. Click suggested prompt: "Compare top-rated electronics"
6. "It can compare and explain differences"

### Part 2: Beautiful UX (40 seconds)
**"The entire experience is designed for engagement..."**

1. Show hero section
2. "Unsplash images throughout"
3. Hover over products (zoom effect)
4. "Smooth animations and modern design"
5. Open product detail
6. "Clear information hierarchy"

### Part 3: Omnichannel (60 seconds)
**"Our unique innovation - QR-based store pickup..."**

1. Add items to cart
2. Go to checkout
3. "Two fulfillment options: home delivery or store pickup"
4. Select store pickup
5. Place order
6. **"Customer immediately gets this QR code"**
7. Switch to scanner tab
8. "Store staff simply scan..."
9. Verify order
10. Complete pickup
11. "Instant, error-free, efficient"

### Part 4: Profile (20 seconds)
**"Complete user management..."**

1. Open profile
2. Show order history
3. "All orders tracked with status"
4. Click order
5. "QR code always accessible"

### Closing (20 seconds)
**"AuraShop delivers:**
- ✅ AI-powered personalization
- ✅ Beautiful, modern UI
- ✅ Innovative QR pickup
- ✅ Complete feature set
- ✅ Production-ready code

**Thank you!"**

---

## 🎨 Visual Checklist

Before demo, verify these are visible:
- ✅ Hero gradient with Unsplash background
- ✅ Product images loading (Unsplash)
- ✅ Chat button with pulse indicator
- ✅ Cart badge with count
- ✅ Search bar in header
- ✅ Profile icon in header
- ✅ AI badges on products
- ✅ Smooth animations working
- ✅ QR code rendering properly
- ✅ Status badges with colors

---

## 🐛 Troubleshooting

### Issue: ECONNREFUSED errors
**Solution**: Start the backend first!
```powershell
cd backend
uvicorn app.main:app --reload --port 8000
```

### Issue: Images not loading
**Solution**: Check internet connection (Unsplash requires network)

### Issue: QR code not showing
**Solution**: Ensure qrcode.react is installed
```powershell
cd frontend
npm install qrcode.react
```

### Issue: Chat not responding
**Solution**: Check OPENAI_API_KEY in backend/.env

### Issue: Orders not saving
**Solution**: Backend is in-memory, restart clears data (expected for demo)

---

## 💡 Pro Tips

### For Best Demo:
1. **Clear browser cache** before demo (fresh session)
2. **Pre-test the QR flow** once to ensure it works
3. **Have scanner tab ready** in background
4. **Use suggested prompts** in chat (they're optimized)
5. **Show mobile view** (resize browser to demonstrate responsive)
6. **Highlight the QR code** (it's the unique feature)

### For Judges' Questions:
- **"How does AI work?"** → Explain OpenAI + context + prompt engineering
- **"Can it scale?"** → Mention modular architecture, DB migration ready
- **"Is QR secure?"** → SHA-256 hash, one-time use, status verification
- **"Mobile support?"** → Show responsive design, QR works on phones
- **"Production ready?"** → Type-safe, error handling, documentation

---

## 📞 Support

If anything breaks during demo:
1. **Restart backend**: Ctrl+C, then `uvicorn app.main:app --reload --port 8000`
2. **Restart frontend**: Ctrl+C, then `npm run dev`
3. **Clear browser cache**: Hard refresh (Ctrl+Shift+R)
4. **Check logs**: Terminal output for errors

---

## 🎉 You're Ready!

Everything is set up and working. Just follow the demo script and you'll showcase:
- ✨ AI intelligence
- 🎨 Beautiful design
- 🏪 Innovative features
- 💼 Business value
- 🔧 Technical quality

**Good luck with your hackathon! 🏆**
