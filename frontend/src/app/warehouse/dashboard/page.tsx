"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, ShoppingBag, Bell, LogOut, CheckCircle2, MessageSquare, Send, X, Download, Truck, AlertTriangle } from "lucide-react";
import { warehouseApi } from "@/lib/warehouseApi";

interface WarehouseInfo {
  warehouse_id: number;
  warehouse_name: string;
  city: string;
}

interface StockItem {
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  reorder_level: number;
}

interface OrderItem {
  product_name: string;
  quantity: number;
}

interface WarehouseOrder {
  id: number;
  status: string;
  total_amount: number;
  shipping_address: string;
  created_at: string;
  items: OrderItem[];
}

interface Notification {
  id: number;
  order_id: number;
  message: string;
  status: string;
  created_at: string;
}
interface ChatMessage {
  id: number;
  sender_name: string | null;
  sender_id: number;
  message: string;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
}
const statusOptions = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const statusColor = (status: string) => {
  const ok = ["delivered", "confirmed"];
  const warn = ["shipped", "pending"];
  if (ok.includes(status)) return "bg-nexora-success/10 text-nexora-success";
  if (warn.includes(status)) return "bg-nexora-primary/10 text-nexora-primary";
  return "bg-nexora-danger/10 text-nexora-danger";
};

export default function WarehouseDashboard() {
  const router = useRouter();
  const [info, setInfo] = useState<WarehouseInfo | null>(null);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [orders, setOrders] = useState<WarehouseOrder[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tab, setTab] = useState<"orders" | "stock" | "notifications">("orders");
  const [chatOrderId, setChatOrderId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    try {
      const [infoRes, stockRes, ordersRes, notifRes] = await Promise.all([
        warehouseApi.get("/warehouse-portal/me"),
        warehouseApi.get("/warehouse-portal/stock"),
        warehouseApi.get("/warehouse-portal/orders"),
        warehouseApi.get("/warehouse-portal/notifications"),
      ]);
      setInfo(infoRes.data);
      setStock(stockRes.data);
      setOrders(ordersRes.data);
      setNotifications(notifRes.data);
    } catch {
      router.push("/warehouse/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const updateStatus = async (orderId: number, status: string) => {
    await warehouseApi.put(`/warehouse-portal/orders/${orderId}/status`, { status });
    loadAll();
  };

  const acknowledge = async (id: number) => {
    await warehouseApi.put(`/warehouse-portal/notifications/${id}/acknowledge`);
    loadAll();
  };

  const openChat = async (orderId: number) => {
    setChatOrderId(orderId);
    const res = await warehouseApi.get(`/warehouse-portal/orders/${orderId}/messages`);
    setChatMessages(res.data);
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !chatOrderId) return;
    await warehouseApi.post(`/warehouse-portal/orders/${chatOrderId}/messages`, { message: chatInput });
    setChatInput("");
    const res = await warehouseApi.get(`/warehouse-portal/orders/${chatOrderId}/messages`);
    setChatMessages(res.data);
  };

  const logout = () => {
    sessionStorage.removeItem("warehouse_token");
    router.push("/warehouse/login");
  };

  const pendingNotifCount = notifications.filter((n) => n.status === "pending").length;
  const pendingOrdersCount = orders.filter((o) => o.status === "pending" || o.status === "confirmed").length;
  const lowStockCount = stock.filter((s) => s.quantity <= s.reorder_level).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-nexora-bg text-nexora-text flex items-center justify-center">
        <p className="text-nexora-muted text-sm">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nexora-bg text-nexora-text">
      {/* Header */}
      <header className="border-b border-nexora-border px-6 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="NEXORA" width={38} height={38} className="rounded-lg object-cover" />
          <div>
            <p className="font-display font-bold text-sm leading-tight">NEXORA <span className="text-nexora-muted font-normal">Warehouse</span></p>
            <p className="text-xs text-nexora-muted leading-tight">{info?.warehouse_name} — {info?.city}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/warehouse/logistics")}
            className="flex items-center gap-1.5 text-xs bg-nexora-primary text-white px-3.5 py-2 rounded-lg font-medium hover:bg-nexora-primary/90 transition-colors"
          >
            <Truck size={14} />
            Logistics
          </button>
          <button onClick={logout} className="text-nexora-muted hover:text-nexora-danger transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Stat cards */}
      <div className="px-6 md:px-8 pt-6 grid sm:grid-cols-3 gap-4 max-w-5xl">
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-4 flex items-center gap-3">
          <div className="bg-nexora-primary/10 text-nexora-primary w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
            <ShoppingBag size={18} />
          </div>
          <div>
            <p className="font-display text-xl font-bold leading-tight">{pendingOrdersCount}</p>
            <p className="text-xs text-nexora-muted">Orders to prepare</p>
          </div>
        </div>
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-4 flex items-center gap-3">
          <div className="bg-nexora-warning/10 text-nexora-warning w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="font-display text-xl font-bold leading-tight">{lowStockCount}</p>
            <p className="text-xs text-nexora-muted">Low stock items</p>
          </div>
        </div>
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-4 flex items-center gap-3">
          <div className="bg-nexora-danger/10 text-nexora-danger w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
            <Bell size={18} />
          </div>
          <div>
            <p className="font-display text-xl font-bold leading-tight">{pendingNotifCount}</p>
            <p className="text-xs text-nexora-muted">Pending notifications</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 md:px-8 py-4 mt-2 flex gap-2 border-b border-nexora-border">
        <button
          onClick={() => setTab("orders")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === "orders" ? "bg-nexora-primary text-white" : "text-nexora-muted hover:text-nexora-text"}`}
        >
          <ShoppingBag size={16} /> Orders
        </button>
        <button
          onClick={() => setTab("stock")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === "stock" ? "bg-nexora-primary text-white" : "text-nexora-muted hover:text-nexora-text"}`}
        >
          <Package size={16} /> Stock
        </button>
        <button
          onClick={() => setTab("notifications")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium relative transition-colors ${tab === "notifications" ? "bg-nexora-primary text-white" : "text-nexora-muted hover:text-nexora-text"}`}
        >
          <Bell size={16} /> Notifications
          {pendingNotifCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-nexora-danger text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
              {pendingNotifCount}
            </span>
          )}
        </button>
      </div>

      <main className="p-6 md:p-8">
        {tab === "orders" && (
          <div className="space-y-3 max-w-5xl">
            {orders.length === 0 ? (
              <p className="text-nexora-muted text-sm">No orders assigned to your warehouse yet.</p>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="bg-nexora-surface border border-nexora-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-bold">#{o.id}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(o.status)}`}>{o.status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openChat(o.id)} className="text-nexora-muted hover:text-nexora-primary transition-colors">
                        <MessageSquare size={16} />
                      </button>
                      <select
                        value={o.status}
                        onChange={(e) => updateStatus(o.id, e.target.value)}
                        className="bg-nexora-bg border border-nexora-border rounded-lg px-2 py-1 text-xs"
                      >
                        {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <p className="text-sm text-nexora-muted mb-1">{o.shipping_address}</p>
                  <p className="text-sm">
                    {o.items.map((it) => `${it.quantity}x ${it.product_name}`).join(", ")}
                  </p>
                  <p className="font-mono text-sm text-nexora-primary mt-1">${o.total_amount.toFixed(2)}</p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "stock" && (
          <div className="bg-nexora-surface border border-nexora-border rounded-2xl overflow-hidden max-w-5xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-nexora-border text-nexora-muted text-left">
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">SKU</th>
                  <th className="px-5 py-3 font-medium">Quantity</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((s) => (
                  <tr key={s.product_id} className="border-b border-nexora-border last:border-0">
                    <td className="px-5 py-3">{s.product_name}</td>
                    <td className="px-5 py-3 font-mono text-nexora-muted">{s.sku}</td>
                    <td className="px-5 py-3 font-mono">{s.quantity}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.quantity <= s.reorder_level ? "bg-nexora-danger/10 text-nexora-danger" : "bg-nexora-success/10 text-nexora-success"}`}>
                        {s.quantity <= s.reorder_level ? "Low stock" : "In stock"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "notifications" && (
          <div className="max-w-5xl">
            {(() => {
              const pending = notifications.filter((n) => n.status === "pending");
              const history = notifications.filter((n) => n.status !== "pending");

              return (
                <>
                  <div className="space-y-3 mb-6">
                    {pending.length === 0 ? (
                      <p className="text-nexora-muted text-sm">No pending notifications.</p>
                    ) : (
                      pending.map((n) => (
                        <div key={n.id} className="bg-nexora-surface border border-nexora-border rounded-2xl p-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm">{n.message}</p>
                            <p className="text-xs text-nexora-muted mt-1">{new Date(n.created_at).toLocaleString()}</p>
                          </div>
                          <button onClick={() => acknowledge(n.id)} className="text-xs bg-nexora-primary text-white px-3 py-1.5 rounded-lg shrink-0 ml-3 hover:bg-nexora-primary/90 transition-colors">
                            Acknowledge
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {history.length > 0 && (
                    <details className="group">
                      <summary className="text-sm text-nexora-muted cursor-pointer hover:text-nexora-text select-none mb-3">
                        Show history ({history.length})
                      </summary>
                      <div className="space-y-2">
                        {history.map((n) => (
                          <div key={n.id} className="bg-nexora-bg border border-nexora-border rounded-xl p-3 flex items-center justify-between opacity-60">
                            <p className="text-xs">{n.message}</p>
                            <span className="text-xs text-nexora-success flex items-center gap-1 shrink-0 ml-3">
                              <CheckCircle2 size={12} /> Done
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </main>

      {chatOrderId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-6 z-50" onClick={() => setChatOrderId(null)}>
          <div
            className="bg-nexora-surface border border-nexora-border rounded-2xl w-full max-w-md flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-nexora-border flex items-center justify-between">
              <h2 className="font-display font-bold">Order #{chatOrderId} — Chat</h2>
              <button onClick={() => setChatOrderId(null)} className="text-nexora-muted"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3 max-h-72 overflow-y-auto">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-nexora-muted">No messages yet.</p>
              ) : (
                chatMessages.map((m) => (
                  <div key={m.id} className="bg-nexora-bg border border-nexora-border rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-nexora-primary">{m.sender_name}</p>
                      <p className="text-xs text-nexora-muted">{new Date(m.created_at).toLocaleTimeString()}</p>
                    </div>
                    <p className="text-sm">{m.message}</p>
                    {m.attachment_url && (
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL}${m.attachment_url}`}
                        target="_blank"
                        className="flex items-center gap-2 mt-2 bg-nexora-surface border border-nexora-border rounded-lg px-3 py-2 text-xs text-nexora-primary hover:underline w-fit"
                      >
                        <Download size={12} />
                        {m.attachment_name}
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="p-5 pt-0 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
              />
              <button onClick={sendMessage} className="bg-nexora-primary text-white px-4 rounded-xl">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}