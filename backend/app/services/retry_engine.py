"""
Retry simulation engine: finds eligible payments and simulates retry outcomes.
"""
import random
from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.constants import CURRENCY_RATES, SOFT_DECLINE_SUCCESS_RATE
from app.models import Payment, RetryAttempt, RetryStrategy
from app.services.strategy import get_active_strategy, ensure_default_strategy


def amount_to_usd(amount: float, currency: str) -> float:
    """Convert amount to USD equivalent."""
    rate = CURRENCY_RATES.get(currency, 1)
    return amount / rate if currency != "USD" else amount


async def run_simulation(db: AsyncSession) -> int:
    """
    Run retry simulation for all eligible payments.
    Returns number of retry attempts made.
    """
    strategy = await get_active_strategy(db)
    if not strategy:
        strategy = await ensure_default_strategy(db)

    categories = strategy.decline_categories
    max_attempts = strategy.max_attempts
    intervals = strategy.intervals_hours

    # Get all failed payments that match decline categories
    # Categories can be "soft", "hard", or specific reason names
    if not categories:
        return 0
    if not intervals:
        return 0

    category_filter = True
    if categories:
        conditions = []
        for c in categories:
            if c.lower() == "soft":
                conditions.append(Payment.decline_category == "soft")
            elif c.lower() == "hard":
                conditions.append(Payment.decline_category == "hard")
            else:
                conditions.append(Payment.decline_reason == c)
        category_filter = or_(*conditions)

    result = await db.execute(
        select(Payment)
        .options(selectinload(Payment.retry_attempts))
        .where(Payment.status == "failed")
        .where(category_filter)
    )
    payments = result.scalars().all()

    attempts_made = 0
    now = datetime.utcnow()

    for payment in payments:
        retry_count = len(payment.retry_attempts)
        if retry_count >= max_attempts:
            continue

        # Determine reference time: last attempt or failed_at
        if payment.retry_attempts:
            last_attempt = max(a.attempted_at for a in payment.retry_attempts)
            reference_time = last_attempt
            interval_idx = min(retry_count, len(intervals) - 1)
        else:
            reference_time = payment.failed_at
            interval_idx = 0

        required_hours = intervals[interval_idx]
        elapsed = (now - reference_time).total_seconds() / 3600

        if elapsed < required_hours:
            continue

        # Simulate outcome: soft declines can succeed, hard never
        if payment.decline_category == "soft":
            success = random.random() < SOFT_DECLINE_SUCCESS_RATE
        else:
            success = False

        outcome = "success" if success else "failed"
        decline_reason = None if success else payment.decline_reason

        attempt = RetryAttempt(
            payment_id=payment.id,
            attempted_at=now,
            outcome=outcome,
            decline_reason=decline_reason,
        )
        db.add(attempt)
        attempts_made += 1

        if success:
            payment.status = "recovered"

    await db.commit()
    return attempts_made


async def manual_retry_payment(db: AsyncSession, payment_id: int) -> dict:
    """
    Manually retry a single payment immediately, bypassing the schedule.
    Returns {success: bool, outcome: str, message: str}.
    """
    strategy = await get_active_strategy(db)
    if not strategy:
        strategy = await ensure_default_strategy(db)

    result = await db.execute(
        select(Payment)
        .options(selectinload(Payment.retry_attempts))
        .where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        return {"success": False, "outcome": None, "message": "Payment not found"}

    if payment.status == "recovered":
        return {"success": False, "outcome": None, "message": "Payment already recovered"}

    retry_count = len(payment.retry_attempts)
    if retry_count >= strategy.max_attempts:
        return {
            "success": False,
            "outcome": None,
            "message": f"Max retries ({strategy.max_attempts}) already reached",
        }

    # Check if payment matches strategy's decline categories
    categories = strategy.decline_categories
    if categories:
        matched = False
        for c in categories:
            if c.lower() == "soft" and payment.decline_category == "soft":
                matched = True
                break
            if c.lower() == "hard" and payment.decline_category == "hard":
                matched = True
                break
            if c == payment.decline_reason:
                matched = True
                break
        if not matched:
            return {
                "success": False,
                "outcome": None,
                "message": f"Payment decline ({payment.decline_reason}) not in retry strategy",
            }

    now = datetime.utcnow()
    if payment.decline_category == "soft":
        succeeded = random.random() < SOFT_DECLINE_SUCCESS_RATE
    else:
        succeeded = False

    outcome = "success" if succeeded else "failed"
    decline_reason = None if succeeded else payment.decline_reason

    attempt = RetryAttempt(
        payment_id=payment.id,
        attempted_at=now,
        outcome=outcome,
        decline_reason=decline_reason,
    )
    db.add(attempt)
    if succeeded:
        payment.status = "recovered"

    await db.commit()
    return {
        "success": True,
        "outcome": outcome,
        "message": f"Retry {outcome}",
    }
