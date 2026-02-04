# Deploy AuraShop on Vercel

AuraShop has a **Next.js frontend** (in `frontend/`) and a **FastAPI backend** (in `backend/`). Vercel hosts the frontend; the backend must be deployed elsewhere and its URL set in Vercel.

---

## 1. Deploy the backend (required for full app)

The frontend proxies `/api/*` to your backend. Deploy the backend first and note its URL.

### Option A: Render (free tier)

1. Go to [render.com](https://render.com) and sign in (GitHub).
2. **New → Web Service**.
3. Connect your repo (e.g. `issac8080/aurashop`).
4. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free
5. **Python version:** The repo has `backend/.python-version` set to `3.11` so Render uses Python 3.11 (avoids Python 3.13 build failures with pydantic-core). Alternatively in Render **Environment** set `PYTHON_VERSION` = `3.11.11`.
6. **Environment** (optional): add `OPENAI_API_KEY`, `CORS_ORIGINS` = `https://your-vercel-app.vercel.app` (add after frontend is deployed).
7. Deploy. Copy the service URL (e.g. `https://aurashop-api.onrender.com`).

### Option B: Railway

1. Go to [railway.app](https://railway.app), connect GitHub, create a project.
2. Add a service from the repo; set **Root Directory** to `backend`.
3. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
4. Deploy and copy the public URL.

---

## 2. Deploy the frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub).
2. **Add New → Project** and import your repo (`aurashop` or `AURAMART`).
3. **Configure (important – wrong Root Directory causes 404 NOT_FOUND):**
   - **Root Directory:** click **Edit** next to the repo name, type `frontend`, then **Continue**.  
     If you skip this, Vercel builds from the repo root and you get **404: NOT_FOUND**.
   - **Framework Preset:** Next.js (auto-detected).
   - **Build Command:** `npm run build` (default).
   - **Environment variables:** add:
     - **Name:** `API_URL`  
     - **Value:** your backend URL from step 1 (no trailing slash), e.g. `https://aurashop-api.onrender.com`
4. Click **Deploy**. Wait for the build to finish.
5. Open the generated URL (e.g. `https://aurashop-xxx.vercel.app`).

### If you already deployed and see 404: NOT_FOUND

Root Directory is **not** in the main General block (Project Name, Project ID, Toolbar, etc.). Use either path below.

**Option A – Build and Deployment (recommended)**  
1. Vercel Dashboard → your project → **Settings**.
2. In the **left sidebar**, click **Build and Deployment** (or **Build & Development**).
3. Scroll to **Root Directory** → click **Edit** → enter `frontend` → **Save**.
4. Go to **Deployments** → **⋯** on the latest deployment → **Redeploy**.
5. After the redeploy, the site should load.

**Option B – Same page, scroll down**  
1. Stay on **Settings** → **General**.
2. Scroll down past Project Name, Project ID, Vercel Toolbar, etc.
3. Find the **Build and development settings** section; **Root Directory** is there.
4. Edit Root Directory to `frontend`, Save, then redeploy as in step 4 above.

---

## 3. Point backend CORS at your frontend (optional)

If you ever call the API directly from the browser (e.g. from another domain), set CORS on the backend to allow your Vercel URL.

In Render/Railway env for the backend, set:

```bash
CORS_ORIGINS=https://your-app.vercel.app,https://your-app-*.vercel.app
```

Replace `your-app` with your actual Vercel project name. With the current setup (all API calls via `/api` on the same domain), CORS is not required for the Vercel frontend.

---

## 4. Local development

- **Frontend:** `cd frontend && npm run dev` (uses `http://localhost:8000` when `API_URL` is not set).
- **Backend:** `cd backend && uvicorn app.main:app --reload --port 8000`.

No `.env` needed in `frontend/` for local dev; `API_URL` is only for production (Vercel).

---

## Summary

| Step | Action |
|------|--------|
| 1 | Deploy backend (Render or Railway); copy backend URL. |
| 2 | In Vercel: set **Root Directory** to `frontend`, add env **API_URL** = backend URL, deploy. |
| 3 | (Optional) Set **CORS_ORIGINS** on backend to your Vercel URL. |

After this, the Vercel site will proxy all `/api` requests to your deployed backend.
