from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.models.order import OrderStatus


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    shipping_address: Optional[str] = None
    city: Optional[str] = None


class OrderResponse(BaseModel):
    id: int
    status: OrderStatus
    total_amount: float
    shipping_address: Optional[str] = None
    warehouse_id: Optional[int] = None
    created_at: datetime
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True