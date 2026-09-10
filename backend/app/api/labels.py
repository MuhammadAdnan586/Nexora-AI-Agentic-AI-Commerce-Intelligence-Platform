import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import A6
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from app.core.deps import get_db, require_role
from app.models.user import User, UserRole
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.warehouse import Warehouse

router = APIRouter(prefix="/labels", tags=["Shipping Labels"])


@router.get("/order/{order_id}")
def generate_shipping_label(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    customer = db.query(User).filter(User.id == order.user_id).first() if order else None
    warehouse = db.query(Warehouse).filter(Warehouse.id == order.warehouse_id).first() if order and order.warehouse_id else None
    items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A6)
    width, height = A6

    y = height - 15 * mm

    # Brand header
    c.setFont("Helvetica-Bold", 16)
    c.drawString(10 * mm, y, "NEXORA")
    c.setFont("Helvetica", 8)
    c.drawString(10 * mm, y - 5 * mm, "AI-Powered Commerce")
    c.line(10 * mm, y - 8 * mm, width - 10 * mm, y - 8 * mm)
    y -= 15 * mm

    # Order info
    c.setFont("Helvetica-Bold", 11)
    c.drawString(10 * mm, y, f"Order #{order.id if order else '—'}")
    y -= 6 * mm

    c.setFont("Helvetica", 9)
    c.drawString(10 * mm, y, f"From Warehouse: {warehouse.name if warehouse else 'Unassigned'}")
    y -= 5 * mm
    c.drawString(10 * mm, y, f"{warehouse.city if warehouse else ''}")
    y -= 8 * mm

    c.setFont("Helvetica-Bold", 9)
    c.drawString(10 * mm, y, "DELIVER TO:")
    y -= 5 * mm
    c.setFont("Helvetica", 9)
    c.drawString(10 * mm, y, customer.full_name if customer else "—")
    y -= 5 * mm
    address = order.shipping_address if order else "—"
    c.drawString(10 * mm, y, address[:45] if address else "—")
    y -= 8 * mm

    c.line(10 * mm, y, width - 10 * mm, y)
    y -= 6 * mm

    c.setFont("Helvetica-Bold", 9)
    c.drawString(10 * mm, y, "ITEMS:")
    y -= 5 * mm
    c.setFont("Helvetica", 8)
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        name = product.name if product else "Unknown"
        c.drawString(10 * mm, y, f"{item.quantity}x {name[:35]}")
        y -= 4.5 * mm

    y -= 4 * mm
    c.setFont("Helvetica-Bold", 10)
    c.drawString(10 * mm, y, f"Total: ${order.total_amount:.2f}" if order else "")

    c.showPage()
    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=label-order-{order_id}.pdf"},
    )
@router.get("/shipment/{shipment_id}")
def generate_shipment_label(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    from app.models.order_shipment import OrderShipment
    shipment = db.query(OrderShipment).filter(OrderShipment.id == shipment_id).first()
    if not shipment:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Shipment not found")

    order = db.query(Order).filter(Order.id == shipment.order_id).first()
    customer = db.query(User).filter(User.id == order.user_id).first() if order else None
    warehouse = db.query(Warehouse).filter(Warehouse.id == shipment.warehouse_id).first()
    items = db.query(OrderItem).filter(OrderItem.shipment_id == shipment.id).all()

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A6)
    width, height = A6
    y = height - 15 * mm

    c.setFont("Helvetica-Bold", 16)
    c.drawString(10 * mm, y, "NEXORA")
    c.setFont("Helvetica", 8)
    c.drawString(10 * mm, y - 5 * mm, "AI-Powered Commerce")
    c.line(10 * mm, y - 8 * mm, width - 10 * mm, y - 8 * mm)
    y -= 15 * mm

    c.setFont("Helvetica-Bold", 11)
    c.drawString(10 * mm, y, f"Order #{order.id if order else '-'} (Shipment #{shipment.id})")
    y -= 6 * mm

    c.setFont("Helvetica", 9)
    c.drawString(10 * mm, y, f"From Warehouse: {warehouse.name if warehouse else 'Unassigned'}")
    y -= 5 * mm
    c.drawString(10 * mm, y, f"{warehouse.city if warehouse else ''}")
    y -= 8 * mm

    c.setFont("Helvetica-Bold", 9)
    c.drawString(10 * mm, y, "DELIVER TO:")
    y -= 5 * mm
    c.setFont("Helvetica", 9)
    c.drawString(10 * mm, y, customer.full_name if customer else "-")
    y -= 5 * mm
    address = order.shipping_address if order else "-"
    c.drawString(10 * mm, y, address[:45] if address else "-")
    y -= 8 * mm

    c.line(10 * mm, y, width - 10 * mm, y)
    y -= 6 * mm

    c.setFont("Helvetica-Bold", 9)
    c.drawString(10 * mm, y, "ITEMS IN THIS SHIPMENT:")
    y -= 5 * mm
    c.setFont("Helvetica", 8)
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        name = product.name if product else "Unknown"
        c.drawString(10 * mm, y, f"{item.quantity}x {name[:35]}")
        y -= 4.5 * mm

    c.showPage()
    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=label-order-{order.id}-shipment-{shipment_id}.pdf"},
    )
