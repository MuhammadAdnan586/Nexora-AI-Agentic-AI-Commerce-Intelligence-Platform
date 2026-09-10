from langchain_core.tools import tool
from app.core.database import SessionLocal
from app.models.product import Product
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem


def build_shopping_tools(user_id: int):
    """Build cart/order tools bound to a specific logged-in customer."""

    @tool
    def search_products(query: str) -> str:
        """Search for products by name or keyword, including any active discount/promotion on them. Use this to find products the customer might want."""
        db = SessionLocal()
        try:
            from app.models.promotion import Promotion, PromotionStatus

            products = db.query(Product).filter(
                Product.name.ilike(f"%{query}%"), Product.is_active == True
            ).limit(5).all()
            if not products:
                products = db.query(Product).filter(Product.is_active == True).limit(5).all()
            if not products:
                return "No products found in the store right now."

            lines = []
            for p in products:
                promo = db.query(Promotion).filter(
                    Promotion.product_id == p.id, Promotion.status == PromotionStatus.approved
                ).first()
                line = f"- {p.name} (id: {p.id}): ${p.price:.2f} — {p.description or 'no description'}"
                if promo:
                    line += f" [ACTIVE PROMOTION: {promo.discount_percent}% off!]"
                lines.append(line)
            return "\n".join(lines)
        finally:
            db.close()

    @tool
    def add_to_cart(product_id: int, quantity: int = 1) -> str:
        """Add a product to the customer's cart by product ID and quantity."""
        if quantity < 1 or quantity > 20:
            return "Quantity must be between 1 and 20 per item. Please confirm a valid quantity."

        db = SessionLocal()
        try:
            product = db.query(Product).filter(Product.id == product_id, Product.is_active == True).first()
            if not product:
                return "That product is not available."

            cart = db.query(Cart).filter(Cart.user_id == user_id).first()
            if not cart:
                cart = Cart(user_id=user_id)
                db.add(cart)
                db.commit()
                db.refresh(cart)

            existing = db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.product_id == product_id).first()
            if existing:
                existing.quantity += quantity
            else:
                db.add(CartItem(cart_id=cart.id, product_id=product_id, quantity=quantity))
            db.commit()
            return f"Added {quantity}x {product.name} (${product.price:.2f} each) to the cart."
        finally:
            db.close()

    @tool
    def view_cart() -> str:
        """View the customer's current cart contents and total."""
        db = SessionLocal()
        try:
            cart = db.query(Cart).filter(Cart.user_id == user_id).first()
            if not cart or not cart.items:
                return "The cart is currently empty."
            lines = []
            total = 0.0
            for item in cart.items:
                product = db.query(Product).filter(Product.id == item.product_id).first()
                if product:
                    subtotal = product.price * item.quantity
                    total += subtotal
                    lines.append(f"{item.quantity}x {product.name} — ${subtotal:.2f}")
            lines.append(f"Total: ${total:.2f}")
            return "\n".join(lines)
        finally:
            db.close()

    @tool
    def place_order(shipping_address: str) -> str:
        """Place the order using everything currently in the cart, shipping to the given address. Only call this after the customer has confirmed their cart and provided a shipping address."""
        if not shipping_address or len(shipping_address.strip()) < 5:
            return "I need a valid shipping address (at least a few words) before placing the order. Could you provide one?"

        db = SessionLocal()
        try:
            cart = db.query(Cart).filter(Cart.user_id == user_id).first()
            if not cart or not cart.items:
                return "The cart is empty, nothing to order."

            total_amount = 0.0
            items_data = []
            for item in cart.items:
                product = db.query(Product).filter(Product.id == item.product_id).first()
                if not product or not product.is_active:
                    continue
                subtotal = product.price * item.quantity
                total_amount += subtotal
                items_data.append((product.id, item.quantity, product.price))

            order = Order(
                user_id=user_id,
                total_amount=round(total_amount, 2),
                shipping_address=shipping_address,
            )
            db.add(order)
            db.commit()
            db.refresh(order)

            for product_id, qty, price in items_data:
                db.add(OrderItem(order_id=order.id, product_id=product_id, quantity=qty, unit_price=price))

            for item in cart.items:
                db.delete(item)

            db.commit()
            return f"Order placed! Order number {order.id}, total ${order.total_amount:.2f}, shipping to {shipping_address}."
        finally:
            db.close()

    return [search_products, add_to_cart, view_cart, place_order]