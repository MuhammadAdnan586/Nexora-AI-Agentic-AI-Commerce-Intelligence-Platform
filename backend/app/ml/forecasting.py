import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import timedelta
import xgboost as xgb
import os
import joblib

from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product

MODEL_DIR = os.path.join(os.path.dirname(__file__), "trained_models")
os.makedirs(MODEL_DIR, exist_ok=True)


def build_daily_sales_dataframe(db: Session, product_id: int) -> pd.DataFrame:
    """Fetch daily units sold for a product and fill in missing days with 0."""
    rows = (
        db.query(
            func.date(Order.created_at).label("date"),
            func.sum(OrderItem.quantity).label("units_sold"),
        )
        .join(OrderItem, OrderItem.order_id == Order.id)
        .filter(OrderItem.product_id == product_id)
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
        .all()
    )

    if not rows:
        return pd.DataFrame(columns=["date", "units_sold"])

    df = pd.DataFrame(rows, columns=["date", "units_sold"])
    df["date"] = pd.to_datetime(df["date"])

    full_range = pd.date_range(df["date"].min(), df["date"].max(), freq="D")
    df = df.set_index("date").reindex(full_range, fill_value=0).rename_axis("date").reset_index()
    df["units_sold"] = df["units_sold"].astype(float)
    return df


def make_features(df: pd.DataFrame) -> pd.DataFrame:
    """Turn raw daily sales into ML features."""
    df = df.copy()
    df["day_of_week"] = df["date"].dt.dayofweek
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["day_of_month"] = df["date"].dt.day
    df["month"] = df["date"].dt.month

    # lag features: sales N days ago
    for lag in [1, 2, 3, 7]:
        df[f"lag_{lag}"] = df["units_sold"].shift(lag)

    # rolling average
    df["rolling_7"] = df["units_sold"].shift(1).rolling(window=7).mean()

    df = df.dropna().reset_index(drop=True)
    return df


FEATURE_COLS = ["day_of_week", "is_weekend", "day_of_month", "month", "lag_1", "lag_2", "lag_3", "lag_7", "rolling_7"]


def train_model_for_product(db: Session, product_id: int) -> dict:
    raw = build_daily_sales_dataframe(db, product_id)
    if len(raw) < 20:
        return {"status": "skipped", "reason": "Not enough historical data (need at least 20 days)."}

    features = make_features(raw)
    if len(features) < 10:
        return {"status": "skipped", "reason": "Not enough data after feature engineering."}

    X = features[FEATURE_COLS]
    y = features["units_sold"]

    split_idx = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    model = xgb.XGBRegressor(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = float(np.mean(np.abs(preds - y_test)))
    rmse = float(np.sqrt(np.mean((preds - y_test) ** 2)))
    denom = np.where(y_test == 0, 1, y_test)
    wape = float(np.sum(np.abs(preds - y_test)) / np.sum(denom) * 100)

    model_path = os.path.join(MODEL_DIR, f"product_{product_id}.joblib")
    joblib.dump(model, model_path)

    return {
        "status": "trained",
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "wape_percent": round(wape, 2),
        "training_days": len(features),
    }


def forecast_next_days(db: Session, product_id: int, days: int = 7) -> list:
    model_path = os.path.join(MODEL_DIR, f"product_{product_id}.joblib")
    if not os.path.exists(model_path):
        return []

    model = joblib.load(model_path)
    raw = build_daily_sales_dataframe(db, product_id)
    if raw.empty:
        return []

    history = raw.set_index("date")["units_sold"].to_dict()

    dates = sorted(history.keys())
    if not dates:
        return []
    last_date = dates[-1]

    forecasts = []
    working_history = dict(history)

    for i in range(1, days + 1):
        forecast_date = last_date + timedelta(days=i)
        lag_1 = working_history.get(forecast_date - timedelta(days=1), 0)
        lag_2 = working_history.get(forecast_date - timedelta(days=2), 0)
        lag_3 = working_history.get(forecast_date - timedelta(days=3), 0)
        lag_7 = working_history.get(forecast_date - timedelta(days=7), 0)
        last_7_vals = [working_history.get(forecast_date - timedelta(days=d), 0) for d in range(1, 8)]
        rolling_7 = float(np.mean(last_7_vals))

        row = pd.DataFrame([{
            "day_of_week": forecast_date.dayofweek,
            "is_weekend": int(forecast_date.dayofweek >= 5),
            "day_of_month": forecast_date.day,
            "month": forecast_date.month,
            "lag_1": lag_1,
            "lag_2": lag_2,
            "lag_3": lag_3,
            "lag_7": lag_7,
            "rolling_7": rolling_7,
        }])

        pred = max(0, float(model.predict(row[FEATURE_COLS])[0]))
        working_history[forecast_date] = pred
        forecasts.append({"date": forecast_date.strftime("%Y-%m-%d"), "predicted_units": round(pred, 1)})

    return forecasts