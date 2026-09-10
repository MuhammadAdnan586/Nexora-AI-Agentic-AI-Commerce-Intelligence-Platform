"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Check, X, XCircle } from "lucide-react";
import { api } from "@/context/AuthContext";

interface ReturnItem {
  id: number;
  order_id: number;
  product_name: string;
  quantity: number;
  warehouse_name: string;
  reason: string | null;
  image_url: string | null;
  status: string;
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReturnItem | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await api.get("/admin/returns?status=requested");
    setReturns(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (id: number, decision: "approve" | "reject", note: string = "") => {
    await api.put(`/admin/returns/${id}/process?decision=${decision}&note=${encodeURIComponent(note)}`);
    setSelected(null);
    setShowReject(false);
    setRejectNote("");
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <RotateCcw className="text-nexora-primary" size={22} />
        <h1 className="font-display text-2xl font-bold">Returns</h1>
      </div>

      {loading ? (
        <p className="text-nexora-muted">Loading...</p>
      ) : returns.length === 0 ? (
        <p className="text-nexora-muted">No pending returns.</p>
      ) : (
        <div className="space-y-4">
          {returns.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              className="bg-nexora-surface border border-nexora-border rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:border-nexora-primary transition-colors"
            >
              <div className="flex items-center gap-4">
                {r.image_url && (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL}${r.image_url}`}
                    alt="Return evidence"
                    className="w-16 h-16 rounded-xl object-cover border border-nexora-border"
                  />
                )}
                <div>
                  <p className="font-display font-bold">{r.product_name} — Qty {r.quantity}</p>
                  <p className="text-sm text-nexora-muted">
                    Order #{r.order_id} · Will restock to: {r.warehouse_name}
                  </p>
                  {r.reason && <p className="text-xs text-nexora-muted mt-1">Reason: {r.reason}</p>}
                </div>
              </div>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => decide(r.id, "approve")}
                  className="flex items-center gap-1.5 bg-nexora-success/10 text-nexora-success px-4 py-2 rounded-xl text-sm font-medium hover:bg-nexora-success/20"
                >
                  <Check size={16} />
                  Approve
                </button>
                <button
                  onClick={() => { setSelected(r); setShowReject(true); }}
                  className="flex items-center gap-1.5 bg-nexora-danger/10 text-nexora-danger px-4 py-2 rounded-xl text-sm font-medium hover:bg-nexora-danger/20"
                >
                  <X size={16} />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && !showReject && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-6 z-50" onClick={() => setSelected(null)}>
          <div
            className="bg-nexora-surface border border-nexora-border rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold">Return Request #{selected.id}</h2>
              <button onClick={() => setSelected(null)} className="text-nexora-muted hover:text-nexora-text">
                <XCircle size={20} />
              </button>
            </div>

            {selected.image_url && (
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL}${selected.image_url}`}
                alt="Return evidence"
                className="w-full h-48 rounded-xl object-cover border border-nexora-border mb-4"
              />
            )}

            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between border-b border-nexora-border pb-2">
                <span className="text-nexora-muted">Product</span>
                <span className="font-medium">{selected.product_name}</span>
              </div>
              <div className="flex justify-between border-b border-nexora-border pb-2">
                <span className="text-nexora-muted">Quantity</span>
                <span className="font-medium">{selected.quantity}</span>
              </div>
              <div className="flex justify-between border-b border-nexora-border pb-2">
                <span className="text-nexora-muted">Order</span>
                <span className="font-mono font-medium">#{selected.order_id}</span>
              </div>
              <div className="flex justify-between border-b border-nexora-border pb-2">
                <span className="text-nexora-muted">Fulfilling Warehouse</span>
                <span className="font-medium">{selected.warehouse_name}</span>
              </div>
              <div>
                <span className="text-nexora-muted block mb-1">Reason</span>
                <p>{selected.reason || "No reason provided"}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => decide(selected.id, "approve")}
                className="flex-1 flex items-center justify-center gap-1.5 bg-nexora-success/10 text-nexora-success py-2.5 rounded-xl text-sm font-medium hover:bg-nexora-success/20"
              >
                <Check size={16} />
                Approve & Restock
              </button>
              <button
                onClick={() => setShowReject(true)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-nexora-danger/10 text-nexora-danger py-2.5 rounded-xl text-sm font-medium hover:bg-nexora-danger/20"
              >
                <X size={16} />
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && showReject && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-6 z-50" onClick={() => setShowReject(false)}>
          <div
            className="bg-nexora-surface border border-nexora-border rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg font-bold mb-4">Reject Return — Add a Reason</h2>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
              placeholder="e.g. Item does not meet return policy conditions"
              className="w-full bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-nexora-primary resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => decide(selected.id, "reject", rejectNote)}
                disabled={!rejectNote.trim()}
                className="flex-1 bg-nexora-danger text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-40"
              >
                Confirm Reject
              </button>
              <button
                onClick={() => { setShowReject(false); setSelected(null); }}
                className="flex-1 text-nexora-muted text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}