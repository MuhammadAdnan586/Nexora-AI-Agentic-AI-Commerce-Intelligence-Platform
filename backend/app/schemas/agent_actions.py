"""Pydantic schemas for agent-proposed actions (Phase 22 guardrails).

Every action a tool proposes (assign warehouse, apply discount, etc.) is
validated against one of these models before it is stored as a pending
action and before it is executed. This replaces the old approach of
passing raw, unvalidated dicts around between the tool layer, the
__PENDING_ACTION__ marker, and _execute_action.
"""
from typing import Literal, Union
from pydantic import BaseModel, ValidationError


class AssignWarehouseAction(BaseModel):
    type: Literal["assign_warehouse"] = "assign_warehouse"
    order_id: int
    warehouse_id: int
    warehouse_name: str


class SmartShipItem(BaseModel):
    order_item_id: int
    quantity: int


class SmartShipAssignment(BaseModel):
    warehouse_id: int
    items: list[SmartShipItem]


class SmartShipAction(BaseModel):
    type: Literal["smart_ship"] = "smart_ship"
    order_id: int
    assignments: list[SmartShipAssignment]


class BulkSmartShipAction(BaseModel):
    type: Literal["bulk_smart_ship"] = "bulk_smart_ship"
    order_ids: list[int]


class UpdateOrderStatusAction(BaseModel):
    type: Literal["update_order_status"] = "update_order_status"
    order_id: int
    new_status: str


class ApplyDiscountAction(BaseModel):
    type: Literal["apply_discount"] = "apply_discount"
    product_id: int
    product_name: str
    discount_percent: float
    new_price: float


# Every valid action type maps to its schema here. Anything not in this
# dict is rejected as an unrecognized/unsafe action.
ACTION_MODELS: dict[str, type[BaseModel]] = {
    "assign_warehouse": AssignWarehouseAction,
    "smart_ship": SmartShipAction,
    "bulk_smart_ship": BulkSmartShipAction,
    "update_order_status": UpdateOrderStatusAction,
    "apply_discount": ApplyDiscountAction,
}

PendingAction = Union[
    AssignWarehouseAction, SmartShipAction, BulkSmartShipAction,
    UpdateOrderStatusAction, ApplyDiscountAction,
]


class InvalidActionError(Exception):
    """Raised when a proposed action doesn't match any known, valid schema."""
    pass


def validate_action(data: dict) -> BaseModel:
    """Validate a raw action dict (e.g. parsed from the __PENDING_ACTION__
    marker) against its Pydantic schema, keyed by the 'type' field.
    Raises InvalidActionError if the type is unknown or the fields don't
    match the schema (wrong types, missing required fields, etc.)."""
    action_type = data.get("type")
    model_cls = ACTION_MODELS.get(action_type)
    if model_cls is None:
        raise InvalidActionError(f"Unknown or unsupported action type: {action_type!r}")
    try:
        return model_cls.model_validate(data)
    except ValidationError as e:
        raise InvalidActionError(f"Action failed validation: {e}") from e
