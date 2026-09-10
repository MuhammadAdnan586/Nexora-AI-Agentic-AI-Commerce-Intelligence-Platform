from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.vehicle import VehicleType, VehicleStatus
from app.models.driver import DriverStatus
from app.models.delivery_route import RouteStatus, StopType, StopStatus
from app.models.delivery import DeliveryStatus


class VehicleCreate(BaseModel):
    plate_number: str
    type: VehicleType = VehicleType.van
    capacity_kg: Optional[float] = None
    capacity_volume_m3: Optional[float] = None
    warehouse_id: Optional[int] = None


class VehicleResponse(VehicleCreate):
    id: int
    status: VehicleStatus
    created_at: datetime

    class Config:
        from_attributes = True


class DriverCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    license_number: Optional[str] = None
    vehicle_id: Optional[int] = None
    warehouse_id: Optional[int] = None


class DriverResponse(DriverCreate):
    id: int
    status: DriverStatus
    created_at: datetime

    class Config:
        from_attributes = True


class RouteStopCreate(BaseModel):
    order_id: Optional[int] = None
    sequence: int = 0
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    stop_type: StopType = StopType.delivery


class RouteStopResponse(RouteStopCreate):
    id: int
    route_id: int
    status: StopStatus
    planned_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None

    class Config:
        from_attributes = True


class DeliveryRouteCreate(BaseModel):
    driver_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    route_date: Optional[datetime] = None


class DeliveryRouteResponse(DeliveryRouteCreate):
    id: int
    status: RouteStatus
    total_distance_km: Optional[float] = None
    total_stops: int
    weather_risk_score: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DeliveryCreate(BaseModel):
    order_id: int
    delivery_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    scheduled_date: Optional[datetime] = None


class DeliveryResponse(DeliveryCreate):
    id: int
    route_id: Optional[int] = None
    driver_id: Optional[int] = None
    status: DeliveryStatus
    weather_risk_score: Optional[float] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DeliveryStatusUpdate(BaseModel):
    status: DeliveryStatus
    description: Optional[str] = None