"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Warehouse, Package, ShoppingBag } from "lucide-react";
import { api } from "@/context/AuthContext";

interface StockItem {
  product_id: number;
  product_name: string;
  sku: string | null;
  quantity: number;
  reorder_level: number;
}

interface RecentOrder {
  id: number;
  status: string;
  total_amount: number;
  created_at: string;
}

interface WarehouseDetail {
  id: number;
  name: string;
  city: string | null;
  address: string | null;
  total_stock_items: number;
  total_orders_fulfilled: number;
  stock: StockItem[];
  recent_orders: RecentOrder[];
}

interface Notification {
  id: number;
  order_id: number;
  message: string;
  status: string;
  created_at: string;
}

export default function WarehouseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<WarehouseDetail | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

const loadNotifications = async () => {
    const res = await api.get(`/admin/warehouses/${id}/notifications`);
    setNotifications(res.data);
  };

  useEffect(() => {
    api
      .get(`/admin/warehouses/${id}`)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
    loadNotifications();
  }, [id]);

  const acknowledge = async (notifId: number) => {
    await api.put(`/admin/notifications/${notifId}/acknowledge`);
    loadNotifications();
  };

  if (loading) return <p className="text-nexora-muted">Loading warehouse...</p>;
  if (!data) return <p className="text-nexora-danger">Warehouse not found.</p>;

  return (
    <div>
      <button
        onClick={() => router.push("/admin/inventory")}
        className="flex items-center gap-2 text-sm text-nexora-muted hover:text-nexora-text mb-6"
      >
        <ArrowLeft size={16} />
        Back to inventory
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="bg-nexora-primary/10 text-nexora-primary w-12 h-12 rounded-xl flex items-center justify-center">
          <Warehouse size={22} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">{data.name}</h1>
          <p className="text-sm text-nexora-muted">{data.city} {data.address ? `· ${data.address}` : ""}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5 mb-8">
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-5">
          <div className="bg-nexora-cyan/10 text-nexora-cyan w-10 h-10 rounded-xl flex items-center justify-center mb-4">
            <Package size={18} />
          </div>
          <p className="text-2xl font-display font-bold mb-1">{data.total_stock_items}</p>
          <p className="text-sm text-nexora-muted">Total units in stock</p>
        </div>
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-5">
          <div className="bg-nexora-primary/10 text-nexora-primary w-10 h-10 rounded-xl flex items-center justify-center mb-4">
            <ShoppingBag size={18} />
          </div>
          <p className="text-2xl font-display font-bold mb-1">{data.total_orders_fulfilled}</p>
          <p className="text-sm text-nexora-muted">Orders fulfilled from here</p>
        </div>
      </div>

      <div className="bg-nexora-surface border border-nexora-border rounded-2xl overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-nexora-border">
          <h2 className="font-display font-bold">Stock</h2>
        </div>
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
            {data.stock.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-nexora-muted">No stock records.</td></tr>
            ) : (
              data.stock.map((s) => (
                <tr key={s.product_id} className="border-b border-nexora-border last:border-0">
                  <td className="px-5 py-3 font-medium">{s.product_name}</td>
                  <td className="px-5 py-3 font-mono text-nexora-muted">{s.sku}</td>
                  <td className="px-5 py-3 font-mono">{s.quantity}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${s.quantity <= s.reorder_level ? "bg-nexora-danger/10 text-nexora-danger" : "bg-nexora-success/10 text-nexora-success"}`}>
                      {s.quantity <= s.reorder_level ? "Low Stock" : "In Stock"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-nexora-surface border border-nexora-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-nexora-border">
          <h2 className="font-display font-bold">Recent Orders</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nexora-border text-nexora-muted text-left">
              <th className="px-5 py-3 font-medium">Order</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_orders.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-nexora-muted">No orders yet.</td></tr>
            ) : (
              data.recent_orders.map((o) => (
                <tr key={o.id} className="border-b border-nexora-border last:border-0">
                  <td className="px-5 py-3 font-mono">#{o.id}</td>
                  <td className="px-5 py-3 capitalize">{o.status}</td>
                  <td className="px-5 py-3 font-mono">${o.total_amount.toFixed(2)}</td>
                  <td className="px-5 py-3 text-nexora-muted text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-nexora-surface border border-nexora-border rounded-2xl overflow-hidden mt-8">
        <div className="px-5 py-4 border-b border-nexora-border">
          <h2 className="font-display font-bold">Notifications</h2>
        </div>
        <div className="p-5 space-y-3">
          {notifications.length === 0 ? (
            <p className="text-sm text-nexora-muted">No notifications.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="flex items-center justify-between bg-nexora-bg border border-nexora-border rounded-xl p-4">
                <div>
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs text-nexora-muted mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {n.status === "pending" ? (
                  <button
                    onClick={() => acknowledge(n.id)}
                    className="text-xs bg-nexora-primary text-white px-3 py-1.5 rounded-lg font-medium"
                  >
                    Acknowledge
                  </button>
                ) : (
                  <span className="text-xs text-nexora-success">Acknowledged</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}