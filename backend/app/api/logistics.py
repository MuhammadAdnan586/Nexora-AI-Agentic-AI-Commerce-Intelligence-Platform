from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from app.models.order import Order, OrderStatus
from app.core.deps import get_db, require_role
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.delivery_route import DeliveryRoute, RouteStop
from app.models.delivery import Delivery, DeliveryEvent
from app.schemas.logistics import (
    VehicleCreate, VehicleResponse,
    DriverCreate, DriverResponse,
    DeliveryRouteCreate, DeliveryRouteResponse,
    RouteStopCreate, RouteStopResponse,
    DeliveryCreate, DeliveryResponse,
    DeliveryStatusUpdate,
)

router = APIRouter(prefix="/logistics", tags=["Logistics"])

MANAGE_ROLES = (UserRole.admin, UserRole.operations)


# ---------- Vehicles ----------
@router.get("/vehicles", response_model=List[VehicleResponse])
def list_vehicles(db: Session = Depends(get_db)):
    return db.query(Vehicle).all()


@router.post("/vehicles", response_model=VehicleResponse)
def create_vehicle(
    data: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*MANAGE_ROLES)),
):
    vehicle = Vehicle(**data.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


# ---------- Drivers ----------
@router.get("/drivers", response_model=List[DriverResponse])
def list_drivers(db: Session = Depends(get_db)):
    return db.query(Driver).all()


@router.post("/drivers", response_model=DriverResponse)
def create_driver(
    data: DriverCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*MANAGE_ROLES)),
):
    driver = Driver(**data.model_dump())
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver


# ---------- Routes ----------
@router.get("/routes", response_model=List[DeliveryRouteResponse])
def list_routes(db: Session = Depends(get_db)):
    return db.query(DeliveryRoute).all()


@router.get("/routes/{route_id}", response_model=DeliveryRouteResponse)
def get_route(route_id: int, db: Session = Depends(get_db)):
    route = db.query(DeliveryRoute).filter(DeliveryRoute.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return route


@router.post("/routes", response_model=DeliveryRouteResponse)
def create_route(
    data: DeliveryRouteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*MANAGE_ROLES)),
):
    route = DeliveryRoute(**data.model_dump())
    db.add(route)
    db.commit()
    db.refresh(route)
    return route


@router.post("/routes/{route_id}/stops", response_model=RouteStopResponse)
def add_route_stop(
    route_id: int,
    data: RouteStopCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*MANAGE_ROLES)),
):
    route = db.query(DeliveryRoute).filter(DeliveryRoute.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    stop = RouteStop(route_id=route_id, **data.model_dump())
    db.add(stop)
    route.total_stops = (route.total_stops or 0) + 1
    db.commit()
    db.refresh(stop)
    return stop


@router.get("/routes/{route_id}/stops", response_model=List[RouteStopResponse])
def list_route_stops(route_id: int, db: Session = Depends(get_db)):
    return db.query(RouteStop).filter(RouteStop.route_id == route_id).order_by(RouteStop.sequence).all()

@router.get("/orders/deliverable")
def list_deliverable_orders(db: Session = Depends(get_db)):
    orders = (
        db.query(Order)
        .filter(Order.status.in_([OrderStatus.pending, OrderStatus.confirmed, OrderStatus.shipped]))
        .order_by(Order.id.desc())
        .all()
    )
    return [
        {
            "id": o.id,
            "status": o.status,
            "shipping_address": o.shipping_address,
            "total_amount": o.total_amount,
        }
        for o in orders
    ]
# ---------- Deliveries ----------
@router.get("/deliveries", response_model=List[DeliveryResponse])
def list_deliveries(db: Session = Depends(get_db)):
    return db.query(Delivery).all()


@router.post("/deliveries", response_model=DeliveryResponse)
def create_delivery(
    data: DeliveryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*MANAGE_ROLES)),
):
    delivery = Delivery(**data.model_dump())
    db.add(delivery)
    db.commit()
    db.refresh(delivery)

    event = DeliveryEvent(
        delivery_id=delivery.id,
        event_type="created",
        description="Delivery created and pending assignment",
    )
    db.add(event)
    db.commit()
    return delivery


@router.patch("/deliveries/{delivery_id}/status", response_model=DeliveryResponse)
def update_delivery_status(
    delivery_id: int,
    data: DeliveryStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations, UserRole.warehouse)),
):
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")

    delivery.status = data.status
    if data.status.value == "delivered":
        delivery.delivered_at = datetime.now(timezone.utc)

    order = db.query(Order).filter(Order.id == delivery.order_id).first()
    if order:
        if data.status.value == "delivered":
            order.status = OrderStatus.delivered
        elif data.status.value == "in_transit":
            order.status = OrderStatus.shipped

    event = DeliveryEvent(
        delivery_id=delivery.id,
        event_type=data.status.value,
        description=data.description,
    )
    db.add(event)
    db.commit()
    db.refresh(delivery)
    return delivery