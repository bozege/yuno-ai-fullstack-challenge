# Deployment Guide

## 1. Push to GitHub

```bash
# Create a new repo on GitHub (github.com/new), then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## 2. Deploy Backend (Render)

**Option A: Blueprint (one-click)**

1. Go to [render.com](https://render.com) → **New** → **Blueprint**
2. Connect your GitHub repo
3. Render reads `render.yaml` and creates the backend service
4. Deploy. Note the URL (e.g. `https://kijani-retry-api.onrender.com`)

**Option B: Manual Web Service**

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python -m app.seed_data && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Deploy. Note the URL.

> **SQLite on Render**: The free tier has ephemeral disks—data resets on spin-down/redeploy. Fine for demos.

## 3. Deploy Frontend (Vercel)

### Option A: Vercel Dashboard (no CLI)

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Configure:
   - **Root Directory**: `frontend` (click Edit, set to `frontend`)
   - **Environment Variable**: Add `VITE_API_URL` = `https://kijani-retry-api.onrender.com/api` (or your Render URL; `/api` is auto-appended if omitted)
4. Click **Deploy**

### Option B: Vercel CLI

```bash
cd frontend
vercel login      # one-time: follow browser prompt
vercel            # deploy preview
vercel --prod     # deploy to production
```

Before deploying, set the API URL in Vercel project settings, or pass it:

```bash
VITE_API_URL=https://YOUR-BACKEND.onrender.com/api vercel --prod
```

The frontend will call `VITE_API_URL` for API requests. Ensure your backend CORS allows the Vercel domain (`*.vercel.app`).

## CORS

If your backend rejects requests from the Vercel domain, add it to CORS. In `backend/app/main.py` the app already uses `allow_origin_regex` for localhost; you may need to extend it for `*.vercel.app` or your specific Vercel URL.
