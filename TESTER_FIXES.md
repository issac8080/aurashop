# Tester Fixes Applied

Summary of errors found and corrected during full-app testing.

---

## 1. **API layer (`src/lib/api.ts`)**

- **ECONNRESET handling:** Added `ECONNRESET` to `isNetworkError()` so connection resets (e.g. when backend restarts) are treated as network errors and fallbacks work.
- **sendOtp / verifyOtp:** Wrapped in try/catch; on network error they now throw a clear message: *"Backend not available. Start it with: cd backend && uvicorn app.main:app --reload --port 8000"* instead of a raw fetch error.
- **sendOtp / verifyOtp:** Error response parsing uses `typeof data?.detail === "string"` so array or object `detail` from FastAPI doesn’t break the message.

---

## 2. **Checkout (`src/app/checkout/page.tsx`)**

- **Place order:** Previously always did `router.push(\`/orders/${order.id}\`)` after `res.json()`. If the API returned 4xx/5xx, `order` could be an error body and `order.id` undefined, leading to `/orders/undefined`.
  - **Fix:** Check `res.ok` first, parse body safely with `.catch(() => ({}))`, show `data.detail` (or a generic message) in an alert on error, and only redirect when `data?.id` is present.
- **loadCart:** On fetch or JSON parse failure, cart is set to `[]` and parse uses `.catch(() => ({}))` so invalid JSON doesn’t crash the page.
- **loadStores:** Same pattern: safe `res.json().catch(() => ({}))`, use `Array.isArray(data?.stores)` before setting state.

---

## 3. **Cart (`src/app/cart/page.tsx`)**

- **Remove item:** Optimistic update was reverted only by refetch; if refetch failed, state was left inconsistent.
  - **Fix:** Keep optimistic remove, but on any failure try refetch once; if that also fails, restore `previousCart` so the removed item reappears and the UI matches the backend.

---

## 4. **Returns create (`src/app/returns/create/page.tsx`)**

- **Submit:** On `!res.ok`, `await res.json()` could throw (e.g. 502 HTML). Now uses `.catch(() => ({}))` and reads `detail` safely (string or array); redirect only if `returnData?.id` exists.
- **Error typing:** Replaced `err: any` with `err` and use `err instanceof Error ? err.message : "..."` for the message.
- **File upload:** Fixed async handling so all selected files are read before updating state; added check for `base64Data` (e.g. when `dataUrl.split(",")[1]` is missing); added `reader.onerror` so one failed file doesn’t block the rest.

---

## 5. **Returns detail (`src/app/returns/[id]/page.tsx`)**

- **Load return:** `res.json()` on error/502 could throw. Now uses `.catch(() => null)` and shows an error if data is null; error message uses `err instanceof Error ? err.message : "..."`.

---

## 6. **Store scanner (`src/app/store-scanner/page.tsx`)**

- **Verify:** When falling back to order lookup or using QR response, `res.json()` could throw. Now uses `.catch(() => null)` and only sets order when `data` is valid (e.g. `data?.delivery_method === "store_pickup"` or non-null QR payload).

---

## 7. **Order detail (`src/app/orders/[id]/page.tsx`)**

- **loadOrder:** Previously did `setOrder(data)` even when `!res.ok`, so error responses could be shown as order data. Now only sets order when `res.ok && data?.id`; otherwise sets `order` to null.
- **loadOrder:** Safe `res.json().catch(() => null)` and safe cashback parsing with `.catch(() => ({}))`.
- **handleCancelOrder:** Safe `res.json().catch(() => null)`; only update order state when `res.ok && updated?.id`.
- **handleMarkDelivered:** Same: parse with `.catch(() => null)`, update order only when `res.ok && updated?.id`; cashback response parsed with `.catch(() => ({}))`.

---

## Verification

- All 12 Playwright E2E tests were re-run and **passed** after these changes.
- No new linter errors in the modified files.

If you see any other issues in the app, share the flow and I can add more fixes.
