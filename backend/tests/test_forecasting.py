from datetime import datetime, timedelta
import pandas as pd
from app.ml.forecasting import build_daily_sales_dataframe, make_features, train_model_for_product, forecast_next_days, FEATURE_COLS
from app.models.product import Product
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.user import User, UserRole
from app.core.security import hash_password


def _create_user(db_session):
    user = User(email='forecastbuyer@example.com', hashed_password=hash_password('Password123'), role=UserRole.customer)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _create_product(db_session, sku='SKU-FCST-1'):
    product = Product(name='Forecast Widget', sku=sku, price=50.0, cost_price=20.0, is_active=True)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def _seed_orders(db_session, user, product, num_days, units_per_day=None):
    base_date = datetime(2026, 1, 1)
    for day in range(num_days):
        order_date = base_date + timedelta(days=day)
        units = units_per_day(day) if units_per_day else 5
        order = Order(
            user_id=user.id, total_amount=units * product.price, status=OrderStatus.delivered,
            created_at=order_date,
        )
        db_session.add(order)
        db_session.commit()
        db_session.refresh(order)

        item = OrderItem(order_id=order.id, product_id=product.id, quantity=units, unit_price=product.price)
        db_session.add(item)
        db_session.commit()


def test_build_daily_sales_dataframe_with_no_orders_is_empty(db_session):
    product = _create_product(db_session)
    df = build_daily_sales_dataframe(db_session, product.id)
    assert df.empty


def test_build_daily_sales_dataframe_fills_missing_days_with_zero(db_session):
    user = _create_user(db_session)
    product = _create_product(db_session)

    base_date = datetime(2026, 1, 1)
    for day in [0, 3]:
        order = Order(user_id=user.id, total_amount=50.0, status=OrderStatus.delivered, created_at=base_date + timedelta(days=day))
        db_session.add(order)
        db_session.commit()
        db_session.refresh(order)
        db_session.add(OrderItem(order_id=order.id, product_id=product.id, quantity=1, unit_price=50.0))
        db_session.commit()

    df = build_daily_sales_dataframe(db_session, product.id)
    assert len(df) == 4
    assert df.iloc[1]['units_sold'] == 0
    assert df.iloc[2]['units_sold'] == 0


def test_make_features_produces_expected_columns():
    dates = pd.date_range('2026-01-01', periods=15, freq='D')
    df = pd.DataFrame({'date': dates, 'units_sold': [float(i % 5 + 1) for i in range(15)]})
    features = make_features(df)
    for col in FEATURE_COLS:
        assert col in features.columns
    assert len(features) == 15 - 7


def test_make_features_drops_rows_with_insufficient_lag_history():
    dates = pd.date_range('2026-01-01', periods=5, freq='D')
    df = pd.DataFrame({'date': dates, 'units_sold': [1.0, 2.0, 3.0, 4.0, 5.0]})
    features = make_features(df)
    assert features.empty


def test_train_model_skips_when_insufficient_data(db_session):
    user = _create_user(db_session)
    product = _create_product(db_session)
    _seed_orders(db_session, user, product, num_days=5)

    result = train_model_for_product(db_session, product.id)
    assert result['status'] == 'skipped'


def test_train_model_succeeds_with_enough_data(db_session):
    user = _create_user(db_session)
    product = _create_product(db_session)
    _seed_orders(db_session, user, product, num_days=40, units_per_day=lambda d: 5 + (d % 7))

    result = train_model_for_product(db_session, product.id)
    assert result['status'] == 'trained'
    assert result['mae'] >= 0
    assert result['rmse'] >= 0
    assert result['training_days'] > 0


def test_forecast_next_days_returns_empty_without_trained_model(db_session):
    product = _create_product(db_session, sku='SKU-FCST-NOTRAIN')
    forecasts = forecast_next_days(db_session, product.id, days=7)
    assert forecasts == []


def test_full_pipeline_train_then_forecast(db_session):
    user = _create_user(db_session)
    product = _create_product(db_session, sku='SKU-FCST-FULL')
    _seed_orders(db_session, user, product, num_days=40, units_per_day=lambda d: 5 + (d % 7))

    train_result = train_model_for_product(db_session, product.id)
    assert train_result['status'] == 'trained'

    forecasts = forecast_next_days(db_session, product.id, days=7)
    assert len(forecasts) == 7
    for f in forecasts:
        assert f['predicted_units'] >= 0
        assert 'date' in f
