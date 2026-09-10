from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ReturnStatus(str, enum.Enum):
    requested = "requested"
    approved = "approved"
    rejected = "rejected"
    completed = "completed"


class ReturnRequest(Base):
    __tablename__ = "returns"

    id = Column(Integer, primary_key=True, index=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id"), nullable=False)
    reason = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    status = Column(Enum(ReturnStatus), default=ReturnStatus.requested, nullable=False)
    admin_note = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())