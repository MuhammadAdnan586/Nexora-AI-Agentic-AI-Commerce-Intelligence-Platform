"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { api } from "@/context/AuthContext";

interface Campaign {
  id: number;
  product_id: number;
  name: string;
  discount_percent: number;
  predicted_units: number;
  predicted_revenue: number;
  predicted_profit: number;
  actual_units: number;
  actual_revenue: number;
  status: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await api.get("/admin/campaigns");
    setCampaigns(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: number, status: string) => {
    await api.put(`/admin/campaigns/${id}/status?status=${status}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Megaphone className="text-nexora-primary" size={22} />
        <h1 className="font-display text-2xl font-bold">Campaigns</h1>
      </div>

      {loading ? (
        <p className="text-nexora-muted">Loading...</p>
      ) : campaigns.length === 0 ? (
        <p className="text-nexora-muted">No campaigns yet. Approve a promotion to create one.</p>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => {
            const unitsVariance = c.predicted_units ? ((c.actual_units - c.predicted_units) / c.predicted_units) * 100 : 0;
            return (
              <div key={c.id} className="bg-nexora-surface border border-nexora-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display font-bold">{c.name}</h3>
                    <p className="text-sm text-nexora-muted">{c.discount_percent}% discount</p>
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                    c.status === "active" ? "bg-nexora-success/10 text-nexora-success" : "bg-nexora-muted/10 text-nexora-muted"
                  }`}>
                    {c.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-nexora-muted mb-1">Predicted units</p>
                    <p className="font-mono font-bold">{c.predicted_units}</p>
                  </div>
                  <div>
                    <p className="text-xs text-nexora-muted mb-1">Actual units</p>
                    <p className={`font-mono font-bold ${unitsVariance >= 0 ? "text-nexora-success" : "text-nexora-danger"}`}>
                      {c.actual_units} ({unitsVariance >= 0 ? "+" : ""}{unitsVariance.toFixed(0)}%)
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-nexora-muted mb-1">Predicted revenue</p>
                    <p className="font-mono font-bold">${c.predicted_revenue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-nexora-muted mb-1">Actual revenue</p>
                    <p className="font-mono font-bold">${c.actual_revenue.toFixed(2)}</p>
                  </div>
                </div>

                {c.status === "active" && (
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus(c.id, "completed")} className="text-xs bg-nexora-bg border border-nexora-border px-3 py-1.5 rounded-lg text-nexora-muted hover:text-nexora-text">
                      Mark Completed
                    </button>
                    <button onClick={() => updateStatus(c.id, "stopped")} className="text-xs bg-nexora-bg border border-nexora-border px-3 py-1.5 rounded-lg text-nexora-danger hover:text-nexora-danger">
                      Stop Campaign
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}