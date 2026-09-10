"use client";

import { useEffect, useState } from "react";
import { Plus, X, Upload, Image as ImageIcon } from "lucide-react";
import { api } from "@/context/AuthContext";

interface Category {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
}

const resolveImage = (url?: string | null) => {
  if (!url) return null;
  return url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_API_URL}${url}`;
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    const res = await api.get("/categories/");
    setCategories(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setForm({ name: "", description: "" });
    setPendingFile(null);
    setPendingPreview(null);
    setShowForm(false);
  };

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post("/categories/", {
      name: form.name,
      description: form.description || null,
    });
    const newCategory: Category = res.data;

    if (pendingFile) {
      const formData = new FormData();
      formData.append("file", pendingFile);
      await api.post(`/categories/${newCategory.id}/image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }

    resetForm();
    loadData();
  };

  const handleReplaceImage = async (categoryId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(categoryId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.post(`/categories/${categoryId}/image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      loadData();
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Categories</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-nexora-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-nexora-primary/90 transition-colors"
        >
          <Plus size={16} />
          Add Category
        </button>
      </div>

      {showForm && (
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold">New Category</h2>
            <button onClick={resetForm} className="text-nexora-muted hover:text-nexora-text">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border border-nexora-border bg-nexora-bg flex items-center justify-center overflow-hidden shrink-0">
                {pendingPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pendingPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={22} className="text-nexora-muted" />
                )}
              </div>
              <label className="flex items-center gap-2 bg-nexora-bg border border-nexora-border px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer hover:border-nexora-primary transition-colors">
                <Upload size={14} />
                Choose Image
                <input type="file" accept="image/*" onChange={handlePickFile} className="hidden" />
              </label>
            </div>

            <input
              required
              placeholder="Category name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
            />
            <input
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
            />
            <button
              type="submit"
              className="sm:col-span-2 bg-nexora-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-nexora-primary/90 transition-colors"
            >
              Create Category
            </button>
          </form>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-nexora-muted">Loading...</p>
        ) : categories.length === 0 ? (
          <p className="text-nexora-muted">No categories yet.</p>
        ) : (
          categories.map((c) => (
            <div key={c.id} className="bg-nexora-surface border border-nexora-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 rounded-xl border border-nexora-border bg-nexora-bg flex items-center justify-center overflow-hidden shrink-0">
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolveImage(c.image_url) || ""} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={18} className="text-nexora-muted" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-bold truncate">{c.name}</h3>
                  <p className="text-sm text-nexora-muted truncate">{c.description || "No description"}</p>
                </div>
              </div>
              <label className="flex items-center justify-center gap-2 bg-nexora-bg border border-nexora-border px-3 py-2 rounded-lg text-xs font-medium cursor-pointer hover:border-nexora-primary transition-colors">
                <Upload size={12} />
                {uploadingId === c.id ? "Uploading..." : c.image_url ? "Replace Image" : "Upload Image"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleReplaceImage(c.id, e)}
                  disabled={uploadingId === c.id}
                  className="hidden"
                />
              </label>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
