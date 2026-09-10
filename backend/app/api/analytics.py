from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.core.deps import get_db, require_role
from app.models.user import User, UserRole
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.category import Category
from app.models.return_request import ReturnRequest

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/top-products")
def top_products(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    results = (
        db.query(
            Product.id,
            Product.name,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.quantity * OrderItem.unit_price).label("revenue"),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .group_by(Product.id, Product.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
        .all()
    )
    return [
        {"product_id": r.id, "name": r.name, "units_sold": int(r.units_sold), "revenue": float(r.revenue)}
        for r in results
    ]


@router.get("/top-categories")
def top_categories(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    results = (
        db.query(
            Category.id,
            Category.name,
            func.sum(OrderItem.quantity * OrderItem.unit_price).label("revenue"),
        )
        .join(Product, Product.category_id == Category.id)
        .join(OrderItem, OrderItem.product_id == Product.id)
        .group_by(Category.id, Category.name)
        .order_by(func.sum(OrderItem.quantity * OrderItem.unit_price).desc())
        .limit(limit)
        .all()
    )
    return [
        {"category_id": r.id, "name": r.name, "revenue": float(r.revenue)}
        for r in results
    ]


@router.get("/revenue-trend")
def revenue_trend(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    since = datetime.utcnow() - timedelta(days=days)
    results = (
        db.query(
            func.date(Order.created_at).label("date"),
            func.sum(Order.total_amount).label("revenue"),
            func.count(Order.id).label("orders"),
        )
        .filter(Order.created_at >= since)
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
        .all()
    )
    return [
        {"date": str(r.date), "revenue": float(r.revenue), "orders": r.orders}
        for r in results
    ]


@router.get("/profit-margin")
def profit_margin(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    results = (
        db.query(
            Product.id,
            Product.name,
            Product.price,
            Product.cost_price,
            func.sum(OrderItem.quantity).label("units_sold"),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .group_by(Product.id, Product.name, Product.price, Product.cost_price)
        .all()
    )
    data = []
    for r in results:
        cost = r.cost_price or 0
        margin = ((r.price - cost) / r.price * 100) if r.price else 0
        profit = (r.price - cost) * r.units_sold
        data.append({
            "product_id": r.id,
            "name": r.name,
            "price": float(r.price),
            "cost_price": float(cost),
            "margin_percent": round(margin, 2),
            "units_sold": int(r.units_sold),
            "total_profit": round(float(profit), 2),
        })
    return data


@router.get("/summary-metrics")
def summary_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    total_orders = db.query(func.count(Order.id)).scalar() or 0
    total_revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0)).scalar() or 0
    aov = (total_revenue / total_orders) if total_orders else 0

    total_returns = db.query(func.count(ReturnRequest.id)).scalar() or 0
    return_rate = (total_returns / total_orders * 100) if total_orders else 0

    total_units_sold = db.query(func.coalesce(func.sum(OrderItem.quantity), 0)).scalar() or 0
    total_stock = db.query(func.coalesce(func.sum(Product.id * 0), 0)).scalar() or 0  # placeholder

    return {
        "average_order_value": round(float(aov), 2),
        "return_rate_percent": round(float(return_rate), 2),
        "total_units_sold": int(total_units_sold),
        "total_orders": total_orders,
        "total_revenue": float(total_revenue),
    }