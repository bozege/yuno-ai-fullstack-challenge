"""
FastAPI entry point for Kijani Logistics Failed Payment Retry Hub.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.models import Payment, RetryAttempt, RetryStrategy  # noqa: F401 - for metadata
from app.routers import analytics, payments, retry


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: init DB and ensure default strategy exists."""
    await init_db()
    yield
    # Shutdown if needed


app = FastAPI(
    title="Kijani Logistics - Failed Payment Retry Hub",
    description="API for managing failed payments and retry strategies",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(payments.router, prefix="/api", tags=["payments"])
app.include_router(retry.router, prefix="/api", tags=["retry"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])


@app.get("/")
async def root():
    return {"message": "Kijani Retry Hub API", "docs": "/docs"}
