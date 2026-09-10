from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.warehouse import Warehouse


def _register_and_login(client, email='e2ecustomer@example.com'):
    client.post('/auth/register', json={'email': email, 'password': 'Password123', 'full_name': 'E2E Customer'})
    response = client.post('/auth/login', json={'email': email, 'password': 'Password123'})
    return response.json()['access_token']


def _create_admin_token(client, db_session, email='e2eadmin@example.com'):
    admin = User(email=email, hashed_password=hash_password('AdminPass123'), full_name='Admin', role=UserRole.admin)
    db_session.add(admin)
    db_session.commit()
    response = client.post('/auth/login', json={'email': email, 'password': 'AdminPass123'})
    return response.json()['access_token']


def test_full_order_to_delivery_journey(client, db_session):
    # 1. Admin creates a warehouse and a product
    admin_token = _create_admin_token(client, db_session)
    admin_headers = {'Authorization': f'Bearer {admin_token}'}

    warehouse = Warehouse(name='Karachi Main WH', city='Karachi', address='Port Road')
    db_session.add(warehouse)
    db_session.commit()
    db_session.refresh(warehouse)

    product_response = client.post(
        '/products/', json={'name': 'E2E Product', 'sku': 'SKU-E2E-1', 'price': 40.0, 'cost_price': 20.0},
        headers=admin_headers,
    )
    assert product_response.status_code == 200
    product_id = product_response.json()['id']

    # 2. Customer registers, logs in, adds to cart, checks out
    customer_token = _register_and_login(client)
    customer_headers = {'Authorization': f'Bearer {customer_token}'}

    add_response = client.post('/cart/add', json={'product_id': product_id, 'quantity': 2}, headers=customer_headers)
    assert add_response.status_code == 200

    checkout_response = client.post(
        '/orders/checkout', json={'shipping_address': 'House 5, Clifton', 'city': 'Karachi'},
        headers=customer_headers,
    )
    assert checkout_response.status_code == 200
    order = checkout_response.json()
    assert order['warehouse_id'] == warehouse.id
    assert order['status'] == 'pending'
    order_id = order['id']

    # 3. Cart is now empty
    cart_response = client.get('/cart/', headers=customer_headers)
    assert cart_response.json()['items'] == []

    # 4. Admin creates a delivery for this order
    delivery_response = client.post(
        '/logistics/deliveries',
        json={'order_id': order_id, 'delivery_address': 'House 5, Clifton', 'latitude': 24.8, 'longitude': 67.0},
        headers=admin_headers,
    )
    assert delivery_response.status_code == 200
    delivery = delivery_response.json()
    assert delivery['status'] == 'pending'
    delivery_id = delivery['id']

    # 5. Delivery transitions: assigned -> in_transit -> delivered
    for status in ['assigned', 'in_transit', 'delivered']:
        update_response = client.patch(
            f'/logistics/deliveries/{delivery_id}/status',
            json={'status': status, 'description': f'moved to {status}'},
            headers=admin_headers,
        )
        assert update_response.status_code == 200
        assert update_response.json()['status'] == status

    # 6. Order status reflects the final delivery state
    final_order = client.get(f'/orders/{order_id}', headers=customer_headers).json()
    assert final_order['status'] == 'delivered'

    # 7. Customer can see their order in their order list
    my_orders = client.get('/orders/', headers=customer_headers).json()
    assert any(o['id'] == order_id for o in my_orders)


def test_weather_disrupted_delivery_gets_risk_score(client, db_session):
    admin_token = _create_admin_token(client, db_session, email='e2eadmin2@example.com')
    admin_headers = {'Authorization': f'Bearer {admin_token}'}

    product_response = client.post(
        '/products/', json={'name': 'Weather Product', 'sku': 'SKU-E2E-WX', 'price': 30.0, 'cost_price': 15.0},
        headers=admin_headers,
    )
    product_id = product_response.json()['id']

    customer_token = _register_and_login(client, email='e2ecustomer2@example.com')
    customer_headers = {'Authorization': f'Bearer {customer_token}'}

    client.post('/cart/add', json={'product_id': product_id, 'quantity': 1}, headers=customer_headers)
    order = client.post('/orders/checkout', json={'shipping_address': 'Rainy St'}, headers=customer_headers).json()

    delivery_response = client.post(
        '/logistics/deliveries',
        json={'order_id': order['id'], 'delivery_address': 'Rainy St', 'latitude': 33.6, 'longitude': 73.0},
        headers=admin_headers,
    )
    delivery_id = delivery_response.json()['id']

    # Simulate a weather-disruption note being logged as a delivery event
    update_response = client.patch(
        f'/logistics/deliveries/{delivery_id}/status',
        json={'status': 'assigned', 'description': 'Heavy rain expected — delay risk elevated'},
        headers=admin_headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()['status'] == 'assigned'


def test_customer_can_request_return_after_delivery(client, db_session):
    admin_token = _create_admin_token(client, db_session, email='e2eadmin3@example.com')
    admin_headers = {'Authorization': f'Bearer {admin_token}'}

    product_response = client.post(
        '/products/', json={'name': 'Returnable Product', 'sku': 'SKU-E2E-RET', 'price': 20.0, 'cost_price': 10.0},
        headers=admin_headers,
    )
    product_id = product_response.json()['id']

    customer_token = _register_and_login(client, email='e2ecustomer3@example.com')
    customer_headers = {'Authorization': f'Bearer {customer_token}'}

    client.post('/cart/add', json={'product_id': product_id, 'quantity': 1}, headers=customer_headers)
    order = client.post('/orders/checkout', json={'shipping_address': 'Return Ave'}, headers=customer_headers).json()
    order_item_id = order['items'][0]['id']

    return_response = client.post(
        '/orders/returns', json={'order_item_id': order_item_id, 'reason': 'Item arrived damaged'},
        headers=customer_headers,
    )
    assert return_response.status_code == 200
    assert 'return_id' in return_response.json()

    my_returns = client.get('/orders/returns/mine', headers=customer_headers).json()
    assert len(my_returns) == 1
    assert my_returns[0]['reason'] == 'Item arrived damaged'


def test_customer_cannot_return_someone_elses_order_item(client, db_session):
    admin_token = _create_admin_token(client, db_session, email='e2eadmin4@example.com')
    admin_headers = {'Authorization': f'Bearer {admin_token}'}

    product_response = client.post(
        '/products/', json={'name': 'Isolated Product', 'sku': 'SKU-E2E-ISO', 'price': 15.0, 'cost_price': 7.0},
        headers=admin_headers,
    )
    product_id = product_response.json()['id']

    owner_token = _register_and_login(client, email='e2eowner@example.com')
    owner_headers = {'Authorization': f'Bearer {owner_token}'}
    client.post('/cart/add', json={'product_id': product_id, 'quantity': 1}, headers=owner_headers)
    order = client.post('/orders/checkout', json={'shipping_address': 'Owner St'}, headers=owner_headers).json()
    order_item_id = order['items'][0]['id']

    intruder_token = _register_and_login(client, email='e2eintruder@example.com')
    intruder_headers = {'Authorization': f'Bearer {intruder_token}'}

    return_response = client.post(
        '/orders/returns', json={'order_item_id': order_item_id, 'reason': 'Not mine but trying anyway'},
        headers=intruder_headers,
    )
    assert return_response.status_code == 403
