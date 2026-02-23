"""
Seed script to generate 175+ realistic failed payment records.
Distribution matches challenge spec:
- ~40% Insufficient Funds (soft)
- ~15% Issuer Unavailable (soft)
- ~12% Do Not Honor (soft)
- ~10% Card Expired (hard)
- ~10% Invalid Card Details (hard)
- ~8% Suspected Fraud (hard)
- ~5% Lost/Stolen Card, etc.
"""
import asyncio
import random
from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import CURRENCY_RATES, SOFT_DECLINE_SUCCESS_RATE
from app.database import AsyncSessionLocal, init_db
from app.models import Payment, RetryAttempt, RetryStrategy


# Decline reasons with category and approximate distribution (percent)
DECLINE_REASONS = [
    ("Insufficient Funds", "soft", 40),
    ("Issuer Unavailable", "soft", 15),
    ("Do Not Honor", "soft", 12),
    ("Card Expired", "hard", 10),
    ("Invalid Card Details", "hard", 10),
    ("Suspected Fraud", "hard", 8),
    ("Lost/Stolen Card", "hard", 5),
]

CURRENCIES = ["KES", "TZS", "UGX", "USD"]
PAYMENT_METHODS = ["Credit Card", "Debit Card", "M-Pesa", "Airtel Money"]

# East African business name templates
COMPANY_PREFIXES = [
    "Nairobi", "Dar es Salaam", "Kampala", "Kigali", "Mombasa", "Arusha",
    "Acme", "Alpha", "Prime", "Global", "East Africa", "African",
    "United", "Premium", "Elite", "Summit", "Delta", "Omega",
]
COMPANY_SUFFIXES = [
    "Traders Ltd", "Wholesale Co", "Trading Co", "Import Export", "Logistics",
    "Freight Ltd", "Supplies Ltd", "Distributors", "Holdings", "Group",
]


def generate_customer_name() -> str:
    """Generate a realistic East African business name."""
    return f"{random.choice(COMPANY_PREFIXES)} {random.choice(COMPANY_SUFFIXES)}"


def generate_amount_usd() -> float:
    """Generate amount in USD equivalent ($20 - $5000)."""
    return round(random.uniform(20, 5000), 2)


def pick_decline_reason() -> tuple[str, str]:
    """Pick a decline reason based on distribution."""
    r = random.randint(1, 100)
    cumul = 0
    for reason, category, pct in DECLINE_REASONS:
        cumul += pct
        if r <= cumul:
            return reason, category
    return DECLINE_REASONS[-1][0], DECLINE_REASONS[-1][1]


def generate_payment_id() -> str:
    """Generate unique payment ID for search."""
    return f"KJN-{uuid4().hex[:12].upper()}"


async def seed_payments(session: AsyncSession, count: int = 180) -> None:
    """Generate and insert payment records."""
    payments = []
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)

    for i in range(count):
        amount_usd = generate_amount_usd()
        currency = random.choice(CURRENCIES)
        if currency == "USD":
            amount = round(amount_usd, 2)
        else:
            rate = CURRENCY_RATES[currency]
            amount = round(amount_usd * rate, 2)

        failed_at = thirty_days_ago + timedelta(
            seconds=random.randint(0, 30 * 24 * 3600)
        )

        decline_reason, decline_category = pick_decline_reason()
        decline_codes = {
            "Insufficient Funds": "insufficient_funds",
            "Issuer Unavailable": "issuer_unavailable",
            "Do Not Honor": "do_not_honor",
            "Card Expired": "card_expired",
            "Invalid Card Details": "invalid_card",
            "Suspected Fraud": "suspected_fraud",
            "Lost/Stolen Card": "lost_stolen",
        }

        p = Payment(
            payment_id=generate_payment_id(),
            customer_name=generate_customer_name(),
            amount=amount,
            currency=currency,
            payment_method_type=random.choice(PAYMENT_METHODS),
            failed_at=failed_at,
            decline_reason=decline_reason,
            decline_code=decline_codes.get(decline_reason, "unknown"),
            decline_category=decline_category,
            status="failed",
        )
        session.add(p)
        payments.append((p, decline_category))

    await session.flush()  # Get IDs

    # Add retry history to ~35% of payments (1-3 attempts, some succeeded)
    payment_objs = await session.execute(select(Payment).order_by(Payment.id))
    all_payments = list(payment_objs.scalars().all())

    num_with_history = int(len(all_payments) * 0.35)
    to_add_history = random.sample(all_payments, num_with_history)

    for payment in to_add_history:
        num_attempts = random.randint(1, 3)
        last_attempt_time = payment.failed_at

        for attempt_num in range(num_attempts):
            # Interval: 24h, 72h, or 168h
            interval_hours = [24, 72, 168][min(attempt_num, 2)]
            last_attempt_time = last_attempt_time + timedelta(hours=interval_hours)

            # Soft declines: use shared success rate; hard: 0%
            if payment.decline_category == "soft":
                success = random.random() < SOFT_DECLINE_SUCCESS_RATE
            else:
                success = False

            outcome = "success" if success else "failed"
            decline_reason = None if success else payment.decline_reason

            retry = RetryAttempt(
                payment_id=payment.id,
                attempted_at=last_attempt_time,
                outcome=outcome,
                decline_reason=decline_reason,
            )
            session.add(retry)

            if success:
                payment.status = "recovered"
                break

        await session.flush()

    await session.commit()
    print(f"Seeded {count} payments, {num_with_history} with retry history.")


async def seed_default_strategy(session: AsyncSession) -> None:
    """Create default retry strategy."""
    existing = await session.execute(
        select(RetryStrategy).where(RetryStrategy.is_active == True)
    )
    if existing.scalar_one_or_none():
        await session.commit()
        return

    strategy = RetryStrategy(
        name="Default Soft Retry",
        decline_categories=["soft"],
        max_attempts=3,
        intervals_hours=[24, 72, 168],
        is_active=True,
    )
    session.add(strategy)
    await session.commit()
    print("Seeded default retry strategy.")


async def run_seed():
    """Main entry: init DB, seed data."""
    await init_db()

    async with AsyncSessionLocal() as session:
        # Check if already seeded
        count_result = await session.execute(select(func.count()).select_from(Payment))
        if count_result.scalar() > 0:
            print("Database already seeded. Skipping.")
            return

        await seed_payments(session, count=180)
        await seed_default_strategy(session)


if __name__ == "__main__":
    asyncio.run(run_seed())
