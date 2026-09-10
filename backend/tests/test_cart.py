from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.product import Product


def _create_user_and_token(client, db_session, email="customer@example.com"):
    user = User(email=email, hashed_password=hash_password("Password123"), full_name="Test", role=UserRole.customer)
    db_session.add(user)
    db_session.commit()
    response = client.post("/auth/login", json={"email": email, "password": "Password123"})
    return response.json()["access_token"]


def _create_product(db_session, sku="SKU-CART-1", price=10.0, is_active=True):
    product = Product(name="Cart Product", sku=sku, price=price, is_active=is_active)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def test_view_empty_cart_creates_cart(client, db_session):
    token = _create_user_and_token(client, db_session)
    response = client.get("/cart/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["items"] == []


def test_add_to_cart_succeeds(client, db_session):
    token = _create_user_and_token(client, db_session)
    product = _create_product(db_session)

    response = client.post(
        "/cart/add", json={"product_id": product.id, "quantity": 2},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["quantity"] == 2


def test_add_same_product_twice_increments_quantity(client, db_session):
    token = _create_user_and_token(client, db_session)
    product = _create_product(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/cart/add", json={"product_id": product.id, "quantity": 1}, headers=headers)
    response = client.post("/cart/add", json={"product_id": product.id, "quantity": 3}, headers=headers)

    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["quantity"] == 4


def test_add_inactive_product_fails(client, db_session):
    token = _create_user_and_token(client, db_session)
    product = _create_product(db_session, sku="SKU-INACTIVE", is_active=False)

    response = client.post(
        "/cart/add", json={"product_id": product.id, "quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


def test_add_nonexistent_product_fails(client, db_session):
    token = _create_user_and_token(client, db_session)
    response = client.post(
        "/cart/add", json={"product_id": 999999, "quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


def test_remove_from_cart_succeeds(client, db_session):
    token = _create_user_and_token(client, db_session)
    product = _create_product(db_session)
    headers = {"Authorization": f"Bearer {token}"}
    client.post("/cart/add", json={"product_id": product.id, "quantity": 1}, headers=headers)

    response = client.delete(f"/cart/remove/{product.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["items"] == []


def test_remove_item_not_in_cart_fails(client, db_session):
    token = _create_user_and_token(client, db_session)
    product = _create_product(db_session)

    response = client.delete(f"/cart/remove/{product.id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 404


def test_cart_without_token_blocked(client):
    response = client.get("/cart/")
    assert response.status_code == 401


def test_carts_are_isolated_per_user(client, db_session):
    token_a = _create_user_and_token(client, db_session, email="usera@example.com")
    token_b = _create_user_and_token(client, db_session, email="userb@example.com")
    product = _create_product(db_session)

    client.post("/cart/add", json={"product_id": product.id, "quantity": 5}, headers={"Authorization": f"Bearer {token_a}"})

    response_b = client.get("/cart/", headers={"Authorization": f"Bearer {token_b}"})
    assert response_b.json()["items"] == []
