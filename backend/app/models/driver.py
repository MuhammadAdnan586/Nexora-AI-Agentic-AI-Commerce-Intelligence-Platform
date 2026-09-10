from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class DriverStatus(str, enum.Enum):
    available = "available"
    on_route = "on_route"
    off_duty = "off_duty"


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    license_number = Column(String, nullable=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    status = Column(Enum(DriverStatus), default=DriverStatus.available, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())