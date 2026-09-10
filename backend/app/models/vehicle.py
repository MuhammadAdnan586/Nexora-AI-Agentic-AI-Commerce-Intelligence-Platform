from sqlalchemy import Column, Integer, String, Float, Enum, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class VehicleType(str, enum.Enum):
    bike = "bike"
    van = "van"
    truck = "truck"


class VehicleStatus(str, enum.Enum):
    available = "available"
    in_use = "in_use"
    maintenance = "maintenance"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String, unique=True, nullable=False)
    type = Column(Enum(VehicleType), default=VehicleType.van, nullable=False)
    capacity_kg = Column(Float, nullable=True)
    capacity_volume_m3 = Column(Float, nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    status = Column(Enum(VehicleStatus), default=VehicleStatus.available, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())