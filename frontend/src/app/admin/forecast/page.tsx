"use client";

import { useEffect, useState } from "react";
import { TrendingUp, RefreshCw } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { api } from "@/context/AuthContext";

interface Product {
  id: number;
  name: string;
}

interface ForecastPoint {
  date: string;
  predicted_units: number;
}

export default function ForecastPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/products/?limit=100").then((res) => {
      setProducts(res.data);
      if (res.data.length > 0) setSelectedId(res.data[0].id);
      setLoading(false);
    });
  }, []);

  const loadForecast = async (productId: number) => {
    setError("");
    try {
      const res = await api.get(`/forecast/${productId}?days=7`);
      setForecast(res.data.forecast);
    } catch {
      setForecast([]);
      setError("No trained model for this product yet. Click 'Retrain All' below.");
    }
  };

  useEffect(() => {
    if (selectedId) loadForecast(selectedId);
  }, [selectedId]);

  const retrainAll = async () => {
    setTraining(true);
    await api.post("/forecast/train-all");
    if (selectedId) await loadForecast(selectedId);
    setTraining(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-nexora-primary" size={22} />
          <h1 className="font-display text-2xl font-bold">Demand Forecast</h1>
        </div>
        <button
          onClick={retrainAll}
          disabled={training}
          className="flex items-center gap-2 bg-nexora-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw size={16} className={training ? "animate-spin" : ""} />
          {training ? "Training..." : "Retrain All Models"}
        </button>
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

          <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6">
            <h2 className="font-display font-bold mb-4">Next 7 Days — Predicted Units</h2>
            {error ? (
              <p className="text-nexora-warning text-sm">{error}</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={forecast}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232838" />
                  <XAxis dataKey="date" stroke="#9096A8" fontSize={12} />
                  <YAxis stroke="#9096A8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#0B0D14", border: "1px solid #232838", borderRadius: 12, color: "#F4F5F7" }}
                  />
                  <Line type="monotone" dataKey="predicted_units" stroke="#22D3EE" strokeWidth={2.5} dot={{ fill: "#22D3EE" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}