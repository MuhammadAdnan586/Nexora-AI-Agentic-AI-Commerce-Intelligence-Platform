from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class CampaignStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    stopped = "stopped"


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    name = Column(String, nullable=False)
    discount_percent = Column(Float, nullable=False)
    predicted_units = Column(Float, nullable=False)
    predicted_revenue = Column(Float, nullable=False)
    predicted_profit = Column(Float, nullable=False)
    status = Column(Enum(CampaignStatus), default=CampaignStatus.active, nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)