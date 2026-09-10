"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { api } from "@/context/AuthContext";

interface InventoryItem {
  id: number;
  product_id: number;
  product_name: string;
  warehouse_id: number;
  warehouse_name: string;
  quantity: number;
  reorder_level: number;
}

interface Product {
  id: number;
  name: string;
}

interface Warehouse {
  id: number;
  name: string;
}

export default function AdminInventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);

  const [form, setForm] = useState({ product_id: "", warehouse_id: "", quantity: "", reorder_level: "10" });
  const [warehouseForm, setWarehouseForm] = useState({ name: "", city: "" });

  const loadData = async () => {
    setLoading(true);
    const [invRes, prodRes, whRes] = await Promise.all([
      api.get("/admin/inventory"),
      api.get("/products/?limit=100"),
      api.get("/admin/warehouses"),
    ]);
    setItems(invRes.data);
    setProducts(prodRes.data);
    setWarehouses(whRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/admin/inventory", {
      product_id: parseInt(form.product_id),
      warehouse_id: parseInt(form.warehouse_id),
      quantity: parseInt(form.quantity),
      reorder_level: parseInt(form.reorder_level),
    });
    setForm({ product_id: "", warehouse_id: "", quantity: "", reorder_level: "10" });
    setShowForm(false);
    loadData();
  };

  const handleWarehouseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/admin/warehouses", warehouseForm);
    setWarehouseForm({ name: "", city: "" });
    setShowWarehouseForm(false);
    loadData();
  };

  const updateQuantity = async (id: number, quantity: number) => {
    await api.put(`/admin/inventory/${id}`, { quantity });
    loadData();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Inventory</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowWarehouseForm(true)}
            className="text-sm text-nexora-muted border border-nexora-border px-4 py-2.5 rounded-xl hover:text-nexora-text transition-colors"
          >
            + Warehouse
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-nexora-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-nexora-primary/90 transition-colors"
          >
            <Plus size={16} />
            Add Stock
          </button>
        </div>
      </div>

      {showWarehouseForm && (
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold">New Warehouse</h2>
            <button onClick={() => setShowWarehouseForm(false)} className="text-nexora-muted hover:text-nexora-text">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleWarehouseSubmit} className="grid sm:grid-cols-2 gap-4">
            <input
              required
              placeholder="Warehouse name"
              value={warehouseForm.name}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
              className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
            />
            <input
              placeholder="City"
              value={warehouseForm.city}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, city: e.target.value })}
              className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
            />
            <button type="submit" className="sm:col-span-2 bg-nexora-primary text-white py-2.5 rounded-xl text-sm font-medium">
              Create Warehouse
            </button>
          </form>
        </div>
      )}

      {showForm && (
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold">Add Stock</h2>
            <button onClick={() => setShowForm(false)} className="text-nexora-muted hover:text-nexora-text">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <select
              required
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
            >
              <option value="">Select product</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select
              required
              value={form.warehouse_id}
              onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
              className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
            >
              <option value="">Select warehouse</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <input
              required
              type="number"
              placeholder="Quantity"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
            />
            <input
              type="number"
              placeholder="Reorder level"
              value={form.reorder_level}
              onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
              className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
            />
            <button type="submit" className="sm:col-span-2 bg-nexora-primary text-white py-2.5 rounded-xl text-sm font-medium">
              Add Stock
            </button>
          </form>
        </div>
      )}

      <div className="bg-nexora-surface border border-nexora-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nexora-border text-nexora-muted text-left">
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-5 py-3 font-medium">Warehouse</th>
              <th className="px-5 py-3 font-medium">Quantity</th>
              <th className="px-5 py-3 font-medium">Reorder Level</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-nexora-muted">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-nexora-muted">No inventory records yet.</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-nexora-border last:border-0">
                  <td className="px-5 py-3 font-medium">{item.product_name}</td>
                  <td
                    className="px-5 py-3 text-nexora-primary cursor-pointer hover:underline"
                    onClick={() => router.push(`/admin/warehouses/${item.warehouse_id}`)}
                  >
                    {item.warehouse_name}
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="number"
                      defaultValue={item.quantity}
                      onBlur={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                      className="bg-nexora-bg border border-nexora-border rounded-lg px-2 py-1 w-20 text-sm"
                    />
                  </td>
                  <td className="px-5 py-3 text-nexora-muted">{item.reorder_level}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${item.quantity <= item.reorder_level ? "bg-nexora-danger/10 text-nexora-danger" : "bg-nexora-success/10 text-nexora-success"}`}>
                      {item.quantity <= item.reorder_level ? "Low Stock" : "In Stock"}
                    </span>
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