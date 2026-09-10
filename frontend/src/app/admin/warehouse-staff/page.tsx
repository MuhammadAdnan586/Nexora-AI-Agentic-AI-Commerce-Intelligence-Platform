"use client";

import { useEffect, useState } from "react";
import { UserPlus, X, Copy, CheckCircle2 } from "lucide-react";
import { api } from "@/context/AuthContext";

interface Staff {
  id: number;
  email: string;
  full_name: string;
  warehouse_id: number;
  warehouse_name: string | null;
}

interface WarehouseOption {
  id: number;
  name: string;
}

export default function WarehouseStaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", warehouse_id: "" });
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string; warehouse: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", warehouse_id: "" });
  const load = async () => {
    const [staffRes, whRes] = await Promise.all([
      api.get("/admin/warehouse-staff"),
      api.get("/admin/warehouses"),
    ]);
    setStaff(staffRes.data);
    setWarehouses(whRes.data);
  };

  useEffect(() => {
    load();
  }, []);

  const generatePassword = () => Math.random().toString(36).slice(-8);

  const openForm = () => {
    setForm({ ...form, password: generatePassword() });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedWarehouse = warehouses.find((w) => w.id === parseInt(form.warehouse_id));
    await api.post("/admin/warehouse-staff", {
      email: form.email,
      password: form.password,
      full_name: form.full_name,
      warehouse_id: parseInt(form.warehouse_id),
    });
    setCreatedCreds({ email: form.email, password: form.password, warehouse: selectedWarehouse?.name || "" });
    setForm({ email: "", password: "", full_name: "", warehouse_id: "" });
    setShowForm(false);
    load();
  };

  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/warehouse/login` : "/warehouse/login";
const startEdit = (s: Staff) => {
    setEditingId(s.id);
    setEditForm({ full_name: s.full_name, warehouse_id: String(s.warehouse_id) });
  };

  const saveEdit = async (id: number) => {
    await api.put(`/admin/warehouse-staff/${id}`, {
      full_name: editForm.full_name,
      warehouse_id: parseInt(editForm.warehouse_id),
    });
    setEditingId(null);
    load();
  };

  const deleteStaff = async (id: number) => {
    if (!confirm("Remove this warehouse staff member?")) return;
    await api.delete(`/admin/warehouse-staff/${id}`);
    load();
  };
  const copyCredentials = () => {
    if (!createdCreds) return;
    const text = `Warehouse Portal Access\nURL: ${loginUrl}\nWarehouse: ${createdCreds.warehouse}\nEmail: ${createdCreds.email}\nPassword: ${createdCreds.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Warehouse Staff</h1>
        <button
          onClick={openForm}
          className="flex items-center gap-2 bg-nexora-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium"
        >
          <UserPlus size={16} />
          Add Staff
        </button>
      </div>

      {createdCreds && (
        <div className="bg-nexora-success/5 border border-nexora-success rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={18} className="text-nexora-success" />
            <p className="font-display font-bold">Account created — share these credentials</p>
          </div>
          <div className="bg-nexora-bg border border-nexora-border rounded-xl p-4 font-mono text-sm space-y-1 mb-3">
            <p>URL: {loginUrl}</p>
            <p>Warehouse: {createdCreds.warehouse}</p>
            <p>Email: {createdCreds.email}</p>
            <p>Password: {createdCreds.password}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyCredentials}
              className="flex items-center gap-2 bg-nexora-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Copy size={14} />
              {copied ? "Copied!" : "Copy to send"}
            </button>
            <button
              onClick={() => setCreatedCreds(null)}
              className="text-sm text-nexora-muted px-4 py-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold">New Warehouse Staff</h2>
            <button onClick={() => setShowForm(false)} className="text-nexora-muted"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <input required placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm" />
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm" />
            <div className="flex gap-2">
              <input required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="flex-1 bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm font-mono" />
              <button type="button" onClick={() => setForm({ ...form, password: generatePassword() })} className="text-xs text-nexora-primary px-3 border border-nexora-border rounded-xl">
                Regenerate
              </button>
            </div>
            <select required value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })} className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm">
              <option value="">Select warehouse</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <button type="submit" className="sm:col-span-2 bg-nexora-primary text-white py-2.5 rounded-xl text-sm font-medium">Create Staff Account</button>
          </form>
        </div>
      )}

      <div className="bg-nexora-surface border border-nexora-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nexora-border text-nexora-muted text-left">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Warehouse</th> 
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
<tbody>
            {staff.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-nexora-muted">No warehouse staff yet.</td></tr>
            ) : (
              staff.map((s) => (
                <tr key={s.id} className="border-b border-nexora-border last:border-0">
                  {editingId === s.id ? (
                    <>
                      <td className="px-5 py-3">
                        <input
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          className="bg-nexora-bg border border-nexora-border rounded-lg px-2 py-1 text-sm w-full"
                        />
                      </td>
                      <td className="px-5 py-3 text-nexora-muted">{s.email}</td>
                      <td className="px-5 py-3">
                        <select
                          value={editForm.warehouse_id}
                          onChange={(e) => setEditForm({ ...editForm, warehouse_id: e.target.value })}
                          className="bg-nexora-bg border border-nexora-border rounded-lg px-2 py-1 text-sm"
                        >
                          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-3 flex gap-2">
                        <button onClick={() => saveEdit(s.id)} className="text-xs bg-nexora-success/10 text-nexora-success px-3 py-1.5 rounded-lg">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-nexora-muted px-3 py-1.5">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3 font-medium">{s.full_name}</td>
                      <td className="px-5 py-3 text-nexora-muted">{s.email}</td>
                      <td className="px-5 py-3">{s.warehouse_name}</td>
                      <td className="px-5 py-3 flex gap-2">
                        <button onClick={() => startEdit(s)} className="text-xs text-nexora-primary hover:underline">Edit</button>
                        <button onClick={() => deleteStaff(s.id)} className="text-xs text-nexora-danger hover:underline">Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}