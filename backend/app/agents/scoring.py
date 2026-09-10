from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.product import Product
from app.models.order_item import OrderItem
from app.models.inventory import Inventory
from app.models.return_request import ReturnRequest


def compute_opportunity_scores(db: Session):
    products = db.query(Product).filter(Product.is_active == True).all()
    results = []

    for product in products:
        units_sold = (
            db.query(func.coalesce(func.sum(OrderItem.quantity), 0))
            .filter(OrderItem.product_id == product.id)
            .scalar()
        )
        revenue = (
            db.query(func.coalesce(func.sum(OrderItem.quantity * OrderItem.unit_price), 0))
            .filter(OrderItem.product_id == product.id)
            .scalar()
        )

        cost = product.cost_price or 0
        margin_percent = ((product.price - cost) / product.price * 100) if product.price else 0

        stock = (
            db.query(func.coalesce(func.sum(Inventory.quantity), 0))
            .filter(Inventory.product_id == product.id)
            .scalar()
        )
        reorder_level = (
            db.query(func.coalesce(func.avg(Inventory.reorder_level), 10))
            .filter(Inventory.product_id == product.id)
            .scalar()
        )

        returns_count = (
            db.query(func.count(ReturnRequest.id))
            .join(OrderItem, ReturnRequest.order_item_id == OrderItem.id)
            .filter(OrderItem.product_id == product.id)
            .scalar()
        )

        # --- Scoring (0-100 each, then weighted) ---
        sales_score = min(units_sold * 5, 100)
        margin_score = max(0, min(margin_percent, 100))
        inventory_score = 100 if stock > reorder_level else (40 if stock > 0 else 0)
        returns_penalty = min(returns_count * 15, 50)

        opportunity_score = round(
            (sales_score * 0.35) + (margin_score * 0.35) + (inventory_score * 0.30) - returns_penalty,
            1,
        )
        opportunity_score = max(0, min(opportunity_score, 100))

        if opportunity_score >= 70:
            recommendation = "Promote — strong performer"
        elif opportunity_score >= 40:
            recommendation = "Monitor — stable"
        else:
            recommendation = "Review — underperforming or at risk"

        results.append({
            "product_id": product.id,
            "name": product.name,
            "units_sold": int(units_sold),
            "revenue": round(float(revenue), 2),
            "margin_percent": round(margin_percent, 1),
            "stock": int(stock),
            "returns_count": int(returns_count),
            "opportunity_score": opportunity_score,
            "recommendation": recommendation,
        })

    results.sort(key=lambda r: r["opportunity_score"], reverse=True)
    return results