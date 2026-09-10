from app.core.security import hash_password
from app.models.user import User, UserRole


def _register_payload(email="testuser@example.com", password="StrongPass123"):
    return {"email": email, "password": password, "full_name": "Test User"}


def test_register_new_user(client):
    response = client.post("/auth/register", json=_register_payload())
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "testuser@example.com"
    assert data["role"] == "customer"
    assert "hashed_password" not in data


def test_register_duplicate_email_fails(client):
    client.post("/auth/register", json=_register_payload())
    response = client.post("/auth/register", json=_register_payload())
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


def test_login_with_correct_credentials(client):
    client.post("/auth/register", json=_register_payload())
    response = client.post("/auth/login", json={"email": "testuser@example.com", "password": "StrongPass123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_with_wrong_password_fails(client):
    client.post("/auth/register", json=_register_payload())
    response = client.post("/auth/login", json={"email": "testuser@example.com", "password": "WrongPassword"})
    assert response.status_code == 401


def test_login_with_nonexistent_email_fails(client):
    response = client.post("/auth/login", json={"email": "nobody@example.com", "password": "whatever"})
    assert response.status_code == 401


def test_get_me_with_valid_token(client):
    client.post("/auth/register", json=_register_payload())
    login_response = client.post("/auth/login", json={"email": "testuser@example.com", "password": "StrongPass123"})
    token = login_response.json()["access_token"]

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "testuser@example.com"


def test_get_me_without_token_fails(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_get_me_with_invalid_token_fails(client):
    response = client.get("/auth/me", headers={"Authorization": "Bearer garbage.token.value"})
    assert response.status_code == 401


def test_admin_only_route_blocks_customer(client):
    client.post("/auth/register", json=_register_payload())
    login_response = client.post("/auth/login", json={"email": "testuser@example.com", "password": "StrongPass123"})
    token = login_response.json()["access_token"]

    response = client.get("/auth/admin-only", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_admin_only_route_allows_admin(client, db_session):
    admin_user = User(
        email="admin@example.com",
        hashed_password=hash_password("AdminPass123"),
        full_name="Admin User",
        role=UserRole.admin,
    )
    db_session.add(admin_user)
    db_session.commit()

    login_response = client.post("/auth/login", json={"email": "admin@example.com", "password": "AdminPass123"})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    response = client.get("/auth/admin-only", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert "Welcome admin" in response.json()["message"]
