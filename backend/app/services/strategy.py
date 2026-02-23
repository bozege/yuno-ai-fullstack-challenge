"""
Retry strategy CRUD and lookup.
"""
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RetryStrategy


async def get_active_strategy(db: AsyncSession) -> Optional[RetryStrategy]:
    """Get the currently active retry strategy."""
    result = await db.execute(select(RetryStrategy).where(RetryStrategy.is_active == True).limit(1))
    return result.scalar_one_or_none()


async def ensure_default_strategy(db: AsyncSession) -> RetryStrategy:
    """Ensure a default strategy exists. Create if none."""
    strategy = await get_active_strategy(db)
    if strategy:
        return strategy

    strategy = RetryStrategy(
        name="Default Soft Retry",
        decline_categories=["soft"],
        max_attempts=3,
        intervals_hours=[24, 72, 168],
        is_active=True,
    )
    db.add(strategy)
    await db.flush()
    await db.refresh(strategy)
    return strategy
