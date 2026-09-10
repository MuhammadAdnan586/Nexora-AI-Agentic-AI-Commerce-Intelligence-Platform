from fastapi import HTTPException
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_db, require_warehouse_staff
from app.services.route_optimizer import optimize_route
from app.models.user import User
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.notification import WarehouseNotification, NotificationStatus
from pydantic import BaseModel

router = APIRouter(prefix="/warehouse-portal", tags=["Warehouse Portal"])


def _order_belongs_to_my_warehouse(order_id: int, warehouse_id: int, db: Session) -> bool:
    from app.models.order_shipment import OrderShipment
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return False
    if order.warehouse_id == warehouse_id:
        return True
    has_shipment = db.query(OrderShipment).filter(
        OrderShipment.order_id == order_id, OrderShipment.warehouse_id == warehouse_id
    ).first()
    return has_shipment is not None


@router.get("/me")
def get_my_warehouse_info(current_user: User = Depends(require_warehouse_staff), db: Session = Depends(get_db)):
    from app.models.warehouse import Warehouse
    wh = db.query(Warehouse).filter(Warehouse.id == current_user.warehouse_id).first()
    return {"warehouse_id": wh.id, "warehouse_name": wh.name, "city": wh.city}


@router.get("/stock")
def get_my_stock(current_user: User = Depends(require_warehouse_staff), db: Session = Depends(get_db)):
    records = db.query(Inventory).filter(Inventory.warehouse_id == current_user.warehouse_id).all()
    result = []
    for inv in records:
        product = db.query(Product).filter(Product.id == inv.product_id).first()
        result.append({
            "product_id": inv.product_id,
            "product_name": product.name if product else "Unknown",
            "sku": product.sku if product else None,
            "quantity": inv.quantity,
            "reorder_level": inv.reorder_level,
        })
    return result


@router.get("/orders")
def get_my_orders(current_user: User = Depends(require_warehouse_staff), db: Session = Depends(get_db)):
    from app.models.order_shipment import OrderShipment

    my_shipments = db.query(OrderShipment).filter(OrderShipment.warehouse_id == current_user.warehouse_id).all()
    shipment_order_ids = {s.order_id for s in my_shipments}
    shipment_ids_by_order = {}
    for s in my_shipments:
        shipment_ids_by_order.setdefault(s.order_id, []).append(s.id)

    direct_orders = db.query(Order).filter(
        Order.warehouse_id == current_user.warehouse_id,
        ~Order.id.in_(shipment_order_ids) if shipment_order_ids else True,
    ).all()

    all_order_ids = shipment_order_ids | {o.id for o in direct_orders}
    orders = db.query(Order).filter(Order.id.in_(all_order_ids)).order_by(Order.created_at.desc()).all() if all_order_ids else []

    result = []
    for o in orders:
        if o.id in shipment_ids_by_order:
            # Split order: only show items belonging to this warehouse's shipment(s)
            my_shipment_ids = shipment_ids_by_order[o.id]
            items = db.query(OrderItem).filter(OrderItem.shipment_id.in_(my_shipment_ids)).all()
        else:
            # Direct (non-split) order: show all items
            items = db.query(OrderItem).filter(OrderItem.order_id == o.id).all()

        item_list = []
        my_total = 0.0
        for i in items:
            product = db.query(Product).filter(Product.id == i.product_id).first()
            item_list.append({"product_name": product.name if product else "Unknown", "quantity": i.quantity})
            my_total += i.quantity * i.unit_price

        result.append({
            "id": o.id,
            "status": o.status.value,
            "total_amount": round(my_total, 2),
            "shipping_address": o.shipping_address,
            "created_at": o.created_at.isoformat(),
            "items": item_list,
        })
    return result


class StatusUpdate(BaseModel):
    status: str


@router.put("/orders/{order_id}/status")
def update_order_status_from_warehouse(
    order_id: int,
    data: StatusUpdate,
    current_user: User = Depends(require_warehouse_staff),
    db: Session = Depends(get_db),
):
    if not _order_belongs_to_my_warehouse(order_id, current_user.warehouse_id, db):
        raise HTTPException(status_code=404, detail="Order not found for your warehouse")

    order = db.query(Order).filter(Order.id == order_id).first()
    order.status = data.status
    db.commit()
    return {"message": f"Order marked as {data.status}"}


@router.get("/notifications")
def get_my_notifications(current_user: User = Depends(require_warehouse_staff), db: Session = Depends(get_db)):
    notifications = (
        db.query(WarehouseNotification)
        .filter(WarehouseNotification.warehouse_id == current_user.warehouse_id)
        .order_by(WarehouseNotification.created_at.desc())
        .all()
    )
    return [
        {"id": n.id, "order_id": n.order_id, "message": n.message, "status": n.status.value, "created_at": n.created_at.isoformat()}
        for n in notifications
    ]


@router.put("/notifications/{notification_id}/acknowledge")
def acknowledge_my_notification(
    notification_id: int,
    current_user: User = Depends(require_warehouse_staff),
    db: Session = Depends(get_db),
):
    notification = (
        db.query(WarehouseNotification)
        .filter(WarehouseNotification.id == notification_id, WarehouseNotification.warehouse_id == current_user.warehouse_id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.status = NotificationStatus.acknowledged
    db.commit()
    return {"message": "Acknowledged"}
from app.models.message import OrderMessage


class MessageCreate(BaseModel):
    message: str
    attachment_url: str | None = None
    attachment_name: str | None = None

@router.get("/orders/{order_id}/messages")
def get_order_messages_warehouse(
    order_id: int,
    current_user: User = Depends(require_warehouse_staff),
    db: Session = Depends(get_db),
):
    if not _order_belongs_to_my_warehouse(order_id, current_user.warehouse_id, db):
        raise HTTPException(status_code=404, detail="Order not found for your warehouse")

    messages = (
        db.query(OrderMessage)
        .filter(
            OrderMessage.order_id == order_id,
            (OrderMessage.warehouse_id == current_user.warehouse_id) | (OrderMessage.warehouse_id.is_(None)),
        )
        .order_by(OrderMessage.created_at)
        .all()
    )
    return [
        {
            "id": m.id, "sender_name": m.sender_name, "sender_id": m.sender_id, "message": m.message,
            "attachment_url": m.attachment_url, "attachment_name": m.attachment_name,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@router.post("/orders/{order_id}/messages")
def send_order_message_warehouse(
    order_id: int,
    data: MessageCreate,
    current_user: User = Depends(require_warehouse_staff),
    db: Session = Depends(get_db),
):
    if not _order_belongs_to_my_warehouse(order_id, current_user.warehouse_id, db):
        raise HTTPException(status_code=404, detail="Order not found for your warehouse")

    msg = OrderMessage(
        order_id=order_id,
        warehouse_id=current_user.warehouse_id,
        sender_id=current_user.id,
        sender_name=current_user.full_name or "Warehouse Staff",
        message=data.message,
        attachment_url=data.attachment_url,
        attachment_name=data.attachment_name,
    )
    db.add(msg)
    db.commit()
    return {"message": "Sent"}


@router.get("/messages/conversations")
def list_my_order_conversations(current_user: User = Depends(require_warehouse_staff), db: Session = Depends(get_db)):
    from app.models.order_shipment import OrderShipment

    my_shipment_order_ids = {
        s.order_id for s in db.query(OrderShipment).filter(OrderShipment.warehouse_id == current_user.warehouse_id).all()
    }
    direct_order_ids = {
        o.id for o in db.query(Order).filter(Order.warehouse_id == current_user.warehouse_id).all()
    }
    all_ids = my_shipment_order_ids | direct_order_ids
    if not all_ids:
        return []

    rows = (
        db.query(OrderMessage, Order)
        .join(Order, Order.id == OrderMessage.order_id)
        .filter(
            OrderMessage.order_id.in_(all_ids),
            (OrderMessage.warehouse_id == current_user.warehouse_id) | (OrderMessage.warehouse_id.is_(None)),
        )
        .order_by(OrderMessage.created_at.desc())
        .all()
    )
    seen = {}
    for msg, order in rows:
        if order.id not in seen:
            seen[order.id] = {
                "order_id": order.id,
                "shipping_address": order.shipping_address,
                "last_message": msg.message,
                "last_message_at": msg.created_at.isoformat(),
                "unread": msg.sender_id != current_user.id,
            }
    return list(seen.values())
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
from typing import List
from datetime import datetime, timezone


# ---------- Vehicles (scoped to my warehouse) ----------

@router.get("/vehicles", response_model=List[VehicleResponse])
def list_my_vehicles(current_user: User = Depends(require_warehouse_staff), db: Session = Depends(get_db)):
    return db.query(Vehicle).filter(Vehicle.warehouse_id == current_user.warehouse_id).all()


@router.post("/vehicles", response_model=VehicleResponse)
def create_my_vehicle(
    data: VehicleCreate,
    current_user: User = Depends(require_warehouse_staff),
    db: Session = Depends(get_db),
):
    payload = data.model_dump()
    payload["warehouse_id"] = current_user.warehouse_id
    vehicle = Vehicle(**payload)
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


# ---------- Drivers (scoped to my warehouse) ----------

@router.get("/drivers", response_model=List[DriverResponse])
def list_my_drivers(current_user: User = Depends(require_warehouse_staff), db: Session = Depends(get_db)):
    return db.query(Driver).filter(Driver.warehouse_id == current_user.warehouse_id).all()


@router.post("/drivers", response_model=DriverResponse)
def create_my_driver(
    data: DriverCreate,
    current_user: User = Depends(require_warehouse_staff),
    db: Session = Depends(get_db),
):
    payload = data.model_dump()
    payload["warehouse_id"] = current_user.warehouse_id
    driver = Driver(**payload)
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver

class VehicleUpdate(BaseModel):
    plate_number: str | None = None
    type: str | None = None
    capacity_kg: float | None = None
    status: str | None = None


@router.put("/vehicles/{vehicle_id}", response_model=VehicleResponse)
def update_my_vehicle(
    vehicle_id: int,
    data: VehicleUpdate,
    current_user: User = Depends(require_warehouse_staff),
    db: Session = Depends(get_db),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.warehouse_id == current_user.warehouse_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found for your warehouse")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vehicle, key, value)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.delete("/vehicles/{vehicle_id}")
def delete_my_vehicle(
    vehicle_id: int,
    current_user: User = Depends(require_warehouse_staff),
    db: Session = Depends(get_db),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.warehouse_id == current_user.warehouse_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found for your warehouse")

    in_use = db.query(DeliveryRoute).filter(DeliveryRoute.vehicle_id == vehicle_id, DeliveryRoute.status.in_(["planned", "in_progress"])).first()
    if in_use:
        raise HTTPException(status_code=400, detail="Cannot delete: vehicle is assigned to an active route")

    # Unassign this vehicle from any drivers before deleting
    drivers_using_it = db.query(Driver).filter(Driver.vehicle_id == vehicle_id).all()
    for d in drivers_using_it:
        d.vehicle_id = None

    # Clear vehicle reference from completed/cancelled routes (history preserved, just unlinked)
    routes_using_it = db.query(DeliveryRoute).filter(DeliveryRoute.vehicle_id == vehicle_id).all()
    for r in routes_using_it:
        r.vehicle_id = None

    db.delete(vehicle)
    db.commit()
    return {"message": "Vehicle deleted"}


class DriverUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    license_number: str | None = None
    vehicle_id: int | None = None
    status: str | None = None


@router.put("/drivers/{driver_id}", response_model=DriverResponse)
def update_my_driver(
    driver_id: int,
    data: DriverUpdate,
    current_user: User = Depends(require_warehouse_staff),
    db: Session = Depends(get_db),
):
    driver = db.query(Driver).filter(Driver.id == driver_id, Driver.warehouse_id == current_user.warehouse_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found for your warehouse")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(driver, key, value)
    db.commit()
    db.refresh(driver)
    return driver


@router.delete("/drivers/{driver_id}")
def delete_my_driver(
    driver_id: int,
    current_user: User = Depends(require_warehouse_staff),
    db: Session = Depends(get_db),
):
    driver = db.query(Driver).filter(Driver.id == driver_id, Driver.warehouse_id == current_user.warehouse_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found for your warehouse")

    in_use = db.query(DeliveryRoute).filter(DeliveryRoute.driver_id == driver_id, DeliveryRoute.status.in_(["planned", "in_progress"])).first()
    if in_use:
        raise HTTPException(status_code=400, detail="Cannot delete: driver is assigned to an active route")

    routes_using_it = db.query(DeliveryRoute).filter(DeliveryRoute.driver_id == driver_id).all()
    for r in routes_using_it:
        r.driver_id = None

    db.delete(driver)
    db.commit()
    return {"message": "Driver deleted"}

@router.get("/routes", response_model=List[DeliveryRouteResponse])
def list_my_routes(current_user: User = Depends(require_warehouse_staff), db: Session = Depends(get_db)):
    return db.query(DeliveryRoute).filter(DeliveryRoute.warehouse_id == current_user.warehouse_id).all()


@router.post("/routes", response_model=DeliveryRouteResponse)
def create_my_route(
    data: DeliveryRouteCreate,
    current_user: User = Depends(require_warehouse_staff),
    db: Session = Depends(get_db),
):
    payload = data.model_dump()
    payload["warehouse_id"] = current_user.warehouse_id
    route = DeliveryRoute(**payload)
    db.add(route)
    db.commit()
    db.refresh(route)
    return route
class RouteStatusUpdate(BaseModel):
    status: str


@router.put("/routes/{route_id}/status")
def update_my_route_status(
    route_id: int,
    data: RouteStatusUpdate,
    current_user: User = Depends(require_warehouse_staff),
    db: Session = Depends(get_db),
):
    route = db.query(DeliveryRoute).filter(
        DeliveryRoute.id == route_id, DeliveryRoute.warehouse_id == current_user.warehouse_id
    ).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found for your warehouse")

    route.status = data.status
    db.commit()
    return {"message": f"Route marked as {data.status}"}

@router.post("/routes/{route_id}/stops", response_model=RouteStopResponse)
def add_my_route_stop(
    route_id: int,
    data: RouteStopCreate,
    current_user: User = Depends(require_warehouse_staff),
    db: Session = Depends(get_db),
):
    route = db.query(DeliveryRoute).filter(
        DeliveryRoute.id == route_id, DeliveryRoute.warehouse_id == current_user.warehouse_id
    ).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found for your warehouse")

    stop = RouteStop(route_id=route_id, **data.model_dump())
    db.add(stop)
    route.total_stops = (route.total_stops or 0) + 1
    db.commit()
    db.refresh(stop)
    return stop


@router.get("/routes/{route_id}/stops", response_model=List[RouteStopResponse])
def list_my_route_stops(
    route_id: int,
    current_user: User = Depends(require_warehouse_staff),
    db: Session = Depends(get_db),
):
    route = db.query(DeliveryRoute).filter(
        DeliveryRoute.id == route_id, DeliveryRoute.warehouse_id == current_user.warehouse_id
    ).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found for your warehouse")
    return db.query(RouteStop).filter(RouteStop.route_id == route_id).order_by(RouteStop.sequence).all()


@router.get("/deliveries", response_model=List[DeliveryResponse])
def list_my_deliveries(current_user: User = Depends(require_warehouse_staff), db: Session = Depends(get_db)):
    from app.models.order_shipment import OrderShipment

    my_shipment_order_ids = {
        s.order_id for s in db.query(OrderShipment).filter(OrderShipment.warehouse_id == current_user.warehouse_id).all()
    }
    direct_order_ids = {
        o.id for o in db.query(Order).filter(Order.warehouse_id == current_user.warehouse_id).all()
    }
    all_ids = my_shipment_order_ids | direct_order_ids
    if not all_ids:
        return []

    return db.query(Delivery).filter(Delivery.order_id.in_(all_ids)).all()

@router.post("/deliveries", response_model=DeliveryResponse)
def create_my_delivery(
    data: DeliveryCreate,
    current_user: User = Depends(require_warehouse_staff),
    db: Session = Depends(get_db),
):
    if not _order_belongs_to_my_warehouse(data.order_id, current_user.warehouse_id, db):
        raise HTTPException(status_code=404, detail="Order not found for your warehouse")

    delivery = Delivery(**data.model_dump())
    db.add(delivery)
    db.commit()
    db.refresh(delivery)

    event = DeliveryEvent(delivery_id=delivery.id, event_type="created", description="Delivery created and pending assignment")
    db.add(event)
    db.commit()
    return delivery


@router.patch("/deliveries/{delivery_id}/status", response_model=DeliveryResponse)
def update_my_delivery_status(
    delivery_id: int,
    data: DeliveryStatusUpdate,
    current_user: User = Depends(require_warehouse_staff),
    db: Session = Depends(get_db),
):
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery or not _order_belongs_to_my_warehouse(delivery.order_id, current_user.warehouse_id, db):
        raise HTTPException(status_code=404, detail="Delivery not found for your warehouse")

    delivery.status = data.status
    if data.status.value == "delivered":
        delivery.delivered_at = datetime.now(timezone.utc)

    order = db.query(Order).filter(Order.id == delivery.order_id).first()
    if order:
        if data.status.value == "delivered":
            order.status = OrderStatus.delivered
        elif data.status.value == "in_transit":
            order.status = OrderStatus.shipped

    event = DeliveryEvent(delivery_id=delivery.id, event_type=data.status.value, description=data.description)
    db.add(event)
    db.commit()
    db.refresh(delivery)
    return delivery


@router.get("/orders/deliverable")
def list_my_deliverable_orders(current_user: User = Depends(require_warehouse_staff), db: Session = Depends(get_db)):
    from app.models.order_shipment import OrderShipment

    my_shipment_order_ids = {
        s.order_id for s in db.query(OrderShipment).filter(OrderShipment.warehouse_id == current_user.warehouse_id).all()
    }
    direct_order_ids = {
        o.id for o in db.query(Order).filter(Order.warehouse_id == current_user.warehouse_id).all()
    }
    all_ids = my_shipment_order_ids | direct_order_ids
    if not all_ids:
        return []

    already_has_delivery = {
        d.order_id for d in db.query(Delivery).filter(Delivery.order_id.in_(all_ids)).all()
    }
    deliverable_ids = all_ids - already_has_delivery

    orders = (
        db.query(Order)
        .filter(
            Order.id.in_(deliverable_ids),
            Order.status.in_([OrderStatus.pending, OrderStatus.confirmed, OrderStatus.shipped]),
        )
        .order_by(Order.id.desc())
        .all()
    )
    return [
        {"id": o.id, "status": o.status, "shipping_address": o.shipping_address, "total_amount": o.total_amount}
        for o in orders
    ]


@router.post("/routes/{route_id}/optimize")
def optimize_my_route(
    route_id: int,
    current_user: User = Depends(require_warehouse_staff),
    db: Session = Depends(get_db),
):
    from app.models.warehouse import Warehouse

    route = db.query(DeliveryRoute).filter(
        DeliveryRoute.id == route_id, DeliveryRoute.warehouse_id == current_user.warehouse_id
    ).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found for your warehouse")

    warehouse = db.query(Warehouse).filter(Warehouse.id == current_user.warehouse_id).first()
    stops = db.query(RouteStop).filter(RouteStop.route_id == route_id).all()

    if not stops:
        raise HTTPException(status_code=400, detail="Route has no stops to optimize")

    vehicle = db.query(Vehicle).filter(Vehicle.id == route.vehicle_id).first() if route.vehicle_id else None

    result = optimize_route(
        depot={"latitude": warehouse.latitude if warehouse else None, "longitude": warehouse.longitude if warehouse else None},
        stops=[
            {"id": s.id, "latitude": s.latitude, "longitude": s.longitude, "weight_kg": 1}
            for s in stops
        ],
        vehicle_capacity_kg=None,
    )

    # Apply new sequence
    for seq, stop_id in enumerate(result["ordered_stop_ids"], start=1):
        stop = next((s for s in stops if s.id == stop_id), None)
        if stop:
            stop.sequence = seq

    route.total_distance_km = result["total_distance_km"]
    db.commit()

    return {
        "message": "Route optimized" if result["feasible"] else "Optimization used fallback order (infeasible constraints)",
        "ordered_stop_ids": result["ordered_stop_ids"],
        "total_distance_km": result["total_distance_km"],
        "feasible": result["feasible"],
    }


class ReassignStopRequest(BaseModel):
    new_route_id: int


@router.put("/routes/stops/{stop_id}/reassign")
def reassign_stop(
    stop_id: int,
    data: ReassignStopRequest,
    current_user: User = Depends(require_warehouse_staff),
    db: Session = Depends(get_db),
):
    """Move a stop to a different route (e.g. driver unavailable, vehicle broke down) and re-optimize both routes."""
    stop = db.query(RouteStop).filter(RouteStop.id == stop_id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")

    old_route_id = stop.route_id
    new_route = db.query(DeliveryRoute).filter(
        DeliveryRoute.id == data.new_route_id, DeliveryRoute.warehouse_id == current_user.warehouse_id
    ).first()
    if not new_route:
        raise HTTPException(status_code=404, detail="Target route not found for your warehouse")

    stop.route_id = data.new_route_id
    db.commit()

    old_route = db.query(DeliveryRoute).filter(DeliveryRoute.id == old_route_id).first()
    if old_route:
        old_route.total_stops = db.query(RouteStop).filter(RouteStop.route_id == old_route_id).count()
    new_route.total_stops = db.query(RouteStop).filter(RouteStop.route_id == data.new_route_id).count()
    db.commit()

    return {"message": f"Stop #{stop_id} reassigned to route #{data.new_route_id}. Re-run optimize on both routes."}
