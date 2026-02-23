# Deployment Guide

## 1. Push to GitHub

```bash
# Create a new repo on GitHub (github.com/new), then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## 2. Deploy Backend (Render / Railway / Fly.io)

The API needs to run somewhere. **Render** (free tier) works well:

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python -m app.seed_data && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Deploy. Note the URL (e.g. `https://your-app.onrender.com`)

> **SQLite on Render**: The free tier has ephemeral disks—data resets on redeploy. For persistence, use a PostgreSQL DB (Render offers one). The current app uses SQLite; a production version would switch to Postgres.

## 3. Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → Add New Project
2. Import your GitHub repo
3. Settings:
   - **Root Directory**: `frontend`
   - **Environment Variable**: `VITE_API_URL` = your backend URL (e.g. `https://your-app.onrender.com/api`)
4. Deploy

The frontend will call `VITE_API_URL` for API requests. Ensure your backend CORS allows the Vercel domain (`*.vercel.app`).

## CORS

If your backend rejects requests from the Vercel domain, add it to CORS. In `backend/app/main.py` the app already uses `allow_origin_regex` for localhost; you may need to extend it for `*.vercel.app` or your specific Vercel URL.
