from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    sku = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)

    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    category = relationship("Category", back_populates="products")
    images = relationship("ProductImage", order_by="ProductImage.sort_order", cascade="all, delete-orphan")
    price = Column(Float, nullable=False)
    compare_at_price = Column(Float, nullable=True)
    cost_price = Column(Float, nullable=True)
    
    image_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
