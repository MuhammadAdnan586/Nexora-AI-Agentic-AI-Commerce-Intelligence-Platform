"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, RefreshCw, Check, Ban } from "lucide-react";
import { api } from "@/context/AuthContext";

interface RiskReview {
  id: number;
  order_id: number;
  customer_email: string;
  total_amount: number;
  risk_score: number;
  risk_level: string;
  signals: string[];
  status: string;
  created_at: string;
}

const levelColor: Record<string, string> = {
  high: "bg-nexora-danger/10 text-nexora-danger",
  medium: "bg-nexora-warning/10 text-nexora-warning",
  low: "bg-nexora-success/10 text-nexora-success",
};

export default function RiskFraudPage() {
  const [reviews, setReviews] = useState<RiskReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await api.get("/admin/risk/reviews?status=pending");
    setReviews(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const scanOrders = async () => {
    setScanning(true);
    await api.get("/admin/risk/scan?limit=50");
    await load();
    setScanning(false);
  };

  const decide = async (id: number, decision: "clear" | "block") => {
    await api.put(`/admin/risk/reviews/${id}/decide?decision=${decision}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-nexora-primary" size={22} />
          <h1 className="font-display text-2xl font-bold">Risk & Fraud</h1>
        </div>
        <button
          onClick={scanOrders}
          disabled={scanning}
          className="flex items-center gap-2 bg-nexora-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw size={16} className={scanning ? "animate-spin" : ""} />
          {scanning ? "Scanning..." : "Scan Recent Orders"}
        </button>
      </div>

      {loading ? (
        <p className="text-nexora-muted">Loading...</p>
      ) : reviews.length === 0 ? (
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-8 text-center">
          <p className="text-nexora-muted mb-1">No orders pending review.</p>
          <p className="text-xs text-nexora-muted">Click &ldquo;Scan Recent Orders&rdquo; to check the latest orders for risk signals.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="bg-nexora-surface border border-nexora-border rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-display font-bold">Order #{r.order_id}</p>
                  <p className="text-sm text-nexora-muted">{r.customer_email} · ${r.total_amount.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-3 py-1.5 rounded-full font-medium uppercase ${levelColor[r.risk_level]}`}>
                    {r.risk_level} · {r.risk_score}
                  </span>
                </div>
              </div>

              <div className="space-y-1 mb-4">
                {r.signals.map((s, i) => (
                  <p key={i} className="text-sm text-nexora-muted">⚠ {s}</p>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => decide(r.id, "clear")}
                  className="flex items-center gap-1.5 bg-nexora-success/10 text-nexora-success px-4 py-2 rounded-xl text-sm font-medium hover:bg-nexora-success/20"
                >
                  <Check size={16} />
                  Clear — Looks Legitimate
                </button>
                <button
                  onClick={() => decide(r.id, "block")}
                  className="flex items-center gap-1.5 bg-nexora-danger/10 text-nexora-danger px-4 py-2 rounded-xl text-sm font-medium hover:bg-nexora-danger/20"
                >
                  <Ban size={16} />
                  Block & Cancel Order
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}