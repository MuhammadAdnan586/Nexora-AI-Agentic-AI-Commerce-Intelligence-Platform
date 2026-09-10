import pytest
from app.schemas.agent_actions import validate_action, InvalidActionError
from app.ml.pricing import simulate_promotion, MAX_DISCOUNT_PERCENT, MIN_MARGIN_PERCENT
from app.models.product import Product


def test_validate_apply_discount_action_succeeds():
    action = validate_action({
        'type': 'apply_discount', 'product_id': 1, 'product_name': 'Widget',
        'discount_percent': 15.0, 'new_price': 85.0,
    })
    assert action.discount_percent == 15.0
    assert action.new_price == 85.0


def test_validate_assign_warehouse_action_succeeds():
    action = validate_action({
        'type': 'assign_warehouse', 'order_id': 5, 'warehouse_id': 2, 'warehouse_name': 'Lahore WH',
    })
    assert action.order_id == 5


def test_validate_unknown_action_type_rejected():
    with pytest.raises(InvalidActionError, match='Unknown or unsupported'):
        validate_action({'type': 'delete_entire_database', 'order_id': 1})


def test_validate_missing_required_field_rejected():
    with pytest.raises(InvalidActionError):
        validate_action({'type': 'apply_discount', 'product_id': 1})


def test_validate_wrong_type_field_rejected():
    with pytest.raises(InvalidActionError):
        validate_action({
            'type': 'apply_discount', 'product_id': 'not-a-number', 'product_name': 'Widget',
            'discount_percent': 15.0, 'new_price': 85.0,
        })


def test_validate_missing_type_field_rejected():
    with pytest.raises(InvalidActionError):
        validate_action({'order_id': 1, 'warehouse_id': 2})


def test_validate_smart_ship_nested_structure():
    action = validate_action({
        'type': 'smart_ship', 'order_id': 10,
        'assignments': [{'warehouse_id': 1, 'items': [{'order_item_id': 1, 'quantity': 2}]}],
    })
    assert action.assignments[0].warehouse_id == 1
    assert action.assignments[0].items[0].quantity == 2


def test_validate_smart_ship_rejects_malformed_items():
    with pytest.raises(InvalidActionError):
        validate_action({
            'type': 'smart_ship', 'order_id': 10,
            'assignments': [{'warehouse_id': 1, 'items': [{'quantity': 'not-a-number'}]}],
        })


def _create_product(db_session, price=100.0, cost=60.0):
    product = Product(name='Priced Widget', sku='SKU-PRICE-1', price=price, cost_price=cost, is_active=True)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def test_simulate_promotion_never_exceeds_max_discount(db_session):
    product = _create_product(db_session)
    result = simulate_promotion(db_session, product.id)
    for option in result['options']:
        assert option['discount_percent'] <= MAX_DISCOUNT_PERCENT


def test_simulate_promotion_flags_options_below_min_margin(db_session):
    # Low cost margin headroom: cost close to price so higher discounts breach the margin floor
    product = _create_product(db_session, price=100.0, cost=78.0)
    result = simulate_promotion(db_session, product.id)
    for option in result['options']:
        if option['margin_percent'] < MIN_MARGIN_PERCENT:
            assert option['passes_guardrails'] is False


def test_simulate_promotion_recommends_only_passing_options(db_session):
    product = _create_product(db_session, price=100.0, cost=50.0)
    result = simulate_promotion(db_session, product.id)
    if result['recommended_discount_percent'] is not None:
        matching = [o for o in result['options'] if o['discount_percent'] == result['recommended_discount_percent']]
        assert matching[0]['passes_guardrails'] is True


def test_simulate_promotion_nonexistent_product_returns_error(db_session):
    result = simulate_promotion(db_session, 999999)
    assert 'error' in result


def test_simulate_promotion_high_cost_product_recommends_no_discount(db_session):
    # cost so close to price that every discount option breaches the margin floor
    product = _create_product(db_session, price=100.0, cost=95.0)
    result = simulate_promotion(db_session, product.id)
    assert result['recommended_discount_percent'] is None
