"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Package, MapPin, User, Warehouse, Send, CheckCircle2, Download, MessageSquare, Sparkles } from "lucide-react";
import { api } from "@/context/AuthContext";

interface OrderItemDetail {
  id: number;
  product_id: number;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface ShipmentItem {
  order_item_id: number;
  product_id: number;
  quantity: number;
}

interface Shipment {
  id: number;
  warehouse_id: number;
  warehouse_name: string;
  city: string | null;
  status: string;
  items: ShipmentItem[];
}

interface OrderDetail {
  id: number;
  status: string;
  total_amount: number;
  shipping_address: string | null;
  created_at: string;
  customer: { id: number; name: string | null; email: string } | null;
  warehouse: { id: number; name: string; city: string | null } | null;
  items: OrderItemDetail[];
  shipments: Shipment[];
}

interface RoutingAssignment {
  warehouse_id: number;
  warehouse_name: string;
  city: string | null;
  items: { order_item_id: number; product_name: string; quantity: number }[];
}

interface RoutingPlan {
  strategy: string;
  reasoning: string;
  assignments: RoutingAssignment[];
  out_of_stock_items: { order_item_id: number; product_name: string; quantity: number }[];
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [routingPlan, setRoutingPlan] = useState<RoutingPlan | null>(null);
  const [showRouting, setShowRouting] = useState(false);
  const [routingLoading, setRoutingLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const orderRes = await api.get(`/admin/orders/${id}`);
    setOrder(orderRes.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const previewRouting = async () => {
    setRoutingLoading(true);
    setShowRouting(true);
    const res = await api.get(`/admin/orders/${id}/routing-plan`);
    setRoutingPlan(res.data);
    setRoutingLoading(false);
  };

  const executeRouting = async () => {
    await api.post(`/admin/orders/${id}/execute-routing`);
    setShowRouting(false);
    setRoutingPlan(null);
    load();
    alert("Order routed and warehouses notified!");
  };

  const downloadShipmentLabel = async (shipmentId: number) => {
    const res = await api.get(`/labels/shipment/${shipmentId}`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `label-order-${id}-shipment-${shipmentId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const sendShipmentLabelToWarehouse = async (shipment: Shipment) => {
    const res = await api.get(`/labels/shipment/${shipment.id}`, { responseType: "blob" });
    const file = new File([res.data], `label-order-${id}-shipment-${shipment.id}.pdf`, { type: "application/pdf" });
    const formData = new FormData();
    formData.append("file", file);
    const uploadRes = await api.post("/uploads/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    await api.post(`/admin/orders/${id}/messages`, {
      message: `📎 Shipping label attached (${shipment.warehouse_name})`,
      warehouse_id: shipment.warehouse_id,
      attachment_url: uploadRes.data.url,
      attachment_name: `label-order-${id}-shipment-${shipment.id}.pdf`,
    });
    alert(`Label sent to ${shipment.warehouse_name}. View it in the Messages inbox.`);
  };

  const downloadFullOrderLabel = async () => {
    const res = await api.get(`/labels/order/${id}`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `label-order-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) return <p className="text-nexora-muted">Loading order...</p>;
  if (!order) return <p className="text-nexora-danger">Order not found.</p>;

  const hasShipments = order.shipments && order.shipments.length > 0;

  return (
    <div>
      <button
        onClick={() => router.push("/admin/orders")}
        className="flex items-center gap-2 text-sm text-nexora-muted hover:text-nexora-text mb-6"
      >
        <ArrowLeft size={16} />
        Back to orders
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Order #{order.id}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={previewRouting}
            className="flex items-center gap-2 bg-nexora-primary text-white px-4 py-2 rounded-xl text-sm font-medium"
          >
            <Sparkles size={14} />
            Smart Route
          </button>
          {!hasShipments && (
            <button
              onClick={downloadFullOrderLabel}
              className="flex items-center gap-2 bg-nexora-surface border border-nexora-border px-4 py-2 rounded-xl text-sm font-medium hover:border-nexora-primary"
            >
              <Download size={14} />
              Download Label
            </button>
          )}
          <button
            onClick={() => router.push("/admin/messages")}
            className="flex items-center gap-2 bg-nexora-surface border border-nexora-border px-4 py-2 rounded-xl text-sm font-medium hover:border-nexora-primary"
          >
            <MessageSquare size={14} />
            Messages
          </button>
          <span className="text-xs px-3 py-1.5 rounded-full font-medium capitalize bg-nexora-primary/10 text-nexora-primary">
            {order.status}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-6">
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-5">
          <div className="flex items-center gap-2 text-nexora-muted mb-2">
            <User size={16} />
            <p className="text-sm font-medium">Customer</p>
          </div>
          <p className="font-medium">{order.customer?.name || "—"}</p>
          <p className="text-sm text-nexora-muted">{order.customer?.email}</p>
        </div>

        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-5">
          <div className="flex items-center gap-2 text-nexora-muted mb-2">
            <MapPin size={16} />
            <p className="text-sm font-medium">Shipping Address</p>
          </div>
          <p className="text-sm">{order.shipping_address || "—"}</p>
        </div>

        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-5">
          <div className="flex items-center gap-2 text-nexora-muted mb-2">
            <Warehouse size={16} />
            <p className="text-sm font-medium">Fulfilling Warehouse{hasShipments ? "s" : ""}</p>
          </div>
          {hasShipments ? (
            <div className="space-y-1">
              {order.shipments.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-nexora-success" />
                  <p className="text-sm font-medium">{s.warehouse_name}</p>
                  <span className="text-xs text-nexora-muted">({s.city})</span>
                </div>
              ))}
            </div>
          ) : order.warehouse ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-nexora-success" />
              <div>
                <p className="font-medium">{order.warehouse.name}</p>
                <p className="text-sm text-nexora-muted">{order.warehouse.city}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-nexora-warning">Not assigned — click "Smart Route" above.</p>
          )}
        </div>
      </div>

      <div className="bg-nexora-surface border border-nexora-border rounded-2xl overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-nexora-border flex items-center gap-2">
          <Package size={16} className="text-nexora-muted" />
          <h2 className="font-display font-bold">Items</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nexora-border text-nexora-muted text-left">
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-5 py-3 font-medium">SKU</th>
              <th className="px-5 py-3 font-medium">Qty</th>
              <th className="px-5 py-3 font-medium">Unit Price</th>
              <th className="px-5 py-3 font-medium">Subtotal</th>
              <th className="px-5 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-nexora-border last:border-0">
                <td className="px-5 py-3 font-medium">{item.product_name}</td>
                <td className="px-5 py-3 font-mono text-nexora-muted">{item.sku}</td>
                <td className="px-5 py-3">{item.quantity}</td>
                <td className="px-5 py-3 font-mono">${item.unit_price.toFixed(2)}</td>
                <td className="px-5 py-3 font-mono">${item.subtotal.toFixed(2)}</td>
                <td className="px-5 py-3">
                  <button
                    onClick={async () => {
                      await api.post("/admin/returns", { order_item_id: item.id, reason: "Customer requested" });
                      alert("Return request created");
                    }}
                    className="text-xs text-nexora-warning hover:underline"
                  >
                    Request Return
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="px-5 py-3 text-right font-medium">Total</td>
              <td className="px-5 py-3 font-mono font-bold text-nexora-primary">${order.total_amount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {hasShipments && (
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-nexora-border">
            <h2 className="font-display font-bold">Shipments</h2>
            <p className="text-sm text-nexora-muted mt-1">Each warehouse ships its own portion, with its own label.</p>
          </div>
          <div className="p-5 space-y-3">
            {order.shipments.map((s) => (
              <div key={s.id} className="border border-nexora-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{s.warehouse_name} <span className="text-xs text-nexora-muted">({s.city})</span></p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-nexora-primary/10 text-nexora-primary capitalize">{s.status}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadShipmentLabel(s.id)}
                      className="flex items-center gap-1.5 bg-nexora-surface border border-nexora-border px-3 py-1.5 rounded-lg text-xs font-medium hover:border-nexora-primary"
                    >
                      <Download size={12} />
                      Download Label
                    </button>
                    <button
                      onClick={() => sendShipmentLabelToWarehouse(s)}
                      className="flex items-center gap-1.5 bg-nexora-primary/10 text-nexora-primary px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-nexora-primary/20"
                    >
                      <Send size={12} />
                      Send Label to Chat
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {s.items.map((it) => {
                    const full = order.items.find((oi) => oi.id === it.order_item_id);
                    return (
                      <div key={it.order_item_id} className="text-xs bg-nexora-bg border border-nexora-border rounded-lg px-3 py-2">
                        <p className="text-nexora-muted">{full?.product_name || "Item"}</p>
                        <p>{it.quantity}x</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showRouting && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-6 z-50" onClick={() => setShowRouting(false)}>
          <div
            className="bg-nexora-surface border border-nexora-border rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-nexora-primary" />
              <h2 className="font-display text-lg font-bold">Smart Fulfillment Routing</h2>
            </div>

            {routingLoading ? (
              <p className="text-nexora-muted text-sm">Analyzing warehouses...</p>
            ) : routingPlan ? (
              <>
                <div className="bg-nexora-bg border border-nexora-border rounded-xl p-4 mb-4">
                  <p className="text-xs text-nexora-muted mb-1">Strategy: <span className="capitalize text-nexora-primary font-medium">{routingPlan.strategy}</span></p>
                  <p className="text-sm">{routingPlan.reasoning}</p>
                </div>

                <div className="space-y-3 mb-4">
                  {routingPlan.assignments.map((a) => (
                    <div key={a.warehouse_id} className="border border-nexora-border rounded-xl p-4">
                      <p className="font-medium mb-2">{a.warehouse_name} <span className="text-xs text-nexora-muted">({a.city})</span></p>
                      <div className="space-y-1">
                        {a.items.map((it) => (
                          <p key={it.order_item_id} className="text-sm text-nexora-muted">
                            {it.quantity}x {it.product_name}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {routingPlan.out_of_stock_items.length > 0 && (
                  <div className="bg-nexora-danger/5 border border-nexora-danger rounded-xl p-4 mb-4">
                    <p className="text-sm font-medium text-nexora-danger mb-2">⚠ Out of stock everywhere:</p>
                    {routingPlan.out_of_stock_items.map((it) => (
                      <p key={it.order_item_id} className="text-sm text-nexora-danger">
                        {it.quantity}x {it.product_name}
                      </p>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={executeRouting}
                    disabled={routingPlan.assignments.length === 0}
                    className="flex-1 bg-nexora-primary text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-40"
                  >
                    Confirm & Notify Warehouses
                  </button>
                  <button onClick={() => setShowRouting(false)} className="flex-1 text-nexora-muted text-sm">
                    Cancel
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}