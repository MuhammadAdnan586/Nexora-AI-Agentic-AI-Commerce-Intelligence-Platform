from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.user import User


def compute_order_risk(db: Session, order_id: int) -> dict:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {"error": "Order not found"}

    signals = []
    score = 0.0

    # --- Signal 1: Order amount vs customer's average ---
    customer_orders = db.query(Order).filter(Order.user_id == order.user_id, Order.id != order.id).all()
    if customer_orders:
        avg_amount = sum(o.total_amount for o in customer_orders) / len(customer_orders)
        if avg_amount > 0 and order.total_amount > avg_amount * 3:
            score += 25
            signals.append(f"Order amount (${order.total_amount:.2f}) is 3x+ higher than customer's average (${avg_amount:.2f}).")
    else:
        # First-ever order from this customer
        platform_avg = db.query(func.avg(Order.total_amount)).scalar() or 0
        if platform_avg and order.total_amount > platform_avg * 3:
            score += 30
            signals.append(f"First order from new customer is unusually large (${order.total_amount:.2f} vs platform average ${platform_avg:.2f}).")

    # --- Signal 2: Rapid repeat orders (possible bot/fraud) ---
    recent_window = order.created_at - timedelta(minutes=10)
    recent_orders = db.query(Order).filter(
        Order.user_id == order.user_id,
        Order.created_at >= recent_window,
        Order.created_at < order.created_at,
    ).count()
    if recent_orders >= 2:
        score += 20
        signals.append(f"{recent_orders} other order(s) placed by the same customer within 10 minutes.")

    # --- Signal 3: New account, first order ---
    customer = db.query(User).filter(User.id == order.user_id).first()
    if customer:
        account_age = order.created_at - customer.created_at.replace(tzinfo=order.created_at.tzinfo) if customer.created_at else timedelta(days=999)
        if account_age < timedelta(hours=1) and order.total_amount > 100:
            score += 15
            signals.append("Account created less than 1 hour before this order was placed.")

    # --- Signal 4: High item quantity concentration (bulk single product, resale pattern) ---
    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    max_qty = max((i.quantity for i in items), default=0)
    if max_qty >= 10:
        score += 15
        signals.append(f"Single line item quantity is unusually high ({max_qty} units).")

    # --- Signal 5: No shipping address provided ---
    if not order.shipping_address or len(order.shipping_address.strip()) < 5:
        score += 10
        signals.append("Shipping address is missing or incomplete.")

    score = min(score, 100)

    if score >= 60:
        risk_level = "high"
    elif score >= 30:
        risk_level = "medium"
    else:
        risk_level = "low"

    if not signals:
        signals.append("No unusual patterns detected.")

    return {
        "order_id": order.id,
        "risk_score": round(score, 1),
        "risk_level": risk_level,
        "signals": signals,
    }


def compute_risk_for_all_recent_orders(db: Session, limit: int = 50) -> list:
    orders = db.query(Order).order_by(Order.created_at.desc()).limit(limit).all()
    results = [compute_order_risk(db, o.id) for o in orders]
    results.sort(key=lambda r: r.get("risk_score", 0), reverse=True)
    return results