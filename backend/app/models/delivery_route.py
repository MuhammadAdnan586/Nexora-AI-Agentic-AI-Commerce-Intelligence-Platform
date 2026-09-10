from sqlalchemy import Column, Integer, String, Float, Enum, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class RouteStatus(str, enum.Enum):
    planned = "planned"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class DeliveryRoute(Base):
    __tablename__ = "delivery_routes"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    route_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(RouteStatus), default=RouteStatus.planned, nullable=False)
    total_distance_km = Column(Float, nullable=True)
    total_stops = Column(Integer, default=0)
    weather_risk_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StopType(str, enum.Enum):
    pickup = "pickup"
    delivery = "delivery"


class StopStatus(str, enum.Enum):
    pending = "pending"
    arrived = "arrived"
    completed = "completed"
    failed = "failed"


class RouteStop(Base):
    __tablename__ = "route_stops"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("delivery_routes.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    sequence = Column(Integer, nullable=False, default=0)
    address = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    stop_type = Column(Enum(StopType), default=StopType.delivery, nullable=False)
    status = Column(Enum(StopStatus), default=StopStatus.pending, nullable=False)
    planned_arrival = Column(DateTime(timezone=True), nullable=True)
    actual_arrival = Column(DateTime(timezone=True), nullable=True)
    notes = Column(String, nullable=True)