"use client";

import { useEffect, useState } from "react";
import { AlertOctagon, Package, ShieldAlert } from "lucide-react";
import { api } from "@/context/AuthContext";

interface InventoryInsight {
  product_id: number;
  name: string;
  current_stock: number;
  reorder_level: number;
  avg_daily_demand: number;
  days_until_stockout: number | null;
  status: string;
  alert: string;
  recommended_reorder_qty: number;
}

const statusStyles: Record<string, { bg: string; label: string }> = {
  critical: { bg: "bg-nexora-danger/10 text-nexora-danger", label: "Critical" },
  low_stock: { bg: "bg-nexora-warning/10 text-nexora-warning", label: "Low Stock" },
  overstock: { bg: "bg-nexora-cyan/10 text-nexora-cyan", label: "Overstock" },
  healthy: { bg: "bg-nexora-success/10 text-nexora-success", label: "Healthy" },
};

export default function InventoryIntelligencePage() {
  const [data, setData] = useState<InventoryInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/inventory-intelligence")
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <ShieldAlert className="text-nexora-primary" size={22} />
        <h1 className="font-display text-2xl font-bold">Inventory Intelligence</h1>
      </div>

      {loading ? (
        <p className="text-nexora-muted">Analyzing inventory...</p>
      ) : (
        <div className="space-y-4">
          {data.map((item) => {
            const style = statusStyles[item.status] || statusStyles.healthy;
            return (
              <div key={item.product_id} className="bg-nexora-surface border border-nexora-border rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-nexora-bg w-10 h-10 rounded-xl flex items-center justify-center">
                      <Package size={18} className="text-nexora-muted" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold">{item.name}</h3>
                      <p className="text-sm text-nexora-muted">{item.alert}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${style.bg}`}>
                    {style.label}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-3 mt-4">
                  <div>
                    <p className="text-sm font-mono font-bold">{item.current_stock}</p>
                    <p className="text-xs text-nexora-muted">In stock</p>
                  </div>
                  <div>
                    <p className="text-sm font-mono font-bold">{item.avg_daily_demand}</p>
                    <p className="text-xs text-nexora-muted">Avg daily demand</p>
                  </div>
                  <div>
                    <p className="text-sm font-mono font-bold">{item.days_until_stockout ?? "—"}</p>
                    <p className="text-xs text-nexora-muted">Days to stockout</p>
                  </div>
                  <div>
                    {item.recommended_reorder_qty > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <AlertOctagon size={14} className="text-nexora-warning" />
                        <p className="text-sm font-mono font-bold text-nexora-warning">
                          +{item.recommended_reorder_qty}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm font-mono font-bold text-nexora-muted">—</p>
                    )}
                    <p className="text-xs text-nexora-muted">Recommended reorder</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}