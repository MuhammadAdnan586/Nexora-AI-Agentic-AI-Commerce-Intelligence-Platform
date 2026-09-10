from app.weather.service import get_current_weather, get_business_impact, weather_code_to_condition
from app.agents.scoring import compute_opportunity_scores
from langchain_core.tools import tool
from app.core.database import SessionLocal
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.ml.pricing import simulate_promotion, MIN_MARGIN_PERCENT, MAX_DISCOUNT_PERCENT
from app.ml.risk_scoring import compute_order_risk

# ---------- Inventory tools ----------

@tool
def check_product_price(product_name: str) -> str:
    """Look up the price of a product by its name (partial match allowed)."""
    db = SessionLocal()
    try:
        product = db.query(Product).filter(
            Product.name.ilike(f"%{product_name}%"), Product.is_active == True
        ).first()
        if not product:
            return f"No active product found matching '{product_name}'."
        return f"{product.name} (SKU: {product.sku}) costs ${product.price:.2f}."
    finally:
        db.close()


@tool
def check_inventory_level(product_name: str) -> str:
    """Check how many units of a product are in stock across warehouses."""
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.name.ilike(f"%{product_name}%")).first()
        if not product:
            return f"No product found matching '{product_name}'."
        records = db.query(Inventory).filter(Inventory.product_id == product.id).all()
        if not records:
            return f"No inventory records found for {product.name}."
        total = sum(r.quantity for r in records)
        return f"{product.name} has {total} units in stock across {len(records)} warehouse(s)."
    finally:
        db.close()


@tool
def list_low_stock_products() -> str:
    """List products whose inventory is at or below their reorder level."""
    db = SessionLocal()
    try:
        records = db.query(Inventory).filter(Inventory.quantity <= Inventory.reorder_level).all()
        if not records:
            return "No products are currently low on stock."
        lines = []
        for r in records:
            product = db.query(Product).filter(Product.id == r.product_id).first()
            name = product.name if product else "Unknown"
            lines.append(f"- {name}: {r.quantity} units left (reorder level: {r.reorder_level})")
        return "\n".join(lines)
    finally:
        db.close()


@tool
def list_active_products() -> str:
    """List all currently active products with their prices."""
    db = SessionLocal()
    try:
        products = db.query(Product).filter(Product.is_active == True).limit(20).all()
        if not products:
            return "No active products found."
        return "\n".join(f"- {p.name}: ${p.price:.2f}" for p in products)
    finally:
        db.close()


inventory_tools = [check_product_price, check_inventory_level, list_low_stock_products, list_active_products]


# ---------- Order tools ----------

@tool
def get_order_status(order_id: int) -> str:
    """Get the status and details of a specific order by its ID."""
    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return f"No order found with ID {order_id}."
        items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        item_lines = []
        for it in items:
            product = db.query(Product).filter(Product.id == it.product_id).first()
            name = product.name if product else "Unknown"
            item_lines.append(f"{it.quantity}x {name}")
        return (
            f"Order #{order.id} is currently '{order.status.value}'. "
            f"Total: ${order.total_amount:.2f}. Items: {', '.join(item_lines)}."
        )
    finally:
        db.close()


@tool
def list_recent_orders(limit: int = 5) -> str:
    """List the most recent orders across the platform, with their status and total."""
    db = SessionLocal()
    try:
        orders = db.query(Order).order_by(Order.created_at.desc()).limit(limit).all()
        if not orders:
            return "No orders found."
        lines = [f"- Order #{o.id}: {o.status.value}, ${o.total_amount:.2f}" for o in orders]
        return "\n".join(lines)
    finally:
        db.close()


order_tools = [get_order_status, list_recent_orders]


# ---------- Customer service tools ----------

@tool
def get_return_policy() -> str:
    """Return the store's return and refund policy."""
    return (
        "Items can be returned within 14 days of delivery if unused and in original packaging. "
        "Refunds are processed within 5-7 business days after the returned item is received."
    )


@tool
def get_shipping_info() -> str:
    """Return general shipping information."""
    return (
        "Standard shipping takes 3-5 business days. Orders are shipped from the nearest "
        "available warehouse based on stock levels."
    )


customer_service_tools = [get_return_policy, get_shipping_info]


# All tools combined (used by supervisor for routing awareness)
all_tools = inventory_tools + order_tools + customer_service_tools

# ---------- Product Intelligence tools ----------

@tool
def get_product_opportunities() -> str:
    """Get a ranked list of products by business opportunity score, combining sales, margin, inventory health, and returns."""
    db = SessionLocal()
    try:
        results = compute_opportunity_scores(db)
        if not results:
            return "No active products to analyze."
        lines = []
        for r in results[:10]:
            lines.append(
                f"- {r['name']}: score {r['opportunity_score']}/100 — {r['recommendation']} "
                f"(units sold: {r['units_sold']}, margin: {r['margin_percent']}%, stock: {r['stock']})"
            )
        return "\n".join(lines)
    finally:
        db.close()


intelligence_tools = [get_product_opportunities]
# ---------- Weather tools ----------

@tool
def get_weather_and_business_impact() -> str:
    """Get real current weather conditions and their business impact on product demand and delivery risk."""
    weather = get_current_weather()
    condition = weather_code_to_condition(weather["weather_code"]) if weather["weather_code"] is not None else "Unknown"
    impact = get_business_impact(weather)

    lines = [f"Current weather: {condition}, {weather['temperature_c']}°C."]
    for signal in impact:
        lines.append(f"- {signal['signal']}: {signal['impact']} Delivery risk: {signal['delivery_risk']}")
    return "\n".join(lines)


weather_tools = [get_weather_and_business_impact]
# ---------- Pricing tools ----------

@tool
def get_pricing_recommendation(product_name: str) -> str:
    """Get a pricing/promotion recommendation for a product, including projected profit for different discount levels. Does not apply any changes automatically — a human must approve discounts via the admin panel."""
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.name.ilike(f"%{product_name}%")).first()
        if not product:
            return f"No product found matching '{product_name}'."

        result = simulate_promotion(db, product.id)
        if "error" in result:
            return result["error"]

        lines = [f"Pricing analysis for {result['product_name']} (current price ${result['current_price']:.2f}):"]
        for opt in result["options"]:
            status = "PASSES guardrails" if opt["passes_guardrails"] else "BLOCKED by guardrails"
            lines.append(
                f"- {opt['discount_percent']}% off: projected profit ${opt['projected_profit']:.2f} "
                f"({opt['expected_profit_change_percent']:+.1f}%), margin {opt['margin_percent']}% — {status}"
            )
        if result.get("recommended_discount_percent"):
            lines.append(f"Recommended: {result['recommended_discount_percent']}% off (best projected profit within guardrails).")
        lines.append("Note: This is a recommendation only. Discounts require admin approval before going live.")
        return "\n".join(lines)
    finally:
        db.close()


pricing_tools = [get_pricing_recommendation]


# ---------- Risk tools ----------

@tool
def check_order_risk(order_id: int) -> str:
    """Check the fraud/risk score for a specific order and see what risk signals were detected."""
    db = SessionLocal()
    try:
        result = compute_order_risk(db, order_id)
        if "error" in result:
            return result["error"]

        lines = [f"Order #{result['order_id']} risk score: {result['risk_score']}/100 ({result['risk_level']} risk)."]
        for signal in result["signals"]:
            lines.append(f"- {signal}")
        if result["risk_level"] == "high":
            lines.append("This order requires human review before shipping. Check the Risk & Fraud admin page.")
        return "\n".join(lines)
    finally:
        db.close()


risk_tools = [check_order_risk]
all_tools = inventory_tools + order_tools + customer_service_tools + intelligence_tools + weather_tools + pricing_tools + risk_tools

import json
from app.models.warehouse import Warehouse
from app.models.notification import WarehouseNotification
from app.ml.fulfillment_routing import compute_routing_plan


# ---------- Action tools (propose only — do not write to DB) ----------

@tool
def propose_assign_warehouse(order_id: int, warehouse_name: str) -> str:
    """Propose assigning an order to a specific warehouse by name. Does not make the change yet — asks the user to confirm first."""
    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return f"No order found with ID {order_id}."
        warehouse = db.query(Warehouse).filter(Warehouse.name.ilike(f"%{warehouse_name}%")).first()
        if not warehouse:
            return f"No warehouse found matching '{warehouse_name}'."

        action = {"type": "assign_warehouse", "order_id": order.id, "warehouse_id": warehouse.id, "warehouse_name": warehouse.name}
        marker = f"__PENDING_ACTION__:{json.dumps(action)}"
        return f"{marker}\nI'm about to assign Order #{order.id} to {warehouse.name}. Should I go ahead? (yes/no)"
    finally:
        db.close()


@tool
def propose_smart_ship(order_id: int) -> str:
    """Automatically find the best warehouse(s) for an order based on current stock levels, and propose shipping it from there. Use this when the user wants the order shipped without specifying a warehouse themselves."""
    db = SessionLocal()
    try:
        plan = compute_routing_plan(db, order_id)
        if "error" in plan:
            return plan["error"]
        if not plan["assignments"]:
            return f"No warehouse currently has enough stock to fulfill Order #{order_id}."

        assignments_summary = []
        for a in plan["assignments"]:
            items_str = ", ".join(f"{it['quantity']}x {it['product_name']}" for it in a["items"])
            assignments_summary.append(f"{a['warehouse_name']} ({a['city']}): {items_str}")

        action = {
            "type": "smart_ship",
            "order_id": order_id,
            "assignments": [
                {
                    "warehouse_id": a["warehouse_id"],
                    "items": [{"order_item_id": it["order_item_id"], "quantity": it["quantity"]} for it in a["items"]],
                }
                for a in plan["assignments"]
            ],
        }
        marker = f"__PENDING_ACTION__:{json.dumps(action)}"

        if len(plan["assignments"]) == 1:
            summary = assignments_summary[0]
        else:
            summary = "; ".join(assignments_summary) + " (this order will be split across multiple warehouses)"

        out_of_stock_note = ""
        if plan.get("out_of_stock_items"):
            missing = ", ".join(f"{it['quantity']}x {it['product_name']}" for it in plan["out_of_stock_items"])
            out_of_stock_note = f" Note: {missing} could not be fulfilled anywhere and will stay unassigned."

        return f"{marker}\nBased on current stock, I recommend shipping Order #{order_id} from: {summary}.{out_of_stock_note} Should I go ahead? (yes/no)"
    finally:
        db.close()
@tool
def propose_bulk_ship_by_date(date_str: str) -> str:
    """Ship all pending/confirmed orders placed on a specific date, automatically assigning the best warehouse for each based on stock. Date format: YYYY-MM-DD."""
    from datetime import datetime, timedelta
    db = SessionLocal()
    try:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return "Please provide the date in YYYY-MM-DD format, e.g. 2026-08-24."

        start = datetime.combine(target_date, datetime.min.time())
        end = start + timedelta(days=1)

        orders = db.query(Order).filter(
            Order.created_at >= start,
            Order.created_at < end,
            Order.status.in_([OrderStatus.pending, OrderStatus.confirmed]),
        ).all()

        if not orders:
            return f"No pending/confirmed orders found for {date_str}."

        order_ids = [o.id for o in orders]
        action = {"type": "bulk_smart_ship", "order_ids": order_ids}
        marker = f"__PENDING_ACTION__:{json.dumps(action)}"
        id_list = ", ".join(f"#{oid}" for oid in order_ids)
        return f"{marker}\nI found {len(order_ids)} order(s) from {date_str}: {id_list}. I'll auto-assign the best warehouse for each based on current stock. Should I go ahead? (yes/no)"
    finally:
        db.close()

@tool
def propose_update_order_status(order_id: int, new_status: str) -> str:
    """Propose changing an order's status (pending, confirmed, shipped, delivered, cancelled). Does not make the change yet — asks the user to confirm first."""
    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return f"No order found with ID {order_id}."
        valid = ["pending", "confirmed", "shipped", "delivered", "cancelled"]
        status_clean = new_status.strip().lower()
        if status_clean not in valid:
            return f"'{new_status}' is not a valid status. Valid options: {', '.join(valid)}."

        action = {"type": "update_order_status", "order_id": order.id, "new_status": status_clean}
        marker = f"__PENDING_ACTION__:{json.dumps(action)}"
        return f"{marker}\nI'm about to mark Order #{order.id} as '{status_clean}'. Should I go ahead? (yes/no)"
    finally:
        db.close()


@tool
def propose_apply_discount(product_name: str, discount_percent: float) -> str:
    """Propose applying a discount to a product's price (e.g. 10 for 10% off). Does not make the change yet — asks the user to confirm first."""
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.name.ilike(f"%{product_name}%"), Product.is_active == True).first()
        if not product:
            return f"No active product found matching '{product_name}'."
        if discount_percent <= 0 or discount_percent >= 100:
            return "Discount percent must be between 1 and 99."
        if discount_percent > MAX_DISCOUNT_PERCENT:
            return (
                f"Sorry, {discount_percent}% exceeds the maximum allowed discount of "
                f"{MAX_DISCOUNT_PERCENT}%. I can't propose this — try a smaller discount."
            )

        new_price = round(product.price * (1 - discount_percent / 100), 2)
        cost = product.cost_price or 0
        margin_percent = ((new_price - cost) / new_price * 100) if new_price else 0
        if margin_percent < MIN_MARGIN_PERCENT:
            return (
                f"Sorry, a {discount_percent}% discount on {product.name} would drop the margin to "
                f"{margin_percent:.1f}%, below the required minimum of {MIN_MARGIN_PERCENT}%. "
                f"I can't propose this — check the Pricing page for guardrail-approved options."
            )

        action = {"type": "apply_discount", "product_id": product.id, "product_name": product.name, "discount_percent": discount_percent, "new_price": new_price}
        marker = f"__PENDING_ACTION__:{json.dumps(action)}"
        return (
            f"{marker}\nI'm about to apply a {discount_percent}% discount to {product.name}, "
            f"changing the price from ${product.price:.2f} to ${new_price:.2f}. Should I go ahead? (yes/no)"
        )
    finally:
        db.close()


@tool
def get_shipping_label_link(order_id: int) -> str:
    """Get the download link for an order's shipping label. This is a read-only action, no confirmation needed."""
    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return f"No order found with ID {order_id}."
        return f"You can download the shipping label for Order #{order.id} from the admin panel's order detail page, or at /labels/order/{order.id}."
    finally:
        db.close()


action_tools = [propose_assign_warehouse, propose_smart_ship, propose_bulk_ship_by_date, propose_update_order_status, propose_apply_discount, get_shipping_label_link]
all_tools = all_tools + action_tools