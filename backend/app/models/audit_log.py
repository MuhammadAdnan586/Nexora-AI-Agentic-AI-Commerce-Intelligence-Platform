from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action_type = Column(String, nullable=False)       # e.g. "apply_discount", "assign_warehouse"
    entity_type = Column(String, nullable=True)          # e.g. "order", "product"
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)                 # JSON-serialized action payload
    result = Column(String, nullable=False, default="success")  # "success" or "failed"
    source = Column(String, nullable=False, default="agent")     # "agent" or "admin_ui"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
