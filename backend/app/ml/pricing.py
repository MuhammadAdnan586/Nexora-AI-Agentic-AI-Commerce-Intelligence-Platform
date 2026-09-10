from sqlalchemy.orm import Session
from app.models.product import Product
from app.ml.forecasting import forecast_next_days

# Simple price-elasticity assumption: for every 1% discount, demand rises ~1.5%
# (This is a reasonable heuristic for a demo; a real system would learn this from data.)
ELASTICITY_FACTOR = 1.5

DISCOUNT_OPTIONS = [10, 15, 20]
MIN_MARGIN_PERCENT = 20  # never allow a discount that drops margin below this
MAX_DISCOUNT_PERCENT = 30  # never recommend a discount above this

def simulate_promotion(db: Session, product_id: int) -> dict:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return {"error": "Product not found"}

    cost = product.cost_price or 0
    base_price = product.price

    forecast = forecast_next_days(db, product_id, days=7)
    baseline_daily_demand = (
        sum(f["predicted_units"] for f in forecast) / len(forecast) if forecast else 1
    )
    baseline_weekly_units = baseline_daily_demand * 7

    baseline_revenue = baseline_weekly_units * base_price
    baseline_profit = baseline_weekly_units * (base_price - cost)

    options = []
    for discount_pct in DISCOUNT_OPTIONS:
        discounted_price = base_price * (1 - discount_pct / 100)
        demand_lift_pct = discount_pct * ELASTICITY_FACTOR
        projected_units = baseline_weekly_units * (1 + demand_lift_pct / 100)

        projected_revenue = projected_units * discounted_price
        projected_profit = projected_units * (discounted_price - cost)
        margin_pct = ((discounted_price - cost) / discounted_price * 100) if discounted_price else 0

        revenue_change_pct = (
            ((projected_revenue - baseline_revenue) / baseline_revenue * 100) if baseline_revenue else 0
        )
        profit_change_pct = (
            ((projected_profit - baseline_profit) / baseline_profit * 100) if baseline_profit else 0
        )

        options.append({
            "discount_percent": discount_pct,
            "discounted_price": round(discounted_price, 2),
            "projected_weekly_units": round(projected_units, 1),
            "projected_revenue": round(projected_revenue, 2),
            "projected_profit": round(projected_profit, 2),
            "margin_percent": round(margin_pct, 1),
            "expected_demand_increase_percent": round(demand_lift_pct, 1),
            "expected_revenue_change_percent": round(revenue_change_pct, 1),
            "expected_profit_change_percent": round(profit_change_pct, 1),
	    "passes_guardrails": margin_pct >= MIN_MARGIN_PERCENT and discount_pct <= MAX_DISCOUNT_PERCENT,
        })

    passing_options = [o for o in options if o["passes_guardrails"]]
    best_option = max(passing_options, key=lambda o: o["projected_profit"]) if passing_options else None

    return {
        "product_id": product.id,
        "product_name": product.name,
        "current_price": base_price,
        "current_cost": cost,
        "baseline_weekly_units": round(baseline_weekly_units, 1),
        "baseline_weekly_revenue": round(baseline_revenue, 2),
        "baseline_weekly_profit": round(baseline_profit, 2),
        "options": options,
        "recommended_discount_percent": best_option["discount_percent"] if best_option else None,
    }