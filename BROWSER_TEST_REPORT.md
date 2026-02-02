# AuraShop Browser Test & Debug Report

**Date:** January 31, 2026  
**Test run:** Playwright E2E (Chromium) against `http://localhost:3000`

---

## Test Results Summary

| Status | Count |
|--------|--------|
| **Passed** | 12 |
| **Failed** | 0 |
| **Total** | 12 |

All 12 E2E tests passed. The app was tested in a headless browser with screenshots saved for each flow.

---

## Screenshots Captured

Screenshots are saved in **`frontend/e2e-screenshots/`**:

| File | Page / Flow |
|------|-------------|
| `01-home.png` | Home page (full page) |
| `02-header.png` | Header and navigation |
| `03-products.png` | Products listing |
| `04-search.png` | Search results (q=electronics) |
| `05-cart.png` | Cart page |
| `06-checkout.png` | Checkout page |
| `07-profile.png` | Profile page |
| `08-store-scanner.png` | Store scanner page |
| `09-wallet.png` | Wallet page |
| `10-returns-create.png` | Returns create page |
| `11-product-detail.png` | Product detail (after clicking first product) |
| `12-chat-open.png` | Chat widget opened |

Open these PNG files in your file explorer or IDE to review the UI at the time of the test run.

---

## Functionality Verified

- **Home:** Loads, hero and carousels visible.
- **Header/Nav:** Visible and usable.
- **Products:** Listing loads.
- **Search:** Search page with query works.
- **Cart:** Cart page loads (empty or with items).
- **Checkout:** Checkout form loads.
- **Profile:** Profile/orders page loads.
- **Store scanner:** Scanner page loads.
- **Wallet:** Wallet page loads.
- **Returns create:** Return request form loads.
- **Product detail:** Clicking a product opens detail page.
- **Chat:** Chat widget opens.

---

## Known Issues (from terminal logs)

1. **Backend must be running**  
   When the backend (`uvicorn` on port 8000) is not running, the frontend shows:
   - `ECONNREFUSED` on `/api/categories`, `/api/products`, `/api/session/.../cart`, `/api/recommendations`, `/api/events`.
   - **Fix:** Start backend first: `cd backend` → `uvicorn app.main:app --reload --port 8000`.  
   The **Backend Offline** banner should appear when backend is down (uses `/api/health`).

2. **Returns API `ECONNRESET`**  
   Terminal logs showed `Failed to proxy http://localhost:8000/returns` with `ECONNRESET`. This can happen when:
   - Backend is restarting (e.g. file change reload).
   - Backend crashes during a returns request.  
   **Recommendation:** Retry returns flow after backend is stable; ensure backend is up before using Returns.

3. **Port**  
   Backend is expected on **port 8000** (see `frontend/next.config.js` rewrites). If you run uvicorn without `--port 8000`, the frontend proxy will fail.

---

## How to Run Tests Again

**Prerequisites:** Backend and frontend must be running.

1. **Terminal 1 – Backend**
   ```powershell
   cd backend
   .\.venv\Scripts\Activate.ps1
   uvicorn app.main:app --reload --port 8000
   ```

2. **Terminal 2 – Frontend**
   ```powershell
   cd frontend
   npm run dev
   ```

3. **Terminal 3 – E2E tests and screenshots**
   ```powershell
   cd frontend
   npm run test:e2e
   ```
   Or:
   ```powershell
   npx playwright test e2e/full-app.spec.ts
   ```

Screenshots are written to `frontend/e2e-screenshots/` (overwritten each run).  
For an HTML report: `npx playwright show-report` (after a run).

---

## Quick Manual Check in Your Browser

1. Open **http://localhost:3000** (with backend + frontend running).
2. Confirm **Backend Offline** banner does **not** appear (if it does, start backend).
3. Try: Home → Search → Product → Add to cart → Cart → Checkout.
4. Try: Profile, Store scanner, Wallet, Returns create.
5. Open chat (bottom-right) and send a message.

If anything fails, check the browser console (F12) and the backend terminal for errors.

---

## npm Script Added

In `frontend/package.json`:

- **`npm run test:e2e`** – Runs Playwright E2E tests and saves screenshots to `frontend/e2e-screenshots/`.

---

## Summary

- **E2E:** 12/12 tests passed; all main pages and key flows (home, products, search, cart, checkout, profile, store scanner, wallet, returns, product detail, chat) were exercised.
- **Screenshots:** 12 PNGs in `frontend/e2e-screenshots/` for visual verification.
- **Issues:** Backend must be on port 8000; ECONNRESET on returns can occur during backend restarts—retry when backend is stable.
