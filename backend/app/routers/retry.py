"""
Retry strategy and simulation API.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import RetryStrategySchema, RetryStrategyUpdateSchema, SimulateResponseSchema
from app.services.retry_engine import run_simulation
from app.services.strategy import get_active_strategy, ensure_default_strategy

router = APIRouter()


@router.get("/retry-strategy", response_model=RetryStrategySchema)
async def get_retry_strategy(db: AsyncSession = Depends(get_db)):
    """Get the active retry strategy."""
    strategy = await get_active_strategy(db)
    if not strategy:
        strategy = await ensure_default_strategy(db)
    await db.commit()

    return RetryStrategySchema(
        id=strategy.id,
        name=strategy.name,
        decline_categories=strategy.decline_categories,
        max_attempts=strategy.max_attempts,
        intervals_hours=strategy.intervals_hours,
        is_active=strategy.is_active,
    )


@router.put("/retry-strategy", response_model=RetryStrategySchema)
async def update_retry_strategy(
    payload: RetryStrategyUpdateSchema,
    db: AsyncSession = Depends(get_db),
):
    """Update the active retry strategy."""
    strategy = await get_active_strategy(db)
    if not strategy:
        strategy = await ensure_default_strategy(db)

    if payload.name is not None:
        strategy.name = payload.name
    if payload.decline_categories is not None:
        strategy.decline_categories = payload.decline_categories
    if payload.max_attempts is not None:
        strategy.max_attempts = payload.max_attempts
    if payload.intervals_hours is not None:
        if not payload.intervals_hours:
            raise HTTPException(
                status_code=400,
                detail="intervals_hours cannot be empty. Provide at least one interval (e.g. [24, 72, 168])",
            )
        strategy.intervals_hours = payload.intervals_hours

    await db.commit()
    await db.refresh(strategy)

    return RetryStrategySchema(
        id=strategy.id,
        name=strategy.name,
        decline_categories=strategy.decline_categories,
        max_attempts=strategy.max_attempts,
        intervals_hours=strategy.intervals_hours,
        is_active=strategy.is_active,
    )


@router.post("/retry/simulate", response_model=SimulateResponseSchema)
async def simulate_retries(db: AsyncSession = Depends(get_db)):
    """Run retry simulation for eligible payments."""
    attempts = await run_simulation(db)
    return SimulateResponseSchema(
        attempts_made=attempts,
        message=f"Simulated {attempts} retry attempt(s).",
    )
