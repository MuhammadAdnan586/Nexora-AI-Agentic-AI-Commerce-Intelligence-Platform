from sqlalchemy import Column, Integer, String, Float, Enum, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class DeliveryStatus(str, enum.Enum):
    pending = "pending"
    assigned = "assigned"
    in_transit = "in_transit"
    delivered = "delivered"
    failed = "failed"
    returned = "returned"


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    route_id = Column(Integer, ForeignKey("delivery_routes.id"), nullable=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    status = Column(Enum(DeliveryStatus), default=DeliveryStatus.pending, nullable=False)
    delivery_address = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    weather_risk_score = Column(Float, nullable=True)
    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DeliveryEvent(Base):
    __tablename__ = "delivery_events"

    id = Column(Integer, primary_key=True, index=True)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"), nullable=False)
    event_type = Column(String, nullable=False)  # e.g. "assigned", "picked_up", "delayed", "delivered"
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())