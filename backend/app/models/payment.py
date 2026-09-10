from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, Enum, String
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    amount = Column(Float, nullable=False)
    method = Column(String, nullable=True)   # e.g. card, cod, wallet
    status = Column(Enum(PaymentStatus), default=PaymentStatus.pending, nullable=False)
    transaction_ref = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())