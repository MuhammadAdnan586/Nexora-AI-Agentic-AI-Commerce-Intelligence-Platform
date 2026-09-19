import re
from langchain_core.tools import tool
from app.core.database import SessionLocal
from app.models.product import Product
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem


def _normalize(text: str) -> str:
    """Lowercase and strip everything except letters/digits, so 'Smart Watch' and 'smartwatch' match."""
    return re.sub(r"[^a-z0-9]", "", (text or "").lower())


def build_shopping_tools(user_id: int, found_products: list | None = None):
    """Build cart/order tools bound to a specific logged-in customer.

    `found_products` is an optional mutable list that search-style tools
    will append matched product IDs to, so the API layer can return
    structured product data alongside the natural-language reply.
    """
    if found_products is None:
        found_products = []

    @tool
    def search_products(query: str) -> str:
        """Search for products by name, category, or keyword, including any active discount/promotion on them. Use this whenever the customer names or describes a specific product."""
        db = SessionLocal()
        try:
            from app.models.promotion import Promotion, PromotionStatus

            query_norm = _normalize(query)
            query_words = [w for w in re.split(r"\s+", query.lower().strip()) if len(w) >= 3]

            all_products = db.query(Product).filter(Product.is_active == True).all()

            def matches(p: Product) -> bool:
                name_norm = _normalize(p.name)
                desc_norm = _normalize(p.description)
                if query_norm and (query_norm in name_norm or query_norm in desc_norm):
                    return True
                name_lower = p.name.lower()
                desc_lower = (p.description or "").lower()
                return any(w in name_lower or w in desc_lower for w in query_words)

            matched = [p for p in all_products if matches(p)][:5]

            if not matched:
                return (
                    f"No products matching '{query}' were found in the catalog. "
                    "Politely tell the customer this and ask if they'd like to see something else, "
                    "without listing unrelated products."
                )

            lines = []
            for p in matched:
                promo = db.query(Promotion).filter(
                    Promotion.product_id == p.id, Promotion.status == PromotionStatus.approved
                ).first()
                line = f"- {p.name} (id: {p.id}): ${p.price:.2f} - {p.description or 'no description'}"
                if promo:
                    line += f" [ACTIVE PROMOTION: {promo.discount_percent}% off!]"
                lines.append(line)
                found_products.append(p.id)
            return "\n".join(lines)
        finally:
            db.close()

    @tool
    def get_discounted_products() -> str:
        """List products that currently have an active discount or promotion. Use this whenever the customer asks about deals, discounts, sales, or offers."""
        db = SessionLocal()
        try:
            from app.models.promotion import Promotion, PromotionStatus

            promos = db.query(Promotion).filter(Promotion.status == PromotionStatus.approved).limit(10).all()
            if not promos:
                return "There are no active discounts right now."

            lines = []
            for promo in promos:
                p = db.query(Product).filter(Product.id == promo.product_id, Product.is_active == True).first()
                if not p:
                    continue
                lines.append(f"- {p.name} (id: {p.id}): ${p.price:.2f} - {promo.discount_percent}% off!")
                found_products.append(p.id)

            return "\n".join(lines) if lines else "There are no active discounts right now."
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
            found_products.append(product_id)
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
                    lines.append(f"{item.quantity}x {product.name} - ${subtotal:.2f}")
                    found_products.append(product.id)
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

    return [search_products, get_discounted_products, add_to_cart, view_cart, place_order]