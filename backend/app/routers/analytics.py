"""
Analytics API: recovery stats.
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Payment, RetryAttempt
from app.schemas import AnalyticsSchema
from app.services.retry_engine import amount_to_usd

router = APIRouter()


@router.get("/analytics", response_model=AnalyticsSchema)
async def get_analytics(db: AsyncSession = Depends(get_db)):
    """
    Return recovery analytics for past 30 days:
    - total_failed: count of payments that failed
    - total_retried: count of payments that had at least one retry
    - total_recovered: count of payments that eventually succeeded
    - recovery_rate_pct: recovered / failed * 100
    - revenue_recovered_usd: sum of recovered amounts in USD
    """
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    # Total failed (including those that were later recovered) - all payments in window
    total_result = await db.execute(
        select(func.count()).select_from(Payment).where(Payment.failed_at >= thirty_days_ago)
    )
    total_failed = total_result.scalar() or 0

    # Total retried: payments with at least one retry attempt
    retried_result = await db.execute(
        select(func.count(distinct(RetryAttempt.payment_id)))
        .select_from(RetryAttempt)
        .join(Payment, RetryAttempt.payment_id == Payment.id)
        .where(Payment.failed_at >= thirty_days_ago)
    )
    total_retried = retried_result.scalar() or 0

    # Total recovered: status = recovered and failed_at in window
    recovered_result = await db.execute(
        select(func.count()).select_from(Payment).where(
            Payment.status == "recovered",
            Payment.failed_at >= thirty_days_ago,
        )
    )
    total_recovered = recovered_result.scalar() or 0

    # Revenue recovered: sum of amounts for recovered payments (in USD)
    recovered_payments = await db.execute(
        select(Payment.amount, Payment.currency).where(
            Payment.status == "recovered",
            Payment.failed_at >= thirty_days_ago,
        )
    )
    revenue_usd = sum(
        amount_to_usd(amount, currency)
        for amount, currency in recovered_payments.all()
    )

    recovery_rate = (total_recovered / total_failed * 100) if total_failed > 0 else 0.0

    return AnalyticsSchema(
        total_failed=total_failed,
        total_retried=total_retried,
        total_recovered=total_recovered,
        recovery_rate_pct=round(recovery_rate, 1),
        revenue_recovered_usd=round(revenue_usd, 2),
    )
