import json
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog


def log_audit(
    db: Session,
    user_id: int,
    action_type: str,
    entity_type: str = None,
    entity_id: int = None,
    details: dict = None,
    result: str = "success",
    source: str = "agent",
) -> None:
    """Write an audit log entry. Logging failures must never break the
    underlying action/request, so this swallows its own exceptions after
    rolling back just the log insert.

    source distinguishes where the entry came from, e.g. 'agent' for
    consequential actions (discounts, warehouse assignment) vs
    'copilot' for RAG Q&A queries."""
    try:
        log = AuditLog(
            user_id=user_id,
            action_type=action_type,
            entity_type=entity_type,
            entity_id=entity_id,
            details=json.dumps(details) if details is not None else None,
            result=result,
            source=source,
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()
