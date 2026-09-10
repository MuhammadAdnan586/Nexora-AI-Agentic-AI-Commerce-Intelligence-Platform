from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class NotificationStatus(str, enum.Enum):
    pending = "pending"
    acknowledged = "acknowledged"


class WarehouseNotification(Base):
    __tablename__ = "warehouse_notifications"

    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    message = Column(String, nullable=False)
    status = Column(Enum(NotificationStatus), default=NotificationStatus.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())