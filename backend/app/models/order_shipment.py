from sqlalchemy import Column, Integer, Enum, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ShipmentStatus(str, enum.Enum):
    pending = "pending"
    packed = "packed"
    shipped = "shipped"
    delivered = "delivered"


class OrderShipment(Base):
    __tablename__ = "order_shipments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    status = Column(Enum(ShipmentStatus), default=ShipmentStatus.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())