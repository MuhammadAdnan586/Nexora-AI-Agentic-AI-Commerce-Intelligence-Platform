from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class RiskReviewStatus(str, enum.Enum):
    pending = "pending"
    cleared = "cleared"
    blocked = "blocked"


class RiskReview(Base):
    __tablename__ = "risk_reviews"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    signals = Column(String, nullable=True)  # stored as joined text
    status = Column(Enum(RiskReviewStatus), default=RiskReviewStatus.pending, nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)