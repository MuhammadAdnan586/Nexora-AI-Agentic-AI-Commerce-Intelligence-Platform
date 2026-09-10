"use client";

import { useEffect, useState } from "react";
import { CheckSquare, Check, X } from "lucide-react";
import { api } from "@/context/AuthContext";

interface Promotion {
  id: number;
  product_id: number;
  discount_percent: number;
  projected_profit: number;
  margin_percent: number;
  status: string;
}

export default function ApprovalsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await api.get("/admin/promotions?status=pending");
    setPromotions(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (id: number, decision: "approve" | "reject") => {
    await api.put(`/admin/promotions/${id}/decide?decision=${decision}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <CheckSquare className="text-nexora-primary" size={22} />
        <h1 className="font-display text-2xl font-bold">Approval Queue</h1>
      </div>

      {loading ? (
        <p className="text-nexora-muted">Loading...</p>
      ) : promotions.length === 0 ? (
        <p className="text-nexora-muted">No pending approvals.</p>
      ) : (
        <div className="space-y-4">
          {promotions.map((promo) => (
            <div key={promo.id} className="bg-nexora-surface border border-nexora-border rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="font-display font-bold">{promo.discount_percent}% discount — Product #{promo.product_id}</p>
                <p className="text-sm text-nexora-muted">
                  Projected profit: ${promo.projected_profit} · Margin: {promo.margin_percent}%
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => decide(promo.id, "approve")}
                  className="flex items-center gap-1.5 bg-nexora-success/10 text-nexora-success px-4 py-2 rounded-xl text-sm font-medium hover:bg-nexora-success/20"
                >
                  <Check size={16} />
                  Approve
                </button>
                <button
                  onClick={() => decide(promo.id, "reject")}
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
    </div>
  );
}