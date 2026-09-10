"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/context/AuthContext";

interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: number;
  status: string;
  total_amount: number;
  shipping_address: string | null;
  warehouse_id: number | null;
  warehouse_name: string | null;
  created_at: string;
  items: OrderItem[];
}

const statusOptions = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const statusColor: Record<string, string> = {
  pending: "bg-nexora-warning/10 text-nexora-warning",
  confirmed: "bg-nexora-cyan/10 text-nexora-cyan",
  shipped: "bg-nexora-primary/10 text-nexora-primary",
  delivered: "bg-nexora-success/10 text-nexora-success",
  cancelled: "bg-nexora-danger/10 text-nexora-danger",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const router = useRouter();

  const loadOrders = async () => {
    setLoading(true);
    const res = await api.get("/admin/orders");
    setOrders(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateStatus = async (orderId: number, status: string) => {
    await api.put(`/admin/orders/${orderId}/status`, { status });
    loadOrders();
  };

  const filteredOrders = orders.filter((o) => {
    if (!selectedDate) return true;
    const orderDate = new Date(o.created_at).toISOString().slice(0, 10);
    return orderDate === selectedDate;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Orders</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-nexora-surface border border-nexora-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate("")}
              className="text-xs text-nexora-muted hover:text-nexora-text px-3 py-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="bg-nexora-surface border border-nexora-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nexora-border text-nexora-muted text-left">
              <th className="px-5 py-3 font-medium">Order</th>
              <th className="px-5 py-3 font-medium">Items</th>
              <th className="px-5 py-3 font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Warehouse</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Update</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-nexora-muted">
                  Loading...
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-nexora-muted">
                  No orders found.
                </td>
              </tr>
            ) : (
              filteredOrders.map((o) => (
                <tr key={o.id} className="border-b border-nexora-border last:border-0">
                  <td
                    className="px-5 py-3 font-mono text-nexora-primary cursor-pointer hover:underline"
                    onClick={() => router.push(`/admin/orders/${o.id}`)}
                  >
                    #{o.id}
                  </td>
                  <td className="px-5 py-3 text-nexora-muted">
                    {o.items.reduce((sum, i) => sum + i.quantity, 0)} units ({o.items.length} product{o.items.length > 1 ? "s" : ""})
                  </td>
                  <td className="px-5 py-3 font-mono">${o.total_amount.toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusColor[o.status]}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-nexora-muted">
                    {o.warehouse_name || "Unassigned"}
                  </td>
                  <td className="px-5 py-3 text-nexora-muted text-xs">
                    {new Date(o.created_at).toLocaleDateString()}{" "}
                    {new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                      className="bg-nexora-bg border border-nexora-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-nexora-primary"
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}