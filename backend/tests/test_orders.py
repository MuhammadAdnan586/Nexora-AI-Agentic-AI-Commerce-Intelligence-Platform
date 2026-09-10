from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.warehouse import Warehouse


def _create_user_and_token(client, db_session, email="customer@example.com"):
    user = User(email=email, hashed_password=hash_password("Password123"), full_name="Test", role=UserRole.customer)
    db_session.add(user)
    db_session.commit()
    response = client.post("/auth/login", json={"email": email, "password": "Password123"})
    return response.json()["access_token"]


def _create_product(db_session, sku="SKU-ORD-1", price=25.0):
    product = Product(name="Order Product", sku=sku, price=price, is_active=True)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def test_checkout_with_empty_cart_fails(client, db_session):
    token = _create_user_and_token(client, db_session)
    response = client.post(
        "/orders/checkout", json={"shipping_address": "123 Main St"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    assert "cart is empty" in response.json()["detail"].lower()


def test_checkout_creates_order_and_clears_cart(client, db_session):
    token = _create_user_and_token(client, db_session)
    headers = {"Authorization": f"Bearer {token}"}
    product = _create_product(db_session, price=25.0)

    client.post("/cart/add", json={"product_id": product.id, "quantity": 3}, headers=headers)

    checkout_response = client.post(
        "/orders/checkout", json={"shipping_address": "123 Main St"}, headers=headers,
    )
    assert checkout_response.status_code == 200
    order = checkout_response.json()
    assert order["total_amount"] == 75.0
    assert len(order["items"]) == 1
    assert order["items"][0]["quantity"] == 3

    cart_response = client.get("/cart/", headers=headers)
    assert cart_response.json()["items"] == []


def test_checkout_matches_warehouse_by_city(client, db_session):
    token = _create_user_and_token(client, db_session)
    headers = {"Authorization": f"Bearer {token}"}
    product = _create_product(db_session)

    warehouse = Warehouse(name="Lahore WH", city="Lahore", address="Main Blvd")
    db_session.add(warehouse)
    db_session.commit()
    db_session.refresh(warehouse)

    client.post("/cart/add", json={"product_id": product.id, "quantity": 1}, headers=headers)
    response = client.post(
        "/orders/checkout", json={"shipping_address": "Somewhere", "city": "Lahore"}, headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["warehouse_id"] == warehouse.id


def test_list_my_orders_returns_only_own_orders(client, db_session):
    token_a = _create_user_and_token(client, db_session, email="usera@example.com")
    token_b = _create_user_and_token(client, db_session, email="userb@example.com")
    product = _create_product(db_session)

    client.post("/cart/add", json={"product_id": product.id, "quantity": 1}, headers={"Authorization": f"Bearer {token_a}"})
    client.post("/orders/checkout", json={"shipping_address": "A St"}, headers={"Authorization": f"Bearer {token_a}"})

    response_b = client.get("/orders/", headers={"Authorization": f"Bearer {token_b}"})
    assert response_b.json() == []

    response_a = client.get("/orders/", headers={"Authorization": f"Bearer {token_a}"})
    assert len(response_a.json()) == 1


def test_get_order_by_id_belonging_to_other_user_fails(client, db_session):
    token_a = _create_user_and_token(client, db_session, email="usera@example.com")
    token_b = _create_user_and_token(client, db_session, email="userb@example.com")
    product = _create_product(db_session)

    client.post("/cart/add", json={"product_id": product.id, "quantity": 1}, headers={"Authorization": f"Bearer {token_a}"})
    order = client.post("/orders/checkout", json={"shipping_address": "A St"}, headers={"Authorization": f"Bearer {token_a}"}).json()

    response = client.get(f"/orders/{order['id']}", headers={"Authorization": f"Bearer {token_b}"})
    assert response.status_code == 404


def test_checkout_without_token_blocked(client):
    response = client.post("/orders/checkout", json={"shipping_address": "A St"})
    assert response.status_code == 401
