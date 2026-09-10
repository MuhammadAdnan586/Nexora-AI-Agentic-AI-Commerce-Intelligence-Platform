"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { api } from "@/context/AuthContext";

interface ScoredProduct {
  product_id: number;
  name: string;
  units_sold: number;
  revenue: number;
  margin_percent: number;
  stock: number;
  returns_count: number;
  opportunity_score: number;
  recommendation: string;
}

function scoreColor(score: number) {
  if (score >= 70) return "text-nexora-success bg-nexora-success/10";
  if (score >= 40) return "text-nexora-warning bg-nexora-warning/10";
  return "text-nexora-danger bg-nexora-danger/10";
}

export default function ProductIntelligencePage() {
  const [data, setData] = useState<ScoredProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/product-intelligence")
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="text-nexora-primary" size={22} />
        <h1 className="font-display text-2xl font-bold">Product Intelligence</h1>
      </div>

      {loading ? (
        <p className="text-nexora-muted">Analyzing products...</p>
      ) : data.length === 0 ? (
        <p className="text-nexora-muted">No product data available.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {data.map((p) => (
            <div key={p.product_id} className="bg-nexora-surface border border-nexora-border rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display font-bold text-lg">{p.name}</h3>
                  <p className="text-sm text-nexora-muted">{p.recommendation}</p>
                </div>
                <span className={`text-lg font-display font-bold px-3 py-1.5 rounded-xl ${scoreColor(p.opportunity_score)}`}>
                  {p.opportunity_score}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <p className="text-sm font-mono font-bold">{p.units_sold}</p>
                  <p className="text-xs text-nexora-muted">Sold</p>
                </div>
                <div>
                  <p className="text-sm font-mono font-bold">${p.revenue.toFixed(0)}</p>
                  <p className="text-xs text-nexora-muted">Revenue</p>
                </div>
                <div>
                  <p className="text-sm font-mono font-bold">{p.margin_percent}%</p>
                  <p className="text-xs text-nexora-muted">Margin</p>
                </div>
                <div>
                  <p className="text-sm font-mono font-bold">{p.stock}</p>
                  <p className="text-xs text-nexora-muted">Stock</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}