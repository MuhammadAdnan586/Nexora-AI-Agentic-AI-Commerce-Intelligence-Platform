"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Upload, Image as ImageIcon } from "lucide-react";
import { api } from "@/context/AuthContext";

interface Product {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  price: number;
  category_id: number | null;
  is_active: boolean;
  image_url?: string | null;
}
interface StockSummary {
  product_id: number;
  product_name: string;
  total_stock: number;
  warehouses: { warehouse_id: number; warehouse_name: string; quantity: number }[];
}
interface Category {
  id: number;
  name: string;
}

const resolveImage = (url?: string | null) => {
  if (!url) return null;
  return url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_API_URL}${url}`;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [stockSummary, setStockSummary] = useState<StockSummary[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extraImages, setExtraImages] = useState<{ id: number; image_url: string }[]>([]);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    price: "",
    category_id: "",
    image_url: "",
  });

  const loadData = async () => {
    setLoading(true);
    const [prodRes, catRes, stockRes] = await Promise.all([
      api.get("/products/?limit=100"),
      api.get("/categories/"),
      api.get("/admin/products-stock-summary"),
    ]);
    setProducts(prodRes.data);
    setCategories(catRes.data);
    setStockSummary(stockRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

   const resetForm = () => {
    setForm({ name: "", sku: "", description: "", price: "", category_id: "", image_url: "" });
    setEditingId(null);
    setShowForm(false);
    setExtraImages([]);
  };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/uploads/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((f) => ({ ...f, image_url: res.data.url }));
    } catch {
      alert("Image upload failed");
    } finally {
      setUploading(false);
    }
  };
  const handleExtraImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;
    setUploadingExtra(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`/products/${editingId}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setExtraImages((prev) => [...prev, res.data]);
    } catch {
      alert("Image upload failed");
    } finally {
      setUploadingExtra(false);
    }
  };

  const deleteExtraImage = async (imageId: number) => {
    if (!editingId) return;
    await api.delete(`/products/${editingId}/images/${imageId}`);
    setExtraImages((prev) => prev.filter((img) => img.id !== imageId));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      sku: form.sku,
      description: form.description || null,
      price: parseFloat(form.price),
      category_id: form.category_id ? parseInt(form.category_id) : null,
      image_url: form.image_url || null,
    };

    if (editingId) {
      await api.put(`/products/${editingId}`, payload);
    } else {
      await api.post("/products/", payload);
    }
    resetForm();
    loadData();
  };

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      sku: product.sku,
      description: product.description || "",
      price: String(product.price),
      category_id: product.category_id ? String(product.category_id) : "",
      image_url: product.image_url || "",
    });
    setEditingId(product.id);
    setShowForm(true);
    api.get(`/products/${product.id}`).then((res) => setExtraImages(res.data.images || []));
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deactivate this product?")) return;
    await api.delete(`/products/${id}`);
    loadData();
  };

  const inputClass =
    "bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Products</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-nexora-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-nexora-primary/90 transition-colors"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {showForm && (
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold">{editingId ? "Edit Product" : "New Product"}</h2>
            <button onClick={resetForm} className="text-nexora-muted hover:text-nexora-text">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            {/* Image upload */}
            <div className="sm:col-span-2 flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl border border-nexora-border bg-nexora-bg flex items-center justify-center overflow-hidden shrink-0">
                {form.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveImage(form.image_url) || ""} alt="Product" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={24} className="text-nexora-muted" />
                )}
              </div>
              <label className="flex items-center gap-2 bg-nexora-bg border border-nexora-border px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer hover:border-nexora-primary transition-colors">
                <Upload size={14} />
                {uploading ? "Uploading..." : "Upload Image"}
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="hidden" />
              </label>
              {form.image_url && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, image_url: "" })}
                  className="text-xs text-nexora-danger hover:underline"
                >
                  Remove
                </button>
              )}
            </div>

            {editingId && (
              <div className="sm:col-span-2">
                <p className="text-xs text-nexora-muted mb-2">Additional Images (gallery)</p>
                <div className="flex flex-wrap gap-3">
                  {extraImages.map((img) => (
                    <div key={img.id} className="relative w-16 h-16 rounded-lg border border-nexora-border overflow-hidden group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={resolveImage(img.image_url) || ""} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => deleteExtraImage(img.id)}
                        className="absolute inset-0 bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <label className="w-16 h-16 rounded-lg border border-dashed border-nexora-border flex items-center justify-center cursor-pointer hover:border-nexora-primary transition-colors text-nexora-muted">
                    {uploadingExtra ? "..." : <Plus size={18} />}
                    <input type="file" accept="image/*" onChange={handleExtraImageUpload} disabled={uploadingExtra} className="hidden" />
                  </label>
                </div>
              </div>
            )}

            <input
              required
              placeholder="Product name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
            <input
              required
              placeholder="SKU"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className={inputClass}
            />
            <input
              required
              type="number"
              step="0.01"
              placeholder="Price"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className={inputClass}
            />
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className={inputClass}
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={`sm:col-span-2 resize-none ${inputClass}`}
              rows={2}
            />
            <button
              type="submit"
              className="sm:col-span-2 bg-nexora-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-nexora-primary/90 transition-colors"
            >
              {editingId ? "Update Product" : "Create Product"}
            </button>
          </form>
        </div>
      )}

      <div className="bg-nexora-surface border border-nexora-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nexora-border text-nexora-muted text-left">
              <th className="px-5 py-3 font-medium">Image</th>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">SKU</th>
              <th className="px-5 py-3 font-medium">Price</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Stock by Warehouse</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-nexora-muted">Loading...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-nexora-muted">No products yet.</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-nexora-border last:border-0">
                  <td className="px-5 py-3">
                    <div className="w-10 h-10 rounded-lg border border-nexora-border bg-nexora-bg flex items-center justify-center overflow-hidden">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={resolveImage(p.image_url) || ""} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={14} className="text-nexora-muted" />
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-medium">{p.name}</td>
                  <td className="px-5 py-3 font-mono text-nexora-muted">{p.sku}</td>
                  <td className="px-5 py-3 font-mono">${p.price.toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${p.is_active ? "bg-nexora-success/10 text-nexora-success" : "bg-nexora-danger/10 text-nexora-danger"}`}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {(() => {
                      const summary = stockSummary.find((s) => s.product_id === p.id);
                      if (!summary || summary.warehouses.length === 0) {
                        return <span className="text-xs text-nexora-muted">No stock records</span>;
                      }
                      return (
                        <div className="flex flex-col gap-0.5">
                          {summary.warehouses.map((w) => (
                            <span key={w.warehouse_id} className="text-xs text-nexora-muted">
                              {w.warehouse_name}: <span className="font-mono text-nexora-text">{w.quantity}</span>
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(p)} className="text-nexora-muted hover:text-nexora-primary">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="text-nexora-muted hover:text-nexora-danger">
                        <Trash2 size={16} />
                      </button>
                    </div>
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
