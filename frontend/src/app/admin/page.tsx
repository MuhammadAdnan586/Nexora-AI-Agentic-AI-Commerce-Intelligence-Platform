"use client";

import { useEffect, useState } from "react";
import { DollarSign, ShoppingBag, Package, Users } from "lucide-react";
import { api } from "@/context/AuthContext";

interface Summary {
  total_revenue: number;
  total_orders: number;
  total_products: number;
  total_customers: number;
  total_categories: number;
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/dashboard/summary")
      .then((res) => setSummary(res.data))
      .catch(() => setError("Could not load dashboard. Admin access required."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-nexora-muted">Loading dashboard...</p>;
  if (error) return <p className="text-nexora-danger">{error}</p>;
  if (!summary) return null;

  const cards = [
    {
      label: "Total Revenue",
      value: `$${summary.total_revenue.toFixed(2)}`,
      icon: DollarSign,
      color: "text-nexora-success",
      bg: "bg-nexora-success/10",
    },
    {
      label: "Total Orders",
      value: summary.total_orders,
      icon: ShoppingBag,
      color: "text-nexora-primary",
      bg: "bg-nexora-primary/10",
    },
    {
      label: "Active Products",
      value: summary.total_products,
      icon: Package,
      color: "text-nexora-cyan",
      bg: "bg-nexora-cyan/10",
    },
    {
      label: "Customers",
      value: summary.total_customers,
      icon: Users,
      color: "text-nexora-warning",
      bg: "bg-nexora-warning/10",
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-nexora-surface border border-nexora-border rounded-2xl p-5"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${card.bg} ${card.color}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-display font-bold mb-1">{card.value}</p>
              <p className="text-sm text-nexora-muted">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6">
        <h2 className="font-display font-bold text-lg mb-2">Welcome to NEXORA Operations</h2>
        <p className="text-nexora-muted text-sm">
          This is your command center. Use the sidebar to manage products, orders,
          customers, inventory, and suppliers.
        </p>
      </div>
    </div>
  );
}