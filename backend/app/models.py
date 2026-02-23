"""
SQLAlchemy models for payments, retry attempts, and retry strategies.
"""
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class Payment(Base):
    """Failed payment record."""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    payment_id = Column(String(50), unique=True, nullable=False)  # Searchable external ID
    customer_name = Column(String(200), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), nullable=False)
    payment_method_type = Column(String(50), nullable=False)
    failed_at = Column(DateTime, nullable=False)
    decline_reason = Column(String(100), nullable=False)
    decline_code = Column(String(50), nullable=True)
    decline_category = Column(String(20), nullable=False)  # 'soft' or 'hard'
    status = Column(String(20), nullable=False)  # 'failed' or 'recovered'

    retry_attempts = relationship(
        "RetryAttempt", back_populates="payment", order_by="RetryAttempt.attempted_at"
    )


class RetryAttempt(Base):
    """A single retry attempt for a failed payment."""
    __tablename__ = "retry_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    attempted_at = Column(DateTime, nullable=False)
    outcome = Column(String(20), nullable=False)  # 'success' or 'failed'
    decline_reason = Column(String(100), nullable=True)  # Only when outcome is 'failed'

    payment = relationship("Payment", back_populates="retry_attempts")


class RetryStrategy(Base):
    """Retry strategy configuration."""
    __tablename__ = "retry_strategy"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    decline_categories = Column(JSON, nullable=False)  # e.g. ["soft"] or ["Insufficient Funds"]
    max_attempts = Column(Integer, nullable=False)
    intervals_hours = Column(JSON, nullable=False)  # e.g. [24, 72, 168]
    is_active = Column(Boolean, default=True)
