from sqlalchemy.orm import Session
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.warehouse import Warehouse


def compute_routing_plan(db: Session, order_id: int) -> dict:
    """
    Analyze an order's items against warehouse stock and propose the best
    fulfillment strategy: direct (one warehouse), split (multiple warehouses),
    or flag items that are out of stock everywhere.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {"error": "Order not found"}

    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    warehouses = db.query(Warehouse).all()

    # Build stock map: {warehouse_id: {product_id: quantity}}
    stock_map = {}
    for wh in warehouses:
        records = db.query(Inventory).filter(Inventory.warehouse_id == wh.id).all()
        stock_map[wh.id] = {r.product_id: r.quantity for r in records}

    # Determine which warehouses can supply which items
    item_availability = []
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        options = []
        for wh in warehouses:
            available = stock_map.get(wh.id, {}).get(item.product_id, 0)
            if available >= item.quantity:
                options.append({"warehouse_id": wh.id, "warehouse_name": wh.name, "city": wh.city, "available": available})
        item_availability.append({
            "order_item_id": item.id,
            "product_id": item.product_id,
            "product_name": product.name if product else "Unknown",
            "quantity": item.quantity,
            "fulfillable_by": options,
        })

    out_of_stock_items = [i for i in item_availability if not i["fulfillable_by"]]
    fulfillable_items = [i for i in item_availability if i["fulfillable_by"]]

    # --- Condition 1: Check if a single warehouse can fulfill ALL fulfillable items ---
    single_warehouse_id = None
    if fulfillable_items:
        common_warehouses = set(o["warehouse_id"] for o in fulfillable_items[0]["fulfillable_by"])
        for item in fulfillable_items[1:]:
            common_warehouses &= set(o["warehouse_id"] for o in item["fulfillable_by"])

        if common_warehouses:
            # Prefer the warehouse whose city matches the order's shipping address (distance proxy)
            preferred = None
            if order.shipping_address:
                for wh_id in common_warehouses:
                    wh = db.query(Warehouse).filter(Warehouse.id == wh_id).first()
                    if wh and wh.city and wh.city.lower() in order.shipping_address.lower():
                        preferred = wh_id
                        break
            single_warehouse_id = preferred or next(iter(common_warehouses))

    if single_warehouse_id and not out_of_stock_items:
        warehouse = db.query(Warehouse).filter(Warehouse.id == single_warehouse_id).first()
        return {
            "strategy": "direct",
            "reasoning": f"All items can be fulfilled from a single warehouse: {warehouse.name}.",
            "assignments": [{
                "warehouse_id": warehouse.id,
                "warehouse_name": warehouse.name,
                "city": warehouse.city,
                "items": [{"order_item_id": i["order_item_id"], "product_name": i["product_name"], "quantity": i["quantity"]} for i in fulfillable_items],
            }],
            "out_of_stock_items": [],
        }

    # --- Condition 2/3: Split across multiple warehouses (greedy: pick warehouse with most matches first) ---
    assignments = {}
    remaining = list(fulfillable_items)

    while remaining:
        # Count how many remaining items each warehouse could fulfill
        warehouse_scores = {}
        for item in remaining:
            for opt in item["fulfillable_by"]:
                warehouse_scores[opt["warehouse_id"]] = warehouse_scores.get(opt["warehouse_id"], 0) + 1

        if not warehouse_scores:
            break

        best_warehouse_id = max(warehouse_scores, key=warehouse_scores.get)
        matched = [i for i in remaining if best_warehouse_id in [o["warehouse_id"] for o in i["fulfillable_by"]]]

        warehouse = db.query(Warehouse).filter(Warehouse.id == best_warehouse_id).first()
        assignments[best_warehouse_id] = {
            "warehouse_id": best_warehouse_id,
            "warehouse_name": warehouse.name,
            "city": warehouse.city,
            "items": [{"order_item_id": i["order_item_id"], "product_name": i["product_name"], "quantity": i["quantity"]} for i in matched],
        }
        remaining = [i for i in remaining if i not in matched]

    strategy = "split" if len(assignments) > 1 else "direct"
    reasoning = (
        f"Items require {len(assignments)} warehouse(s) to fulfill. "
        f"{'A consolidation hub step is recommended before final shipment.' if strategy == 'split' else ''}"
    )

    return {
        "strategy": strategy,
        "reasoning": reasoning,
        "assignments": list(assignments.values()),
        "out_of_stock_items": [
            {"order_item_id": i["order_item_id"], "product_name": i["product_name"], "quantity": i["quantity"]}
            for i in out_of_stock_items
        ],
    }