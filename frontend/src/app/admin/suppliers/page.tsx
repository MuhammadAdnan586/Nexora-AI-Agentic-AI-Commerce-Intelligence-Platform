"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { api } from "@/context/AuthContext";

interface Supplier {
  id: number;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
}

interface Product {
  id: number;
  name: string;
}

interface Warehouse {
  id: number;
  name: string;
}

interface PurchaseOrder {
  id: number;
  supplier_id: number;
  warehouse_id: number;
  product_id: number;
  quantity: number;
  unit_cost: number;
  status: string;
}

const poStatusOptions = ["pending", "approved", "shipped", "received", "cancelled"];

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showPoForm, setShowPoForm] = useState(false);

  const [supplierForm, setSupplierForm] = useState({ name: "", contact_email: "", contact_phone: "" });
  const [poForm, setPoForm] = useState({ supplier_id: "", warehouse_id: "", product_id: "", quantity: "", unit_cost: "" });

  const loadData = async () => {
    const [supRes, prodRes, whRes, poRes] = await Promise.all([
      api.get("/admin/suppliers"),
      api.get("/products/?limit=100"),
      api.get("/admin/warehouses"),
      api.get("/admin/purchase-orders"),
    ]);
    setSuppliers(supRes.data);
    setProducts(prodRes.data);
    setWarehouses(whRes.data);
    setPos(poRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/admin/suppliers", supplierForm);
    setSupplierForm({ name: "", contact_email: "", contact_phone: "" });
    setShowSupplierForm(false);
    loadData();
  };

  const handlePoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/admin/purchase-orders", {
      supplier_id: parseInt(poForm.supplier_id),
      warehouse_id: parseInt(poForm.warehouse_id),
      product_id: parseInt(poForm.product_id),
      quantity: parseInt(poForm.quantity),
      unit_cost: parseFloat(poForm.unit_cost),
    });
    setPoForm({ supplier_id: "", warehouse_id: "", product_id: "", quantity: "", unit_cost: "" });
    setShowPoForm(false);
    loadData();
  };

  const updatePoStatus = async (id: number, status: string) => {
    await api.put(`/admin/purchase-orders/${id}/status`, { status });
    loadData();
  };

  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-2xl font-bold">Suppliers</h1>
          <button
            onClick={() => setShowSupplierForm(true)}
            className="flex items-center gap-2 bg-nexora-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium"
          >
            <Plus size={16} />
            Add Supplier
          </button>
        </div>

        {showSupplierForm && (
          <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold">New Supplier</h2>
              <button onClick={() => setShowSupplierForm(false)} className="text-nexora-muted"><X size={18} /></button>
            </div>
            <form onSubmit={handleSupplierSubmit} className="grid sm:grid-cols-3 gap-4">
              <input required placeholder="Name" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm" />
              <input placeholder="Email" value={supplierForm.contact_email} onChange={(e) => setSupplierForm({ ...supplierForm, contact_email: e.target.value })} className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm" />
              <input placeholder="Phone" value={supplierForm.contact_phone} onChange={(e) => setSupplierForm({ ...supplierForm, contact_phone: e.target.value })} className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm" />
              <button type="submit" className="sm:col-span-3 bg-nexora-primary text-white py-2.5 rounded-xl text-sm font-medium">Create Supplier</button>
            </form>
          </div>
        )}

        <div className="bg-nexora-surface border border-nexora-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nexora-border text-nexora-muted text-left">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Phone</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-nexora-muted">No suppliers yet.</td></tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="border-b border-nexora-border last:border-0">
                    <td className="px-5 py-3 font-medium">{s.name}</td>
                    <td className="px-5 py-3 text-nexora-muted">{s.contact_email || "—"}</td>
                    <td className="px-5 py-3 text-nexora-muted">{s.contact_phone || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-2xl font-bold">Purchase Orders</h1>
          <button
            onClick={() => setShowPoForm(true)}
            className="flex items-center gap-2 bg-nexora-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium"
          >
            <Plus size={16} />
            Create PO
          </button>
        </div>

        {showPoForm && (
          <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold">New Purchase Order</h2>
              <button onClick={() => setShowPoForm(false)} className="text-nexora-muted"><X size={18} /></button>
            </div>
            <form onSubmit={handlePoSubmit} className="grid sm:grid-cols-3 gap-4">
              <select required value={poForm.supplier_id} onChange={(e) => setPoForm({ ...poForm, supplier_id: e.target.value })} className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm">
                <option value="">Supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select required value={poForm.warehouse_id} onChange={(e) => setPoForm({ ...poForm, warehouse_id: e.target.value })} className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm">
                <option value="">Warehouse</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <select required value={poForm.product_id} onChange={(e) => setPoForm({ ...poForm, product_id: e.target.value })} className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm">
                <option value="">Product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input required type="number" placeholder="Quantity" value={poForm.quantity} onChange={(e) => setPoForm({ ...poForm, quantity: e.target.value })} className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm" />
              <input required type="number" step="0.01" placeholder="Unit cost" value={poForm.unit_cost} onChange={(e) => setPoForm({ ...poForm, unit_cost: e.target.value })} className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm" />
              <button type="submit" className="bg-nexora-primary text-white py-2.5 rounded-xl text-sm font-medium">Create PO</button>
            </form>
          </div>
        )}

        <div className="bg-nexora-surface border border-nexora-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nexora-border text-nexora-muted text-left">
                <th className="px-5 py-3 font-medium">PO #</th>
                <th className="px-5 py-3 font-medium">Qty</th>
                <th className="px-5 py-3 font-medium">Unit Cost</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Update</th>
              </tr>
            </thead>
            <tbody>
              {pos.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-nexora-muted">No purchase orders yet.</td></tr>
              ) : (
                pos.map((po) => (
                  <tr key={po.id} className="border-b border-nexora-border last:border-0">
                    <td className="px-5 py-3 font-mono">#{po.id}</td>
                    <td className="px-5 py-3">{po.quantity}</td>
                    <td className="px-5 py-3 font-mono">${po.unit_cost.toFixed(2)}</td>
                    <td className="px-5 py-3 capitalize">{po.status}</td>
                    <td className="px-5 py-3">
                      <select
                        value={po.status}
                        onChange={(e) => updatePoStatus(po.id, e.target.value)}
                        className="bg-nexora-bg border border-nexora-border rounded-lg px-2 py-1.5 text-xs"
                      >
                        {poStatusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}