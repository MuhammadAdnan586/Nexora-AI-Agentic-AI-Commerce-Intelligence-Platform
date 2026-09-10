from app.core.security import hash_password
from app.models.user import User, UserRole


def _create_user_and_token(client, db_session, role=UserRole.customer, email=None):
    email = email or f"{role.value}@example.com"
    user = User(email=email, hashed_password=hash_password("Password123"), full_name="Test", role=role)
    db_session.add(user)
    db_session.commit()

    response = client.post("/auth/login", json={"email": email, "password": "Password123"})
    return response.json()["access_token"]


def _product_payload(sku="SKU-001", name="Test Product", price=19.99):
    return {"name": name, "sku": sku, "description": "A test product", "price": price, "cost_price": 10.0}


def test_list_products_empty(client):
    response = client.get("/products/")
    assert response.status_code == 200
    assert response.json() == []


def test_create_product_as_admin_succeeds(client, db_session):
    token = _create_user_and_token(client, db_session, role=UserRole.admin)
    response = client.post("/products/", json=_product_payload(), headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["sku"] == "SKU-001"
    assert data["price"] == 19.99
    assert data["is_active"] is True


def test_create_product_as_operations_succeeds(client, db_session):
    token = _create_user_and_token(client, db_session, role=UserRole.operations)
    response = client.post("/products/", json=_product_payload(sku="SKU-002"), headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


def test_create_product_as_customer_blocked(client, db_session):
    token = _create_user_and_token(client, db_session, role=UserRole.customer)
    response = client.post("/products/", json=_product_payload(), headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_create_product_without_token_blocked(client):
    response = client.post("/products/", json=_product_payload())
    assert response.status_code == 401


def test_create_product_duplicate_sku_fails(client, db_session):
    token = _create_user_and_token(client, db_session, role=UserRole.admin)
    headers = {"Authorization": f"Bearer {token}"}
    client.post("/products/", json=_product_payload(sku="DUPLICATE-SKU"), headers=headers)
    response = client.post("/products/", json=_product_payload(sku="DUPLICATE-SKU", name="Another"), headers=headers)
    assert response.status_code == 400
    assert "sku already exists" in response.json()["detail"].lower()


def test_get_product_by_id(client, db_session):
    token = _create_user_and_token(client, db_session, role=UserRole.admin)
    created = client.post("/products/", json=_product_payload(), headers={"Authorization": f"Bearer {token}"}).json()

    response = client.get(f"/products/{created['id']}")
    assert response.status_code == 200
    assert response.json()["name"] == "Test Product"


def test_get_nonexistent_product_returns_404(client):
    response = client.get("/products/999999")
    assert response.status_code == 404


def test_list_products_shows_created_product(client, db_session):
    token = _create_user_and_token(client, db_session, role=UserRole.admin)
    client.post("/products/", json=_product_payload(), headers={"Authorization": f"Bearer {token}"})

    response = client.get("/products/")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_update_product_as_admin_succeeds(client, db_session):
    token = _create_user_and_token(client, db_session, role=UserRole.admin)
    headers = {"Authorization": f"Bearer {token}"}
    created = client.post("/products/", json=_product_payload(), headers=headers).json()

    response = client.put(f"/products/{created['id']}", json={"price": 29.99}, headers=headers)
    assert response.status_code == 200
    assert response.json()["price"] == 29.99


def test_update_product_as_customer_blocked(client, db_session):
    admin_token = _create_user_and_token(client, db_session, role=UserRole.admin)
    created = client.post("/products/", json=_product_payload(), headers={"Authorization": f"Bearer {admin_token}"}).json()

    customer_token = _create_user_and_token(client, db_session, role=UserRole.customer, email="cust2@example.com")
    response = client.put(f"/products/{created['id']}", json={"price": 5.0}, headers={"Authorization": f"Bearer {customer_token}"})
    assert response.status_code == 403


def test_delete_product_as_admin_soft_deletes(client, db_session):
    token = _create_user_and_token(client, db_session, role=UserRole.admin)
    headers = {"Authorization": f"Bearer {token}"}
    created = client.post("/products/", json=_product_payload(), headers=headers).json()

    response = client.delete(f"/products/{created['id']}", headers=headers)
    assert response.status_code == 200

    list_response = client.get("/products/")
    assert len(list_response.json()) == 0


def test_delete_product_as_operations_blocked(client, db_session):
    admin_token = _create_user_and_token(client, db_session, role=UserRole.admin)
    created = client.post("/products/", json=_product_payload(), headers={"Authorization": f"Bearer {admin_token}"}).json()

    ops_token = _create_user_and_token(client, db_session, role=UserRole.operations, email="ops2@example.com")
    response = client.delete(f"/products/{created['id']}", headers={"Authorization": f"Bearer {ops_token}"})
    assert response.status_code == 403
