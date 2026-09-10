from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.database import Base


class OrderMessage(Base):
    __tablename__ = "order_messages"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender_name = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    attachment_url = Column(String, nullable=True)
    attachment_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())