import random
from datetime import datetime, timedelta
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.core.security import hash_password
from app.models.warehouse import Warehouse
db = SessionLocal()

# --- Ensure a demo customer exists ---
demo_customer = db.query(User).filter(User.email == "demo.customer@example.com").first()
if not demo_customer:
    demo_customer = User(
        email="demo.customer@example.com",
        hashed_password=hash_password("demo1234"),
        full_name="Demo Customer",
        role=UserRole.customer,
    )
    db.add(demo_customer)
    db.commit()
    db.refresh(demo_customer)

# --- Use ALL currently active products (including any newly added ones) ---
products = db.query(Product).filter(Product.is_active == True).all()
warehouses = db.query(Warehouse).all()
if not products:
    print("No active products found. Add some products first.")
    db.close()
    exit()

print(f"Generating 90 days of synthetic sales data for {len(products)} products...")

today = datetime.utcnow()
order_count = 0

for day_offset in range(90, 0, -1):
    order_date = today - timedelta(days=day_offset)
    is_weekend = order_date.weekday() >= 5
    daily_orders = random.randint(3, 8) if is_weekend else random.randint(1, 5)

    for _ in range(daily_orders):
        chosen_products = random.sample(products, k=min(random.randint(1, 2), len(products)))
        total_amount = 0.0
        order_items_data = []

        for product in chosen_products:
            qty = random.randint(1, 3)
            subtotal = product.price * qty
            total_amount += subtotal
            order_items_data.append((product.id, qty, product.price))

        order = Order(
            user_id=demo_customer.id,
            status=OrderStatus.delivered,
            total_amount=round(total_amount, 2),
            shipping_address="Demo Address, Islamabad",
            warehouse_id=random.choice(warehouses).id if warehouses else None,
            created_at=order_date,
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        for product_id, qty, price in order_items_data:
            item = OrderItem(order_id=order.id, product_id=product_id, quantity=qty, unit_price=price)
            db.add(item)

        db.commit()
        order_count += 1

print(f"Done! Generated {order_count} synthetic orders across 90 days for all products.")
db.close()