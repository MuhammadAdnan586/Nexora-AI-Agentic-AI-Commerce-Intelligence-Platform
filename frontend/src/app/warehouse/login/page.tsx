"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function WarehouseLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, { email, password });
      sessionStorage.setItem("warehouse_token", res.data.access_token);
      router.push("/warehouse/dashboard");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-nexora-bg text-nexora-text flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="NEXORA" width={40} height={40} className="rounded-xl object-cover" />
          <div className="text-left">
            <p className="font-display font-bold text-lg leading-tight">NEXORA</p>
            <p className="text-xs text-nexora-muted leading-tight">Warehouse Portal</p>
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold text-center mb-1">Staff sign in</h1>
        <p className="text-nexora-muted text-center text-sm mb-8">Sign in with your warehouse account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@nexora.com"
              className="w-full bg-nexora-surface border border-nexora-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-nexora-surface border border-nexora-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
            />
          </div>
          {error && <p className="text-nexora-danger text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-nexora-primary text-white py-3 rounded-xl font-medium hover:bg-nexora-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs text-nexora-muted mt-8">
          This portal is restricted to NEXORA warehouse staff.
        </p>
      </div>
    </main>
  );
}