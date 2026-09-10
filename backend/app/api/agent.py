import re
import json
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from sqlalchemy.orm import Session

from app.agents.graph import agent_graph
from app.core.deps import get_current_user, get_db
from app.core.limiter import limiter
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.warehouse import Warehouse
from app.models.inventory import Inventory
from app.models.notification import WarehouseNotification
from app.core.audit import log_audit as _log_audit
from app.schemas.agent_actions import validate_action, InvalidActionError
from app.core.observability import trace_span, HUMAN_OVERRIDE, AGENT_TOOL_ERRORS

router = APIRouter(prefix="/agent", tags=["AI Agent"])

# In-memory pending-action store, keyed by user id. Resets on server restart.
_pending_actions: dict[int, dict] = {}

CONFIRM_WORDS = {
    "yes", "yeah", "yep", "confirm", "haan", "han", "theek hai", "theek", "ok", "okay",
    "go ahead", "do it", "kar do", "kardo",
    "یس", "ہاں", "جی ہاں", "جی", "ٹھیک ہے", "ٹھیک", "کر دو", "کردو", "او کے",
}
CANCEL_WORDS = {
    "no", "nope", "cancel", "nahi", "nahin", "mat karo", "rehne do", "stop",
    "نہیں", "نہ", "کینسل", "مت کرو", "رہنے دو",
}

# Only these roles may confirm and execute a consequential action (discount,
# warehouse assignment, order status change, etc). Everyone else can still
# chat and get read-only answers, but confirming an action is blocked.
ACTION_ALLOWED_ROLES = {UserRole.admin, UserRole.operations}


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


def _execute_action(action: dict, db: Session, user_id: int) -> str:
    action_type = action["type"]

    if action_type == "assign_warehouse":
        order = db.query(Order).filter(Order.id == action["order_id"]).first()
        warehouse = db.query(Warehouse).filter(Warehouse.id == action["warehouse_id"]).first()
        if not order or not warehouse:
            _log_audit(db, user_id, "assign_warehouse", entity_type="order",
                       entity_id=action.get("order_id"), details=action, result="failed")
            return "Sorry, that order or warehouse no longer exists."

        was_unassigned = order.warehouse_id is None
        order.warehouse_id = warehouse.id
        db.commit()

        if was_unassigned:
            items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
            for item in items:
                inv = db.query(Inventory).filter(
                    Inventory.product_id == item.product_id, Inventory.warehouse_id == warehouse.id
                ).first()
                if inv:
                    inv.quantity = max(0, inv.quantity - item.quantity)
            db.commit()

        notification = WarehouseNotification(
            warehouse_id=warehouse.id,
            order_id=order.id,
            message=f"New order #{order.id} assigned via AI assistant — please prepare for shipping.",
        )
        db.add(notification)
        db.commit()
        _log_audit(db, user_id, "assign_warehouse", entity_type="order", entity_id=order.id, details=action)
        return f"Done! Order #{order.id} has been assigned to {warehouse.name} and they've been notified."
    if action_type == "smart_ship":
        from app.models.order_shipment import OrderShipment, ShipmentStatus
        order = db.query(Order).filter(Order.id == action["order_id"]).first()
        if not order:
            _log_audit(db, user_id, "smart_ship", entity_type="order",
                       entity_id=action.get("order_id"), details=action, result="failed")
            return "Sorry, that order no longer exists."

        created = 0
        for a in action["assignments"]:
            warehouse = db.query(Warehouse).filter(Warehouse.id == a["warehouse_id"]).first()
            if not warehouse:
                continue
            shipment = OrderShipment(order_id=order.id, warehouse_id=warehouse.id, status=ShipmentStatus.pending)
            db.add(shipment)
            db.flush()
            for it in a["items"]:
                item = db.query(OrderItem).filter(OrderItem.id == it["order_item_id"]).first()
                if not item:
                    continue
                item.shipment_id = shipment.id
                inv = db.query(Inventory).filter(
                    Inventory.product_id == item.product_id, Inventory.warehouse_id == warehouse.id
                ).first()
                if inv:
                    inv.quantity = max(0, inv.quantity - item.quantity)
            db.add(WarehouseNotification(
                warehouse_id=warehouse.id, order_id=order.id,
                message=f"New shipment for order #{order.id} via AI assistant — please prepare for shipping.",
            ))
            created += 1

        order.status = OrderStatus.confirmed
        db.commit()
        _log_audit(db, user_id, "smart_ship", entity_type="order", entity_id=order.id, details=action)
        return f"Done! Order #{order.id} has been split into {created} shipment(s) and warehouses have been notified."
    if action_type == "bulk_smart_ship":
        from app.ml.fulfillment_routing import compute_routing_plan
        from app.models.order_shipment import OrderShipment, ShipmentStatus

        results = []
        for order_id in action["order_ids"]:
            order = db.query(Order).filter(Order.id == order_id).first()
            if not order:
                continue
            plan = compute_routing_plan(db, order_id)
            if "error" in plan or not plan["assignments"]:
                results.append(f"#{order_id}: skipped (no stock available)")
                continue

            for a in plan["assignments"]:
                warehouse = db.query(Warehouse).filter(Warehouse.id == a["warehouse_id"]).first()
                if not warehouse:
                    continue
                shipment = OrderShipment(order_id=order.id, warehouse_id=warehouse.id, status=ShipmentStatus.pending)
                db.add(shipment)
                db.flush()
                for it in a["items"]:
                    item = db.query(OrderItem).filter(OrderItem.id == it["order_item_id"]).first()
                    if not item:
                        continue
                    item.shipment_id = shipment.id
                    inv = db.query(Inventory).filter(
                        Inventory.product_id == item.product_id, Inventory.warehouse_id == warehouse.id
                    ).first()
                    if inv:
                        inv.quantity = max(0, inv.quantity - item.quantity)
                db.add(WarehouseNotification(
                    warehouse_id=warehouse.id, order_id=order.id,
                    message=f"New shipment for order #{order.id} via AI assistant — please prepare for shipping.",
                ))
            order.status = OrderStatus.confirmed
            results.append(f"#{order_id}: shipped")

        db.commit()
        _log_audit(db, user_id, "bulk_smart_ship", entity_type="order", details=action)
        return "Done! " + "; ".join(results)
    if action_type == "update_order_status":
        order = db.query(Order).filter(Order.id == action["order_id"]).first()
        if not order:
            _log_audit(db, user_id, "update_order_status", entity_type="order",
                       entity_id=action.get("order_id"), details=action, result="failed")
            return "Sorry, that order no longer exists."
        order.status = OrderStatus(action["new_status"])
        db.commit()
        _log_audit(db, user_id, "update_order_status", entity_type="order", entity_id=order.id, details=action)
        return f"Done! Order #{order.id} is now marked as '{action['new_status']}'."

    if action_type == "apply_discount":
        product = db.query(Product).filter(Product.id == action["product_id"]).first()
        if not product:
            _log_audit(db, user_id, "apply_discount", entity_type="product",
                       entity_id=action.get("product_id"), details=action, result="failed")
            return "Sorry, that product no longer exists."
        product.price = action["new_price"]
        db.commit()
        _log_audit(db, user_id, "apply_discount", entity_type="product", entity_id=product.id, details=action)
        return f"Done! {product.name} is now priced at ${action['new_price']:.2f} ({action['discount_percent']}% off)."

    return "Sorry, I didn't recognize that action."


def _extract_pending_action(reply: str) -> tuple[dict | None, str]:
    """Pull the __PENDING_ACTION__ marker out of a tool reply, returning (action_dict_or_None, clean_reply)."""
    match = re.search(r"__PENDING_ACTION__:(\{.*?\})\n?", reply)
    if not match:
        return None, reply
    action = json.loads(match.group(1))
    clean = reply.replace(match.group(0), "").strip()
    return action, clean


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")
def chat_with_agent(
    request: Request,
    chat_request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_msg_clean = chat_request.message.strip().lower()
    pending = _pending_actions.get(current_user.id)

    # If there's a pending action, check if this message confirms or cancels it
    if pending:
        if any(w in user_msg_clean for w in CONFIRM_WORDS):
            del _pending_actions[current_user.id]
            HUMAN_OVERRIDE.labels(decision="confirm").inc()

            # RBAC: only admin/operations may actually execute a consequential
            # action. Anyone else's confirmation is rejected here, even though
            # they were allowed to see the proposal.
            if current_user.role not in ACTION_ALLOWED_ROLES:
                _log_audit(db, current_user.id, pending.get("type", "unknown"), details=pending, result="forbidden")
                return {"reply": "Sorry, you don't have permission to approve this action. Only admin or operations staff can confirm changes like this."}

            # Defense in depth: re-validate right before executing, in case
            # the stored action was somehow tampered with or malformed.
            try:
                validate_action(pending)
            except InvalidActionError:
                _log_audit(db, current_user.id, pending.get("type", "unknown"), details=pending, result="invalid")
                return {"reply": "Sorry, that pending action is no longer valid. Please try again."}
            reply = _execute_action(pending, db, current_user.id)
            return {"reply": reply}
        if any(w in user_msg_clean for w in CANCEL_WORDS):
            del _pending_actions[current_user.id]
            HUMAN_OVERRIDE.labels(decision="cancel").inc()
            return {"reply": "No problem, I've cancelled that action."}
        # Ambiguous reply — remind them what's pending instead of silently dropping it
        return {"reply": "I still have a pending action waiting for your confirmation. Please reply 'yes' to proceed or 'no' to cancel."}

    thread_id = f"user-{current_user.id}"
    config = {"configurable": {"thread_id": thread_id}}

    with trace_span("agent.graph.invoke", thread_id=thread_id, user_id=current_user.id):
        result = agent_graph.invoke(
        {"messages": [HumanMessage(content=chat_request.message)]},
        config=config,
    )

    last_message = result["messages"][-1]
    action, clean_reply = _extract_pending_action(last_message.content)
    if action:
        # Validate before ever storing it as a pending action. If the LLM/tool
        # produced something malformed, reject it here instead of silently
        # storing bad data that could misbehave when confirmed later.
        try:
            validate_action(action)
        except InvalidActionError:
            _log_audit(db, current_user.id, action.get("type", "unknown"), details=action, result="invalid")
            return {"reply": "Sorry, I generated an invalid action and can't proceed with it. Please try rephrasing your request."}
        _pending_actions[current_user.id] = action
    return {"reply": clean_reply}

