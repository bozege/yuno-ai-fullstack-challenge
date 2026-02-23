"""
Pydantic schemas for API request/response validation.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ----- Payment schemas -----
class RetryAttemptSchema(BaseModel):
    id: int
    attempted_at: datetime
    outcome: str
    decline_reason: Optional[str] = None


class PaymentListSchema(BaseModel):
    id: int
    payment_id: str
    customer_name: str
    amount: float
    currency: str
    payment_method_type: str
    failed_at: datetime
    decline_reason: str
    decline_category: str
    status: str
    retry_count: int
    max_retries: Optional[int] = None

    class Config:
        from_attributes = True


class PaymentDetailSchema(BaseModel):
    id: int
    payment_id: str
    customer_name: str
    amount: float
    currency: str
    payment_method_type: str
    failed_at: datetime
    decline_reason: str
    decline_code: Optional[str] = None
    decline_category: str
    status: str
    retry_attempts: list[RetryAttemptSchema]
    max_retries: Optional[int] = None

    class Config:
        from_attributes = True


# ----- Retry strategy schemas -----
class RetryStrategySchema(BaseModel):
    id: int
    name: str
    decline_categories: list[str]
    max_attempts: int
    intervals_hours: list[float]  # Hours; supports decimals for testing (e.g. 0.017 = 1 min)
    is_active: bool

    class Config:
        from_attributes = True


class RetryStrategyUpdateSchema(BaseModel):
    name: Optional[str] = None
    decline_categories: Optional[list[str]] = None  # e.g. ["soft"] or specific reasons
    max_attempts: Optional[int] = Field(None, ge=1, le=10)
    intervals_hours: Optional[list[float]] = Field(None, min_length=1, max_length=10)


class RetryStrategyCreateSchema(BaseModel):
    name: str
    decline_categories: list[str]
    max_attempts: int = Field(ge=1, le=10)
    intervals_hours: list[float] = Field(min_length=1, max_length=10)


# ----- Analytics schemas -----
class AnalyticsSchema(BaseModel):
    total_failed: int
    total_retried: int
    total_recovered: int
    recovery_rate_pct: float
    revenue_recovered_usd: float


# ----- Simulate response -----
class SimulateResponseSchema(BaseModel):
    attempts_made: int
    message: str
