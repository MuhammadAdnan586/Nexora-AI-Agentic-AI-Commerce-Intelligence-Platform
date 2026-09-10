from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.deps import get_db, require_role
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.order import Order
from app.models.category import Category
from app.models.order_item import OrderItem

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    total_revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0)).scalar()
    total_orders = db.query(func.count(Order.id)).scalar()
    total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar()
    total_customers = db.query(func.count(User.id)).filter(User.role == UserRole.customer).scalar()
    total_categories = db.query(func.count(Category.id)).scalar()

    return {
        "total_revenue": float(total_revenue),
        "total_orders": total_orders,
        "total_products": total_products,
        "total_customers": total_customers,
        "total_categories": total_categories,
    }


from typing import List
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.schemas.order import OrderResponse
from pydantic import BaseModel


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


@router.get("/orders")
def list_all_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    from app.models.order_shipment import OrderShipment

    orders = db.query(Order).order_by(Order.created_at.desc()).all()
    result = []
    for o in orders:
        warehouse_names = []
        if o.warehouse_id:
            wh = db.query(Warehouse).filter(Warehouse.id == o.warehouse_id).first()
            if wh:
                warehouse_names.append(wh.name)

        shipments = db.query(OrderShipment).filter(OrderShipment.order_id == o.id).all()
        for s in shipments:
            wh = db.query(Warehouse).filter(Warehouse.id == s.warehouse_id).first()
            if wh and wh.name not in warehouse_names:
                warehouse_names.append(wh.name)

        warehouse_name = ", ".join(warehouse_names) if warehouse_names else None

        items = db.query(OrderItem).filter(OrderItem.order_id == o.id).all()
        result.append({
            "id": o.id,
            "status": o.status.value,
            "total_amount": o.total_amount,
            "shipping_address": o.shipping_address,
            "warehouse_id": o.warehouse_id,
            "warehouse_name": warehouse_name,
            "created_at": o.created_at.isoformat(),
            "items": [
                {"id": i.id, "product_id": i.product_id, "quantity": i.quantity, "unit_price": i.unit_price}
                for i in items
            ],
        })
    return result


@router.put("/orders/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order


from app.schemas.user import UserResponse


@router.get("/customers", response_model=List[UserResponse])
def list_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    return db.query(User).filter(User.role == UserRole.customer).order_by(User.created_at.desc()).all()


from app.models.inventory import Inventory
from app.models.warehouse import Warehouse
from pydantic import BaseModel as PydanticBaseModel


class InventoryItemResponse(PydanticBaseModel):
    id: int
    product_id: int
    product_name: str
    warehouse_id: int
    warehouse_name: str
    quantity: int
    reorder_level: int

    class Config:
        from_attributes = True


class InventoryUpdate(PydanticBaseModel):
    quantity: int


class WarehouseCreate(PydanticBaseModel):
    name: str
    address: str | None = None
    city: str | None = None


class WarehouseResponse(PydanticBaseModel):
    id: int
    name: str
    address: str | None
    city: str | None

    class Config:
        from_attributes = True


@router.get("/warehouses", response_model=List[WarehouseResponse])
def list_warehouses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    return db.query(Warehouse).all()


@router.post("/warehouses", response_model=WarehouseResponse)
def create_warehouse(
    data: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    warehouse = Warehouse(**data.model_dump())
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.get("/inventory", response_model=List[InventoryItemResponse])
def list_inventory(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    rows = db.query(Inventory).all()
    result = []
    for inv in rows:
        product = db.query(Product).filter(Product.id == inv.product_id).first()
        warehouse = db.query(Warehouse).filter(Warehouse.id == inv.warehouse_id).first()
        result.append({
            "id": inv.id,
            "product_id": inv.product_id,
            "product_name": product.name if product else "Unknown",
            "warehouse_id": inv.warehouse_id,
            "warehouse_name": warehouse.name if warehouse else "Unknown",
            "quantity": inv.quantity,
            "reorder_level": inv.reorder_level,
        })
    return result


class InventoryCreate(PydanticBaseModel):
    product_id: int
    warehouse_id: int
    quantity: int
    reorder_level: int = 10


@router.post("/inventory", response_model=InventoryItemResponse)
def create_inventory(
    data: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    inv = Inventory(**data.model_dump())
    db.add(inv)
    db.commit()
    db.refresh(inv)
    product = db.query(Product).filter(Product.id == inv.product_id).first()
    warehouse = db.query(Warehouse).filter(Warehouse.id == inv.warehouse_id).first()
    return {
        "id": inv.id,
        "product_id": inv.product_id,
        "product_name": product.name if product else "Unknown",
        "warehouse_id": inv.warehouse_id,
        "warehouse_name": warehouse.name if warehouse else "Unknown",
        "quantity": inv.quantity,
        "reorder_level": inv.reorder_level,
    }


@router.put("/inventory/{inventory_id}", response_model=InventoryItemResponse)
def update_inventory(
    inventory_id: int,
    data: InventoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    inv = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory record not found")
    inv.quantity = data.quantity
    db.commit()
    db.refresh(inv)
    product = db.query(Product).filter(Product.id == inv.product_id).first()
    warehouse = db.query(Warehouse).filter(Warehouse.id == inv.warehouse_id).first()
    return {
        "id": inv.id,
        "product_id": inv.product_id,
        "product_name": product.name if product else "Unknown",
        "warehouse_id": inv.warehouse_id,
        "warehouse_name": warehouse.name if warehouse else "Unknown",
        "quantity": inv.quantity,
        "reorder_level": inv.reorder_level,
    }


from app.models.supplier import Supplier
from app.models.purchase_order import PurchaseOrder, PurchaseOrderStatus


class SupplierCreate(PydanticBaseModel):
    name: str
    contact_email: str | None = None
    contact_phone: str | None = None
    address: str | None = None


class SupplierResponse(PydanticBaseModel):
    id: int
    name: str
    contact_email: str | None
    contact_phone: str | None

    class Config:
        from_attributes = True


@router.get("/suppliers", response_model=List[SupplierResponse])
def list_suppliers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    return db.query(Supplier).all()


@router.post("/suppliers", response_model=SupplierResponse)
def create_supplier(
    data: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


class PurchaseOrderCreate(PydanticBaseModel):
    supplier_id: int
    warehouse_id: int
    product_id: int
    quantity: int
    unit_cost: float


class PurchaseOrderResponse(PydanticBaseModel):
    id: int
    supplier_id: int
    warehouse_id: int
    product_id: int
    quantity: int
    unit_cost: float
    status: PurchaseOrderStatus

    class Config:
        from_attributes = True


class PurchaseOrderStatusUpdate(PydanticBaseModel):
    status: PurchaseOrderStatus


@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
def list_purchase_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    return db.query(PurchaseOrder).order_by(PurchaseOrder.created_at.desc()).all()


@router.post("/purchase-orders", response_model=PurchaseOrderResponse)
def create_purchase_order(
    data: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    po = PurchaseOrder(**data.model_dump())
    db.add(po)
    db.commit()
    db.refresh(po)
    return po


@router.put("/purchase-orders/{po_id}/status", response_model=PurchaseOrderResponse)
def update_po_status(
    po_id: int,
    data: PurchaseOrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    po.status = data.status

    # If received, add stock to inventory
    if data.status == PurchaseOrderStatus.received:
        inv = db.query(Inventory).filter(
            Inventory.product_id == po.product_id,
            Inventory.warehouse_id == po.warehouse_id,
        ).first()
        if inv:
            inv.quantity += po.quantity
        else:
            inv = Inventory(product_id=po.product_id, warehouse_id=po.warehouse_id, quantity=po.quantity)
            db.add(inv)

    db.commit()
    db.refresh(po)
    return po


from app.agents.scoring import compute_opportunity_scores


@router.get("/product-intelligence")
def product_intelligence(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    return compute_opportunity_scores(db)


from app.ml.inventory_intelligence import analyze_inventory


@router.get("/inventory-intelligence")
def inventory_intelligence(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    return analyze_inventory(db)


from app.ml.pricing import simulate_promotion


@router.get("/pricing-simulator/{product_id}")
def pricing_simulator(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    return simulate_promotion(db, product_id)


from app.models.promotion import Promotion, PromotionStatus
from datetime import datetime


class PromotionCreate(PydanticBaseModel):
    product_id: int
    discount_percent: float
    projected_profit: float
    margin_percent: float


class PromotionResponse(PydanticBaseModel):
    id: int
    product_id: int
    discount_percent: float
    projected_profit: float
    margin_percent: float
    status: PromotionStatus

    class Config:
        from_attributes = True


@router.post("/promotions", response_model=PromotionResponse)
def create_promotion(
    data: PromotionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    promo = Promotion(**data.model_dump())
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return promo


@router.get("/promotions", response_model=List[PromotionResponse])
def list_promotions(
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    query = db.query(Promotion)
    if status:
        query = query.filter(Promotion.status == status)
    return query.order_by(Promotion.created_at.desc()).all()


@router.put("/promotions/{promo_id}/decide")
def decide_promotion(
    promo_id: int,
    decision: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    promo = db.query(Promotion).filter(Promotion.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promotion not found")

    promo.status = PromotionStatus.approved if decision == "approve" else PromotionStatus.rejected
    promo.decided_at = datetime.utcnow()

    if decision == "approve":
        product = db.query(Product).filter(Product.id == promo.product_id).first()
        if product:
            product.price = round(product.price * (1 - promo.discount_percent / 100), 2)

        campaign = Campaign(
            product_id=promo.product_id,
            name=f"{promo.discount_percent}% off promotion",
            discount_percent=promo.discount_percent,
            predicted_units=0,
            predicted_revenue=0,
            predicted_profit=promo.projected_profit,
        )
        db.add(campaign)

    db.commit()
    db.refresh(promo)
    return {"message": f"Promotion {decision}d", "promotion_id": promo.id}


from app.models.campaign import Campaign, CampaignStatus


class CampaignCreate(PydanticBaseModel):
    product_id: int
    name: str
    discount_percent: float
    predicted_units: float
    predicted_revenue: float
    predicted_profit: float


class CampaignActualResponse(PydanticBaseModel):
    id: int
    product_id: int
    name: str
    discount_percent: float
    predicted_units: float
    predicted_revenue: float
    predicted_profit: float
    actual_units: int
    actual_revenue: float
    status: str


@router.post("/campaigns")
def create_campaign(
    data: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    campaign = Campaign(**data.model_dump())
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return {"message": "Campaign created", "campaign_id": campaign.id}


@router.get("/campaigns", response_model=List[CampaignActualResponse])
def list_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    campaigns = db.query(Campaign).order_by(Campaign.started_at.desc()).all()
    result = []
    for c in campaigns:
        actual_units = (
            db.query(func.coalesce(func.sum(OrderItem.quantity), 0))
            .join(Order, Order.id == OrderItem.order_id)
            .filter(OrderItem.product_id == c.product_id, Order.created_at >= c.started_at)
            .scalar()
        )
        actual_revenue = (
            db.query(func.coalesce(func.sum(OrderItem.quantity * OrderItem.unit_price), 0))
            .join(Order, Order.id == OrderItem.order_id)
            .filter(OrderItem.product_id == c.product_id, Order.created_at >= c.started_at)
            .scalar()
        )
        result.append({
            "id": c.id,
            "product_id": c.product_id,
            "name": c.name,
            "discount_percent": c.discount_percent,
            "predicted_units": c.predicted_units,
            "predicted_revenue": c.predicted_revenue,
            "predicted_profit": c.predicted_profit,
            "actual_units": int(actual_units),
            "actual_revenue": float(actual_revenue),
            "status": c.status.value,
        })
    return result


@router.put("/campaigns/{campaign_id}/status")
def update_campaign_status(
    campaign_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = status
    if status in ("completed", "stopped"):
        campaign.ended_at = datetime.utcnow()
    db.commit()
    return {"message": f"Campaign marked as {status}"}


@router.get("/products-stock-summary")
def products_stock_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    products = db.query(Product).all()
    result = []
    for product in products:
        inv_records = db.query(Inventory).filter(Inventory.product_id == product.id).all()
        breakdown = []
        for inv in inv_records:
            warehouse = db.query(Warehouse).filter(Warehouse.id == inv.warehouse_id).first()
            breakdown.append({
                "warehouse_id": inv.warehouse_id,
                "warehouse_name": warehouse.name if warehouse else "Unknown",
                "quantity": inv.quantity,
            })
        result.append({
            "product_id": product.id,
            "product_name": product.name,
            "total_stock": sum(b["quantity"] for b in breakdown),
            "warehouses": breakdown,
        })
    return result


@router.get("/orders/{order_id}")
def get_order_detail(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    customer = db.query(User).filter(User.id == order.user_id).first()

    warehouse = None
    if order.warehouse_id:
        warehouse = db.query(Warehouse).filter(Warehouse.id == order.warehouse_id).first()

    from app.models.order_shipment import OrderShipment
    shipment_records = db.query(OrderShipment).filter(OrderShipment.order_id == order.id).all()
    shipments_data = []
    for s in shipment_records:
        s_warehouse = db.query(Warehouse).filter(Warehouse.id == s.warehouse_id).first()
        s_items = db.query(OrderItem).filter(OrderItem.shipment_id == s.id).all()
        shipments_data.append({
            "id": s.id,
            "warehouse_id": s.warehouse_id,
            "warehouse_name": s_warehouse.name if s_warehouse else "Unknown",
            "city": s_warehouse.city if s_warehouse else None,
            "status": s.status.value,
            "items": [
                {"order_item_id": i.id, "product_id": i.product_id, "quantity": i.quantity}
                for i in s_items
            ],
        })

    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    item_details = []
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        item_details.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_name": product.name if product else "Unknown",
            "sku": product.sku if product else None,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "subtotal": round(item.quantity * item.unit_price, 2),
        })

    return {
        "id": order.id,
        "status": order.status.value,
        "total_amount": order.total_amount,
        "shipping_address": order.shipping_address,
        "created_at": order.created_at.isoformat(),
        "customer": {
            "id": customer.id,
            "name": customer.full_name,
            "email": customer.email,
        } if customer else None,
        "warehouse": {
            "id": warehouse.id,
            "name": warehouse.name,
            "city": warehouse.city,
        } if warehouse else None,
        "shipments": shipments_data,
        "items": item_details,
    }


from app.models.return_request import ReturnRequest, ReturnStatus


class ReturnCreate(PydanticBaseModel):
    order_item_id: int
    reason: str | None = None


@router.post("/returns")
def create_return(
    data: ReturnCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    order_item = db.query(OrderItem).filter(OrderItem.id == data.order_item_id).first()
    if not order_item:
        raise HTTPException(status_code=404, detail="Order item not found")

    ret = ReturnRequest(order_item_id=data.order_item_id, reason=data.reason)
    db.add(ret)
    db.commit()
    db.refresh(ret)
    return {"message": "Return request created", "return_id": ret.id}


@router.get("/returns")
def list_returns(
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    query = db.query(ReturnRequest)
    if status:
        query = query.filter(ReturnRequest.status == status)
    returns = query.order_by(ReturnRequest.created_at.desc()).all()

    result = []
    for r in returns:
        item = db.query(OrderItem).filter(OrderItem.id == r.order_item_id).first()
        product = db.query(Product).filter(Product.id == item.product_id).first() if item else None
        order = db.query(Order).filter(Order.id == item.order_id).first() if item else None
        warehouse = None
        if order and order.warehouse_id:
            warehouse = db.query(Warehouse).filter(Warehouse.id == order.warehouse_id).first()

        result.append({
            "id": r.id,
            "order_id": order.id if order else None,
            "product_name": product.name if product else "Unknown",
            "quantity": item.quantity if item else 0,
            "warehouse_name": warehouse.name if warehouse else "Unassigned",
            "reason": r.reason,
            "image_url": r.image_url,
            "status": r.status.value,
        })
    return result


@router.put("/returns/{return_id}/process")
def process_return(
    return_id: int,
    decision: str,
    note: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    ret = db.query(ReturnRequest).filter(ReturnRequest.id == return_id).first()
    if not ret:
        raise HTTPException(status_code=404, detail="Return request not found")

    ret.admin_note = note or None

    if decision == "approve":
        ret.status = ReturnStatus.completed
        item = db.query(OrderItem).filter(OrderItem.id == ret.order_item_id).first()
        if item:
            order = db.query(Order).filter(Order.id == item.order_id).first()
            if order and order.warehouse_id:
                inv = db.query(Inventory).filter(
                    Inventory.product_id == item.product_id,
                    Inventory.warehouse_id == order.warehouse_id,
                ).first()
                if inv:
                    inv.quantity += item.quantity
                else:
                    inv = Inventory(product_id=item.product_id, warehouse_id=order.warehouse_id, quantity=item.quantity)
                    db.add(inv)

                product = db.query(Product).filter(Product.id == item.product_id).first()
                notification = WarehouseNotification(
                    warehouse_id=order.warehouse_id,
                    order_id=order.id,
                    message=f"Return approved for order #{order.id} — expect {item.quantity}x {product.name if product else 'item'} back in stock.",
                )
                db.add(notification)
    else:
        ret.status = ReturnStatus.rejected

    db.commit()
    return {"message": f"Return {decision}d"}


@router.get("/warehouses/{warehouse_id}")
def get_warehouse_detail(
    warehouse_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    inv_records = db.query(Inventory).filter(Inventory.warehouse_id == warehouse_id).all()
    stock = []
    for inv in inv_records:
        product = db.query(Product).filter(Product.id == inv.product_id).first()
        stock.append({
            "product_id": inv.product_id,
            "product_name": product.name if product else "Unknown",
            "sku": product.sku if product else None,
            "quantity": inv.quantity,
            "reorder_level": inv.reorder_level,
        })

    orders = db.query(Order).filter(Order.warehouse_id == warehouse_id).order_by(Order.created_at.desc()).limit(20).all()
    order_list = [
        {"id": o.id, "status": o.status.value, "total_amount": o.total_amount, "created_at": o.created_at.isoformat()}
        for o in orders
    ]

    total_orders = db.query(func.count(Order.id)).filter(Order.warehouse_id == warehouse_id).scalar()

    return {
        "id": warehouse.id,
        "name": warehouse.name,
        "city": warehouse.city,
        "address": warehouse.address,
        "total_stock_items": sum(s["quantity"] for s in stock),
        "total_orders_fulfilled": total_orders,
        "stock": stock,
        "recent_orders": order_list,
    }


from app.models.notification import WarehouseNotification, NotificationStatus


class AssignWarehouseRequest(PydanticBaseModel):
    warehouse_id: int


@router.get("/orders/{order_id}/warehouse-options")
def warehouse_stock_options(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    """For a given order, show every warehouse and how much stock it has for each REMAINING unassigned item."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    items = db.query(OrderItem).filter(OrderItem.order_id == order.id, OrderItem.shipment_id.is_(None)).all()
    product_ids = [i.product_id for i in items]

    warehouses = db.query(Warehouse).all()
    result = []
    for wh in warehouses:
        stock_for_items = []
        can_fulfill_all = True
        for item in items:
            inv = db.query(Inventory).filter(
                Inventory.warehouse_id == wh.id, Inventory.product_id == item.product_id
            ).first()
            qty = inv.quantity if inv else 0
            if qty < item.quantity:
                can_fulfill_all = False
            product = db.query(Product).filter(Product.id == item.product_id).first()
            stock_for_items.append({
                "product_name": product.name if product else "Unknown",
                "needed": item.quantity,
                "available": qty,
            })
        result.append({
            "warehouse_id": wh.id,
            "warehouse_name": wh.name,
            "city": wh.city,
            "can_fulfill_all": can_fulfill_all,
            "items": stock_for_items,
        })
    return result


@router.put("/orders/{order_id}/assign-warehouse")
def assign_warehouse(
    order_id: int,
    data: AssignWarehouseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    warehouse = db.query(Warehouse).filter(Warehouse.id == data.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    was_unassigned = order.warehouse_id is None
    previous_warehouse_id = order.warehouse_id

    if previous_warehouse_id and previous_warehouse_id != warehouse.id:
        old_notifications = db.query(WarehouseNotification).filter(
            WarehouseNotification.order_id == order.id,
            WarehouseNotification.warehouse_id == previous_warehouse_id,
        ).all()
        for n in old_notifications:
            n.status = NotificationStatus.acknowledged
            n.message = f"[Reassigned to another warehouse] {n.message}"

    order.warehouse_id = warehouse.id
    db.commit()

    # Deduct stock only the first time a warehouse is assigned
    if was_unassigned:
        items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        for item in items:
            inv = db.query(Inventory).filter(
                Inventory.product_id == item.product_id,
                Inventory.warehouse_id == warehouse.id,
            ).first()
            if inv:
                inv.quantity = max(0, inv.quantity - item.quantity)
        db.commit()

    notification = WarehouseNotification(
        warehouse_id=warehouse.id,
        order_id=order.id,
        message=f"New order #{order.id} assigned — please prepare for shipping. Total: ${order.total_amount:.2f}",
    )
    db.add(notification)
    db.commit()

    return {"message": f"Order assigned to {warehouse.name} and notification sent"}


@router.put("/orders/{order_id}/assign-warehouse-partial")
def assign_warehouse_partial(
    order_id: int,
    data: AssignWarehouseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    from app.models.order_shipment import OrderShipment, ShipmentStatus

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    warehouse = db.query(Warehouse).filter(Warehouse.id == data.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    # Only items not yet assigned to any shipment/warehouse
    unassigned_items = db.query(OrderItem).filter(
        OrderItem.order_id == order.id, OrderItem.shipment_id.is_(None)
    ).all()

    fulfillable = []
    for item in unassigned_items:
        inv = db.query(Inventory).filter(
            Inventory.warehouse_id == warehouse.id, Inventory.product_id == item.product_id
        ).first()
        if inv and inv.quantity >= item.quantity:
            fulfillable.append(item)

    if not fulfillable:
        raise HTTPException(status_code=400, detail="This warehouse has no unassigned items it can fulfill")

    shipment = OrderShipment(order_id=order.id, warehouse_id=warehouse.id, status=ShipmentStatus.pending)
    db.add(shipment)
    db.flush()

    item_names = []
    for item in fulfillable:
        item.shipment_id = shipment.id
        inv = db.query(Inventory).filter(
            Inventory.warehouse_id == warehouse.id, Inventory.product_id == item.product_id
        ).first()
        inv.quantity = max(0, inv.quantity - item.quantity)
        product = db.query(Product).filter(Product.id == item.product_id).first()
        item_names.append(f"{item.quantity}x {product.name if product else 'item'}")

    order.warehouse_id = warehouse.id  # last-assigned warehouse (legacy single-field reference)
    if order.status == OrderStatus.pending:
        order.status = OrderStatus.confirmed

    notification = WarehouseNotification(
        warehouse_id=warehouse.id,
        order_id=order.id,
        message=f"New order #{order.id} — please prepare: {', '.join(item_names)}.",
    )
    db.add(notification)
    db.commit()

    return {"message": f"{len(fulfillable)} item(s) assigned to {warehouse.name} and notified", "shipment_id": shipment.id}


@router.get("/warehouses/{warehouse_id}/notifications")
def get_warehouse_notifications(
    warehouse_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    notifications = (
        db.query(WarehouseNotification)
        .filter(WarehouseNotification.warehouse_id == warehouse_id)
        .order_by(WarehouseNotification.created_at.desc())
        .all()
    )
    return [
        {
            "id": n.id,
            "order_id": n.order_id,
            "message": n.message,
            "status": n.status.value,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifications
    ]


@router.put("/notifications/{notification_id}/acknowledge")
def acknowledge_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    notification = db.query(WarehouseNotification).filter(WarehouseNotification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.status = NotificationStatus.acknowledged
    db.commit()
    return {"message": "Acknowledged"}


from app.core.security import hash_password


class WarehouseStaffCreate(PydanticBaseModel):
    email: str
    password: str
    full_name: str
    warehouse_id: int


@router.post("/warehouse-staff")
def create_warehouse_staff(
    data: WarehouseStaffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    staff = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.warehouse,
        warehouse_id=data.warehouse_id,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return {"message": "Warehouse staff created", "user_id": staff.id}


@router.get("/warehouse-staff")
def list_warehouse_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    staff = db.query(User).filter(User.role == UserRole.warehouse).all()
    result = []
    for s in staff:
        wh = db.query(Warehouse).filter(Warehouse.id == s.warehouse_id).first()
        result.append({
            "id": s.id,
            "email": s.email,
            "full_name": s.full_name,
            "warehouse_id": s.warehouse_id,
            "warehouse_name": wh.name if wh else None,
        })
    return result


class WarehouseStaffUpdate(PydanticBaseModel):
    full_name: str | None = None
    warehouse_id: int | None = None
    password: str | None = None


@router.put("/warehouse-staff/{staff_id}")
def update_warehouse_staff(
    staff_id: int,
    data: WarehouseStaffUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    staff = db.query(User).filter(User.id == staff_id, User.role == UserRole.warehouse).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    if data.full_name is not None:
        staff.full_name = data.full_name
    if data.warehouse_id is not None:
        staff.warehouse_id = data.warehouse_id
    if data.password:
        staff.hashed_password = hash_password(data.password)

    db.commit()
    return {"message": "Staff updated"}


@router.delete("/warehouse-staff/{staff_id}")
def delete_warehouse_staff(
    staff_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    staff = db.query(User).filter(User.id == staff_id, User.role == UserRole.warehouse).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    db.delete(staff)
    db.commit()
    return {"message": "Staff removed"}


from app.models.order_shipment import OrderShipment, ShipmentStatus
from collections import defaultdict


class ShipmentItemAssignment(PydanticBaseModel):
    order_item_id: int
    warehouse_id: int


class SplitAssignRequest(PydanticBaseModel):
    assignments: List[ShipmentItemAssignment]


@router.post("/orders/{order_id}/split-assign")
def split_assign_warehouses(
    order_id: int,
    data: SplitAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    by_warehouse = defaultdict(list)
    for a in data.assignments:
        by_warehouse[a.warehouse_id].append(a.order_item_id)

    created_count = 0
    for warehouse_id, item_ids in by_warehouse.items():
        warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
        if not warehouse:
            continue

        shipment = OrderShipment(order_id=order.id, warehouse_id=warehouse_id, status=ShipmentStatus.pending)
        db.add(shipment)
        db.flush()

        for item_id in item_ids:
            item = db.query(OrderItem).filter(OrderItem.id == item_id, OrderItem.order_id == order.id).first()
            if not item:
                continue
            item.shipment_id = shipment.id
            inv = db.query(Inventory).filter(
                Inventory.product_id == item.product_id,
                Inventory.warehouse_id == warehouse_id,
            ).first()
            if inv:
                inv.quantity = max(0, inv.quantity - item.quantity)

        notification = WarehouseNotification(
            warehouse_id=warehouse_id,
            order_id=order.id,
            message=f"New shipment for order #{order.id} - please prepare {len(item_ids)} item(s) for shipping.",
        )
        db.add(notification)
        created_count += 1

    order.status = OrderStatus.confirmed
    db.commit()

    return {"message": f"Order split into {created_count} shipment(s)"}


@router.get("/orders/{order_id}/shipments")
def list_order_shipments(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    shipments = db.query(OrderShipment).filter(OrderShipment.order_id == order_id).all()
    result = []
    for s in shipments:
        warehouse = db.query(Warehouse).filter(Warehouse.id == s.warehouse_id).first()
        items = db.query(OrderItem).filter(OrderItem.shipment_id == s.id).all()
        item_details = []
        for item in items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            item_details.append({
                "id": item.id,
                "product_name": product.name if product else "Unknown",
                "quantity": item.quantity,
            })
        result.append({
            "id": s.id,
            "warehouse_id": s.warehouse_id,
            "warehouse_name": warehouse.name if warehouse else "Unknown",
            "city": warehouse.city if warehouse else None,
            "status": s.status.value,
            "items": item_details,
        })
    return result


class ShipmentStatusUpdate(PydanticBaseModel):
    status: ShipmentStatus


@router.put("/shipments/{shipment_id}/status")
def update_shipment_status(
    shipment_id: int,
    data: ShipmentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations, UserRole.warehouse)),
):
    shipment = db.query(OrderShipment).filter(OrderShipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    shipment.status = data.status
    db.commit()

    order = db.query(Order).filter(Order.id == shipment.order_id).first()
    if order:
        all_shipments = db.query(OrderShipment).filter(OrderShipment.order_id == order.id).all()
        if all_shipments and all(s.status == ShipmentStatus.delivered for s in all_shipments):
            order.status = OrderStatus.delivered
        elif any(s.status in (ShipmentStatus.shipped, ShipmentStatus.delivered) for s in all_shipments):
            order.status = OrderStatus.shipped
        db.commit()

    return {"message": "Shipment status updated"}


from app.models.message import OrderMessage


class MessageCreate(PydanticBaseModel):
    message: str
    warehouse_id: int | None = None
    attachment_url: str | None = None
    attachment_name: str | None = None


@router.get("/orders/{order_id}/messages")
def get_order_messages(
    order_id: int,
    warehouse_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    query = db.query(OrderMessage).filter(OrderMessage.order_id == order_id)
    if warehouse_id is not None:
        query = query.filter(OrderMessage.warehouse_id == warehouse_id)
    messages = query.order_by(OrderMessage.created_at).all()
    return [
        {
            "id": m.id, "sender_name": m.sender_name, "sender_id": m.sender_id, "message": m.message,
            "attachment_url": m.attachment_url, "attachment_name": m.attachment_name,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@router.post("/orders/{order_id}/messages")
def send_order_message(
    order_id: int,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    msg = OrderMessage(
        order_id=order_id,
        warehouse_id=data.warehouse_id,
        sender_id=current_user.id,
        sender_name=current_user.full_name or "Admin",
        message=data.message,
        attachment_url=data.attachment_url,
        attachment_name=data.attachment_name,
    )
    db.add(msg)
    db.commit()
    return {"message": "Sent"}


from app.ml.fulfillment_routing import compute_routing_plan


@router.get("/orders/{order_id}/routing-plan")
def get_routing_plan(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    return compute_routing_plan(db, order_id)


@router.post("/orders/{order_id}/execute-routing")
def execute_routing_plan(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    plan = compute_routing_plan(db, order_id)
    if "error" in plan:
        raise HTTPException(status_code=404, detail=plan["error"])

    if not plan["assignments"]:
        raise HTTPException(status_code=400, detail="No warehouse can fulfill any items in this order")

    assignments_payload = []
    for a in plan["assignments"]:
        for item in a["items"]:
            assignments_payload.append(
                ShipmentItemAssignment(order_item_id=item["order_item_id"], warehouse_id=a["warehouse_id"])
            )

    return split_assign_warehouses(order_id, SplitAssignRequest(assignments=assignments_payload), db, current_user)


from app.ml.risk_scoring import compute_order_risk, compute_risk_for_all_recent_orders
from app.models.risk_review import RiskReview, RiskReviewStatus


@router.get("/risk/scan")
def scan_recent_orders_for_risk(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    results = compute_risk_for_all_recent_orders(db, limit=limit)

    # Auto-escalate high-risk orders into the review queue (if not already there)
    for r in results:
        if r.get("risk_level") == "high":
            existing = db.query(RiskReview).filter(
                RiskReview.order_id == r["order_id"], RiskReview.status == RiskReviewStatus.pending
            ).first()
            if not existing:
                review = RiskReview(
                    order_id=r["order_id"],
                    risk_score=r["risk_score"],
                    risk_level=r["risk_level"],
                    signals="; ".join(r["signals"]),
                )
                db.add(review)
    db.commit()

    return results


@router.get("/risk/order/{order_id}")
def get_order_risk(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    return compute_order_risk(db, order_id)


@router.get("/risk/reviews")
def list_risk_reviews(
    status: str = "pending",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    query = db.query(RiskReview)
    if status:
        query = query.filter(RiskReview.status == status)
    reviews = query.order_by(RiskReview.risk_score.desc()).all()

    result = []
    for r in reviews:
        order = db.query(Order).filter(Order.id == r.order_id).first()
        customer = db.query(User).filter(User.id == order.user_id).first() if order else None
        result.append({
            "id": r.id,
            "order_id": r.order_id,
            "customer_email": customer.email if customer else "Unknown",
            "total_amount": order.total_amount if order else 0,
            "risk_score": r.risk_score,
            "risk_level": r.risk_level,
            "signals": r.signals.split("; ") if r.signals else [],
            "status": r.status.value,
            "created_at": r.created_at.isoformat(),
        })
    return result


@router.put("/risk/reviews/{review_id}/decide")
def decide_risk_review(
    review_id: int,
    decision: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    from datetime import datetime

    review = db.query(RiskReview).filter(RiskReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    review.status = RiskReviewStatus.cleared if decision == "clear" else RiskReviewStatus.blocked
    review.reviewed_by = current_user.id
    review.reviewed_at = datetime.utcnow()

    if decision == "block":
        order = db.query(Order).filter(Order.id == review.order_id).first()
        if order:
            order.status = OrderStatus.cancelled

    db.commit()
    return {"message": f"Order {decision}ed"}


@router.get("/orders/{order_id}/risk-status")
def get_order_risk_status(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    review = (
        db.query(RiskReview)
        .filter(RiskReview.order_id == order_id, RiskReview.status == RiskReviewStatus.pending)
        .order_by(RiskReview.created_at.desc())
        .first()
    )
    if not review:
        return {"has_pending_review": False}
    return {
        "has_pending_review": True,
        "risk_score": review.risk_score,
        "risk_level": review.risk_level,
        "signals": review.signals.split("; ") if review.signals else [],
    }


from app.models.user import User as UserModel


@router.get("/messages/customers")
def list_customer_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    rows = (
        db.query(OrderMessage, Order)
        .join(Order, Order.id == OrderMessage.order_id)
        .filter(OrderMessage.warehouse_id.is_(None))
        .order_by(OrderMessage.created_at.desc())
        .all()
    )
    seen = {}
    for msg, order in rows:
        if order.user_id not in seen:
            customer = db.query(User).filter(User.id == order.user_id).first()
            seen[order.user_id] = {
                "user_id": order.user_id,
                "name": customer.full_name if customer else "Unknown",
                "email": customer.email if customer else "",
                "last_message": msg.message,
                "last_message_at": msg.created_at.isoformat(),
                "unread": msg.sender_id != current_user.id,
            }
    return list(seen.values())


@router.get("/messages/customers/{user_id}/thread")
def get_customer_thread(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    order_ids = [o.id for o in db.query(Order).filter(Order.user_id == user_id).all()]
    messages = (
        db.query(OrderMessage)
        .filter(OrderMessage.order_id.in_(order_ids), OrderMessage.warehouse_id.is_(None))
        .order_by(OrderMessage.created_at)
        .all()
    )
    return [
        {
            "id": m.id, "sender_name": m.sender_name, "sender_id": m.sender_id,
            "is_me": m.sender_id == current_user.id, "message": m.message,
            "order_id": m.order_id, "attachment_url": m.attachment_url,
            "attachment_name": m.attachment_name, "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@router.post("/messages/customers/{user_id}/send")
def send_customer_message(
    user_id: int,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    latest_order = db.query(Order).filter(Order.user_id == user_id).order_by(Order.created_at.desc()).first()
    if not latest_order:
        raise HTTPException(status_code=404, detail="This customer has no orders yet")

    msg = OrderMessage(
        order_id=latest_order.id,
        sender_id=current_user.id,
        sender_name=current_user.full_name or "Admin",
        message=data.message,
        attachment_url=data.attachment_url,
        attachment_name=data.attachment_name,
    )
    db.add(msg)
    db.commit()
    return {"message": "Sent"}


@router.get("/messages/warehouses")
def list_warehouse_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    rows = (
        db.query(OrderMessage)
        .filter(OrderMessage.warehouse_id.isnot(None))
        .order_by(OrderMessage.created_at.desc())
        .all()
    )
    seen = {}
    for msg in rows:
        if msg.warehouse_id not in seen:
            warehouse = db.query(Warehouse).filter(Warehouse.id == msg.warehouse_id).first()
            seen[msg.warehouse_id] = {
                "warehouse_id": msg.warehouse_id,
                "name": warehouse.name if warehouse else "Unknown",
                "city": warehouse.city if warehouse else "",
                "last_message": msg.message,
                "last_message_at": msg.created_at.isoformat(),
                "unread": msg.sender_id != current_user.id,
            }
    return list(seen.values())


@router.get("/messages/warehouses/{warehouse_id}/thread")
def get_warehouse_thread(
    warehouse_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    messages = (
        db.query(OrderMessage)
        .filter(OrderMessage.warehouse_id == warehouse_id)
        .order_by(OrderMessage.created_at)
        .all()
    )
    return [
        {
            "id": m.id, "sender_name": m.sender_name, "sender_id": m.sender_id,
            "is_me": m.sender_id == current_user.id, "message": m.message,
            "order_id": m.order_id, "attachment_url": m.attachment_url,
            "attachment_name": m.attachment_name, "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@router.post("/messages/warehouses/{warehouse_id}/send")
def send_warehouse_message(
    warehouse_id: int,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    from app.models.order_shipment import OrderShipment

    latest_order = (
        db.query(Order)
        .outerjoin(OrderShipment, OrderShipment.order_id == Order.id)
        .filter((Order.warehouse_id == warehouse_id) | (OrderShipment.warehouse_id == warehouse_id))
        .order_by(Order.created_at.desc())
        .first()
    )
    if not latest_order:
        raise HTTPException(status_code=404, detail="No orders found for this warehouse yet")

    msg = OrderMessage(
        order_id=latest_order.id,
        warehouse_id=warehouse_id,
        sender_id=current_user.id,
        sender_name=current_user.full_name or "Admin",
        message=data.message,
        attachment_url=data.attachment_url,
        attachment_name=data.attachment_name,
    )
    db.add(msg)
    db.commit()
    return {"message": "Sent"}
@router.get("/messages/all-customers")
def list_all_customers_for_messaging(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    customers = db.query(User).filter(User.role == UserRole.customer).order_by(User.full_name).all()
    return [{"user_id": c.id, "name": c.full_name or c.email, "email": c.email} for c in customers]


@router.get("/messages/all-warehouses")
def list_all_warehouses_for_messaging(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    warehouses = db.query(Warehouse).order_by(Warehouse.name).all()
    return [{"warehouse_id": w.id, "name": w.name, "city": w.city} for w in warehouses]