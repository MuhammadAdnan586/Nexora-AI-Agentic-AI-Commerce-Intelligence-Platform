from fastapi import HTTPException
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.core.deps import get_db, get_current_user
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.product import Product
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.user import User
from app.schemas.order import OrderCreate, OrderResponse

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("/checkout", response_model=OrderResponse)
def checkout(
    order_data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.warehouse import Warehouse
    from app.models.inventory import Inventory

    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    total_amount = 0.0
    order_items_data = []

    for cart_item in cart.items:
        product = db.query(Product).filter(Product.id == cart_item.product_id).first()
        if not product or not product.is_active:
            raise HTTPException(status_code=400, detail=f"Product {cart_item.product_id} unavailable")

        subtotal = product.price * cart_item.quantity
        total_amount += subtotal
        order_items_data.append({
            "product_id": product.id,
            "quantity": cart_item.quantity,
            "unit_price": product.price,
        })

# --- Determine fulfilling warehouse (city match only; admin assigns manually otherwise) ---
    target_warehouse = None
    if order_data.city:
        target_warehouse = (
            db.query(Warehouse).filter(Warehouse.city.ilike(f"%{order_data.city}%")).first()
        )

    new_order = Order(
        user_id=current_user.id,
        total_amount=total_amount,
        shipping_address=order_data.shipping_address,
        warehouse_id=target_warehouse.id if target_warehouse else None,
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    for item_data in order_items_data:
        order_item = OrderItem(order_id=new_order.id, **item_data)
        db.add(order_item)

        # Deduct stock from the fulfilling warehouse, if tracked there
        if target_warehouse:
            inv = db.query(Inventory).filter(
                Inventory.product_id == item_data["product_id"],
                Inventory.warehouse_id == target_warehouse.id,
            ).first()
            if inv:
                inv.quantity = max(0, inv.quantity - item_data["quantity"])

    for cart_item in cart.items:
        db.delete(cart_item)

    db.commit()
    db.refresh(new_order)

    return new_order


@router.get("/", response_model=List[OrderResponse])
def list_my_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Order).filter(Order.user_id == current_user.id).all()


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
from pydantic import BaseModel
from app.models.return_request import ReturnRequest


class CustomerReturnCreate(BaseModel):
    order_item_id: int
    reason: str
    image_url: str | None = None


@router.post("/returns")
def create_customer_return(
    data: CustomerReturnCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order_item = db.query(OrderItem).filter(OrderItem.id == data.order_item_id).first()
    if not order_item:
        raise HTTPException(status_code=404, detail="Order item not found")

    order = db.query(Order).filter(Order.id == order_item.order_id).first()
    if not order or order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="This order does not belong to you")

    ret = ReturnRequest(order_item_id=data.order_item_id, reason=data.reason, image_url=data.image_url)
    db.add(ret)
    db.commit()
    db.refresh(ret)

    return {"message": "Return request submitted", "return_id": ret.id}
@router.get("/returns/mine")
def get_my_returns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.warehouse import Warehouse

    my_orders = db.query(Order).filter(Order.user_id == current_user.id).all()
    order_ids = [o.id for o in my_orders]

    my_items = db.query(OrderItem).filter(OrderItem.order_id.in_(order_ids)).all()
    item_ids = [i.id for i in my_items]

    returns = db.query(ReturnRequest).filter(ReturnRequest.order_item_id.in_(item_ids)).order_by(ReturnRequest.created_at.desc()).all()

    result = []
    for r in returns:
        item = next((i for i in my_items if i.id == r.order_item_id), None)
        order = next((o for o in my_orders if item and o.id == item.order_id), None)
        warehouse = None
        if order and order.warehouse_id:
            warehouse = db.query(Warehouse).filter(Warehouse.id == order.warehouse_id).first()

        result.append({
            "id": r.id,
            "order_id": order.id if order else None,
            "reason": r.reason,
            "status": r.status.value,
            "admin_note": r.admin_note,
            "refund_warehouse": warehouse.name if warehouse else None,
            "refund_warehouse_address": f"{warehouse.address or ''}, {warehouse.city or ''}".strip(", ") if warehouse else None,
            "created_at": r.created_at.isoformat(),
        })
    return result
from app.models.message import OrderMessage


class CustomerMessageCreate(BaseModel):
    message: str


@router.get("/{order_id}/messages")
def get_my_order_messages(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    messages = db.query(OrderMessage).filter(OrderMessage.order_id == order_id).order_by(OrderMessage.created_at).all()
    return [
        {
            "id": m.id, "sender_name": m.sender_name, "sender_id": m.sender_id, "message": m.message,
            "is_me": m.sender_id == current_user.id,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@router.post("/{order_id}/messages")
def send_my_order_message(
    order_id: int,
    data: CustomerMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    msg = OrderMessage(
        order_id=order_id,
        sender_id=current_user.id,
        sender_name=current_user.full_name or "Customer",
        message=data.message,
    )
    db.add(msg)
    db.commit()
    return {"message": "Sent"}