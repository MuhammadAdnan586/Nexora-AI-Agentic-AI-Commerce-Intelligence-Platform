"use client";

import { useEffect, useState } from "react";
import { Tag, Check } from "lucide-react";
import { api } from "@/context/AuthContext";

interface Product {
  id: number;
  name: string;
}

interface PromoOption {
  discount_percent: number;
  discounted_price: number;
  projected_weekly_units: number;
  projected_revenue: number;
  projected_profit: number;
  margin_percent: number;
  expected_demand_increase_percent: number;
  expected_revenue_change_percent: number;
  expected_profit_change_percent: number;
  passes_guardrails: boolean;
}

interface SimulationResult {
  product_id: number;
  product_name: string;
  current_price: number;
  baseline_weekly_units: number;
  baseline_weekly_revenue: number;
  baseline_weekly_profit: number;
  options: PromoOption[];
  recommended_discount_percent: number;
}

export default function PricingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/products/?limit=100").then((res) => {
      setProducts(res.data);
      if (res.data.length > 0) setSelectedId(res.data[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedId) {
      api.get(`/admin/pricing-simulator/${selectedId}`).then((res) => setResult(res.data));
    }
  }, [selectedId]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Tag className="text-nexora-primary" size={22} />
        <h1 className="font-display text-2xl font-bold">Pricing & Promotion Simulator</h1>
      </div>

      {loading ? (
        <p className="text-nexora-muted">Loading...</p>
      ) : (
        <>
          <div className="flex gap-2 mb-6 flex-wrap">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedId === p.id
                    ? "bg-nexora-primary text-white"
                    : "bg-nexora-surface border border-nexora-border text-nexora-muted hover:text-nexora-text"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {result && (
            <>
              <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-5 mb-6">
                <p className="text-sm text-nexora-muted mb-1">Current baseline (no discount, next 7 days)</p>
                <div className="flex gap-8">
                  <div>
                    <p className="font-mono font-bold text-lg">${result.current_price.toFixed(2)}</p>
                    <p className="text-xs text-nexora-muted">Price</p>
                  </div>
                  <div>
                    <p className="font-mono font-bold text-lg">{result.baseline_weekly_units}</p>
                    <p className="text-xs text-nexora-muted">Projected units</p>
                  </div>
                  <div>
                    <p className="font-mono font-bold text-lg">${result.baseline_weekly_revenue}</p>
                    <p className="text-xs text-nexora-muted">Projected revenue</p>
                  </div>
                  <div>
                    <p className="font-mono font-bold text-lg">${result.baseline_weekly_profit}</p>
                    <p className="text-xs text-nexora-muted">Projected profit</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                {result.options.map((opt) => {
                  const isBest = opt.discount_percent === result.recommended_discount_percent;
                  return (
                    <div
                      key={opt.discount_percent}
                      className={`bg-nexora-surface border rounded-2xl p-5 relative ${
                        isBest ? "border-nexora-success ring-1 ring-nexora-success" : "border-nexora-border"
                      }`}
                    >
                      {isBest && (
                        <div className="absolute -top-3 left-5 bg-nexora-success text-nexora-bg text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                          <Check size={12} />
                          Recommended
                        </div>
                      )}
                      <p className="font-display text-2xl font-bold mb-1">{opt.discount_percent}% OFF</p>
                      <p className="font-mono text-nexora-muted text-sm mb-2">${opt.discounted_price.toFixed(2)}</p>
                      {!opt.passes_guardrails && (
                        <p className="text-xs text-nexora-danger mb-3">⚠ Below minimum margin guardrail</p>
                      )}

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-nexora-muted">Demand increase</span>
                          <span className="font-mono text-nexora-success">+{opt.expected_demand_increase_percent}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-nexora-muted">Projected units</span>
                          <span className="font-mono">{opt.projected_weekly_units}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-nexora-muted">Revenue</span>
                          <span className="font-mono">${opt.projected_revenue}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-nexora-muted">Profit</span>
                          <span className={`font-mono ${opt.expected_profit_change_percent >= 0 ? "text-nexora-success" : "text-nexora-danger"}`}>
                            ${opt.projected_profit} ({opt.expected_profit_change_percent >= 0 ? "+" : ""}{opt.expected_profit_change_percent}%)
                          </span>
                        </div>
<div className="flex justify-between">
                          <span className="text-nexora-muted">Margin</span>
                          <span className="font-mono">{opt.margin_percent}%</span>
                        </div>
                      </div>

                      <button
                        disabled={!opt.passes_guardrails}
                        onClick={async () => {
                          await api.post("/admin/promotions", {
                            product_id: result.product_id,
                            discount_percent: opt.discount_percent,
                            projected_profit: opt.projected_profit,
                            margin_percent: opt.margin_percent,
                          });
                          alert("Sent for approval!");
                        }}
                        className="w-full mt-4 bg-nexora-primary text-white py-2 rounded-xl text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Send for Approval
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}