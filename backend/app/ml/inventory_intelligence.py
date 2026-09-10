from sqlalchemy.orm import Session
from app.models.product import Product
from app.models.inventory import Inventory
from app.ml.forecasting import forecast_next_days

DEFAULT_LEAD_TIME_DAYS = 5  # assumed supplier lead time if not otherwise known


def analyze_inventory(db: Session):
    products = db.query(Product).filter(Product.is_active == True).all()
    results = []

    for product in products:
        inv_records = db.query(Inventory).filter(Inventory.product_id == product.id).all()
        total_stock = sum(r.quantity for r in inv_records)
        reorder_level = inv_records[0].reorder_level if inv_records else 10

        forecast = forecast_next_days(db, product.id, days=7)
        avg_daily_demand = (
            sum(f["predicted_units"] for f in forecast) / len(forecast) if forecast else 0
        )

        if avg_daily_demand > 0:
            days_until_stockout = round(total_stock / avg_daily_demand, 1)
        else:
            days_until_stockout = None

        if days_until_stockout is not None and days_until_stockout <= DEFAULT_LEAD_TIME_DAYS:
            status = "critical"
            alert = f"Stock may run out in {days_until_stockout} days — within supplier lead time ({DEFAULT_LEAD_TIME_DAYS} days)."
        elif total_stock <= reorder_level:
            status = "low_stock"
            alert = "Stock is at or below reorder level."
        elif days_until_stockout is not None and days_until_stockout > 60:
            status = "overstock"
            alert = "Stock levels appear high relative to recent demand."
        else:
            status = "healthy"
            alert = "Stock levels are healthy."

        recommended_reorder = 0
        if status in ("critical", "low_stock"):
            recommended_reorder = max(
                0, round(avg_daily_demand * (DEFAULT_LEAD_TIME_DAYS + 14) - total_stock)
            )

        results.append({
            "product_id": product.id,
            "name": product.name,
            "current_stock": total_stock,
            "reorder_level": reorder_level,
            "avg_daily_demand": round(avg_daily_demand, 1),
            "days_until_stockout": days_until_stockout,
            "status": status,
            "alert": alert,
            "recommended_reorder_qty": recommended_reorder,
        })

    status_order = {"critical": 0, "low_stock": 1, "overstock": 2, "healthy": 3}
    results.sort(key=lambda r: status_order.get(r["status"], 4))
    return results