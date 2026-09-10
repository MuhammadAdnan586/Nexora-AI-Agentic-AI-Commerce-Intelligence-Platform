"use client";

import { useEffect, useState } from "react";
import { TrendingUp, DollarSign, ShoppingBag, RotateCcw } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import { api } from "@/context/AuthContext";

interface RevenuePoint { date: string; revenue: number; orders: number; }
interface TopProduct { product_id: number; name: string; units_sold: number; revenue: number; }
interface ProfitItem { product_id: number; name: string; price: number; cost_price: number; margin_percent: number; units_sold: number; total_profit: number; }
interface Summary { average_order_value: number; return_rate_percent: number; total_units_sold: number; total_orders: number; total_revenue: number; }

export default function AnalyticsPage() {
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [profit, setProfit] = useState<ProfitItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/analytics/revenue-trend"),
      api.get("/analytics/top-products"),
      api.get("/analytics/profit-margin"),
      api.get("/analytics/summary-metrics"),
    ])
      .then(([r, t, p, s]) => {
        setRevenue(r.data);
        setTopProducts(t.data);
        setProfit(p.data);
        setSummary(s.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-nexora-muted">Loading analytics...</p>;

  const summaryCards = summary ? [
    { label: "Avg Order Value", value: `$${summary.average_order_value.toFixed(2)}`, icon: DollarSign, color: "text-nexora-success", bg: "bg-nexora-success/10" },
    { label: "Total Orders", value: summary.total_orders, icon: ShoppingBag, color: "text-nexora-primary", bg: "bg-nexora-primary/10" },
    { label: "Units Sold", value: summary.total_units_sold, icon: TrendingUp, color: "text-nexora-cyan", bg: "bg-nexora-cyan/10" },
    { label: "Return Rate", value: `${summary.return_rate_percent}%`, icon: RotateCcw, color: "text-nexora-warning", bg: "bg-nexora-warning/10" },
  ] : [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Analytics</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {summaryCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-nexora-surface border border-nexora-border rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${c.bg} ${c.color}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-display font-bold mb-1">{c.value}</p>
              <p className="text-sm text-nexora-muted">{c.label}</p>
            </div>
          );
        })}
      </div>

      {/* Revenue trend chart */}
      <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6 mb-8">
        <h2 className="font-display font-bold mb-4">Revenue Trend</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={revenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#232838" />
            <XAxis dataKey="date" stroke="#9096A8" fontSize={12} />
            <YAxis stroke="#9096A8" fontSize={12} />
            <Tooltip
              contentStyle={{ background: "#131620", border: "1px solid #232838", borderRadius: 12, color: "#F4F5F7" }}
            />
            <Line type="monotone" dataKey="revenue" stroke="#6D5EF5" strokeWidth={2.5} dot={{ fill: "#6D5EF5" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Top products chart */}
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6">
          <h2 className="font-display font-bold mb-4">Top Products (by units sold)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topProducts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232838" />
              <XAxis dataKey="name" stroke="#9096A8" fontSize={11} />
              <YAxis stroke="#9096A8" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "#131620", border: "1px solid #232838", borderRadius: 12, color: "#F4F5F7" }}
              />
              <Bar dataKey="units_sold" fill="#22D3EE" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Profit margin table */}
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6">
          <h2 className="font-display font-bold mb-4">Profit Margin</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-nexora-muted text-left border-b border-nexora-border">
                <th className="py-2 font-medium">Product</th>
                <th className="py-2 font-medium">Margin</th>
                <th className="py-2 font-medium">Profit</th>
              </tr>
            </thead>
            <tbody>
              {profit.map((p) => (
                <tr key={p.product_id} className="border-b border-nexora-border last:border-0">
                  <td className="py-2.5">{p.name}</td>
                  <td className="py-2.5 text-nexora-success">{p.margin_percent}%</td>
                  <td className="py-2.5 font-mono">${p.total_profit.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}