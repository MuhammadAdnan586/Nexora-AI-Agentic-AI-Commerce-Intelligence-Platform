from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.deps import get_db, require_role
from app.models.user import User, UserRole
from app.models.product import Product
from app.ml.forecasting import train_model_for_product, forecast_next_days

router = APIRouter(prefix="/forecast", tags=["Demand Forecasting"])


@router.post("/train/{product_id}")
def train_product_model(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    result = train_model_for_product(db, product_id)
    return {"product_id": product_id, "product_name": product.name, **result}


@router.post("/train-all")
def train_all_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    products = db.query(Product).filter(Product.is_active == True).all()
    results = []
    for product in products:
        result = train_model_for_product(db, product.id)
        results.append({"product_id": product.id, "product_name": product.name, **result})
    return results


@router.get("/{product_id}")
def get_forecast(
    product_id: int,
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    forecasts = forecast_next_days(db, product_id, days)
    if not forecasts:
        raise HTTPException(status_code=400, detail="No trained model found. Train the model first.")

    return {"product_id": product_id, "product_name": product.name, "forecast": forecasts}