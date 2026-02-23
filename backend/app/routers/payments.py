"""
Payments API: list, detail, filters, decline reasons.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Payment, RetryAttempt, RetryStrategy
from app.schemas import PaymentListSchema, PaymentDetailSchema, RetryAttemptSchema
from app.services.retry_engine import manual_retry_payment

router = APIRouter()


@router.get("/payments", response_model=list[PaymentListSchema])
async def list_payments(
    db: AsyncSession = Depends(get_db),
    decline_reason: Optional[str] = Query(None, description="Filter by reason or 'soft'/'hard'"),
    search: Optional[str] = Query(None, description="Search customer name or payment_id"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    List failed payments from past 30 days with optional filters.
    """
    from datetime import datetime, timedelta

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    query = select(Payment).where(Payment.failed_at >= thirty_days_ago)

    if decline_reason:
        if decline_reason.lower() == "soft":
            query = query.where(Payment.decline_category == "soft")
        elif decline_reason.lower() == "hard":
            query = query.where(Payment.decline_category == "hard")
        else:
            query = query.where(Payment.decline_reason == decline_reason)

    if search and search.strip():
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Payment.customer_name.ilike(search_term),
                Payment.payment_id.ilike(search_term),
            )
        )

    query = query.order_by(Payment.failed_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    payments = result.scalars().all()

    # Get active strategy for max_retries
    strategy_result = await db.execute(
        select(RetryStrategy).where(RetryStrategy.is_active == True).limit(1)
    )
    strategy = strategy_result.scalar_one_or_none()
    max_retries = strategy.max_attempts if strategy else 3

    # Build response with retry counts
    items = []
    for p in payments:
        retry_count = await db.scalar(
            select(func.count()).select_from(RetryAttempt).where(RetryAttempt.payment_id == p.id)
        )
        items.append(
            PaymentListSchema(
                id=p.id,
                payment_id=p.payment_id,
                customer_name=p.customer_name,
                amount=p.amount,
                currency=p.currency,
                payment_method_type=p.payment_method_type,
                failed_at=p.failed_at,
                decline_reason=p.decline_reason,
                decline_category=p.decline_category,
                status=p.status,
                retry_count=retry_count,
                max_retries=max_retries,
            )
        )

    return items


@router.get("/payments/decline-reasons")
async def get_decline_reasons(db: AsyncSession = Depends(get_db)):
    """Return distinct decline reasons for filter dropdown."""
    result = await db.execute(
        select(Payment.decline_reason, Payment.decline_category)
        .where(Payment.decline_reason.isnot(None))
        .distinct()
    )
    rows = result.all()
    return [
        {"reason": r[0], "category": r[1]}
        for r in sorted(rows, key=lambda x: (x[1], x[0]))
    ]


@router.post("/payments/{payment_id}/retry")
async def manual_retry(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger a single retry attempt for this payment (bypasses automatic schedule)."""
    result = await manual_retry_payment(db, payment_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.get("/payments/{payment_id}", response_model=PaymentDetailSchema)
async def get_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get payment detail with full retry timeline."""
    result = await db.execute(
        select(Payment)
        .options(selectinload(Payment.retry_attempts))
        .where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    strategy_result = await db.execute(
        select(RetryStrategy).where(RetryStrategy.is_active == True).limit(1)
    )
    strategy = strategy_result.scalar_one_or_none()
    max_retries = strategy.max_attempts if strategy else 3

    return PaymentDetailSchema(
        id=payment.id,
        payment_id=payment.payment_id,
        customer_name=payment.customer_name,
        amount=payment.amount,
        currency=payment.currency,
        payment_method_type=payment.payment_method_type,
        failed_at=payment.failed_at,
        decline_reason=payment.decline_reason,
        decline_code=payment.decline_code,
        decline_category=payment.decline_category,
        status=payment.status,
        retry_attempts=[
            RetryAttemptSchema(
                id=a.id,
                attempted_at=a.attempted_at,
                outcome=a.outcome,
                decline_reason=a.decline_reason,
            )
            for a in sorted(payment.retry_attempts, key=lambda x: x.attempted_at)
        ],
        max_retries=max_retries,
    )
