"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { api, useAuth } from "@/context/AuthContext";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      login(res.data.access_token, true);

      const me = await api.get("/auth/me");

        if (me.data.role !== "admin" && me.data.role !== "operations") {
        logout(true);
        setError("This login is for NEXORA staff only.");
        return;
      }

      router.push("/admin");
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
            <p className="font-display font-bold text-sm leading-tight">NEXORA</p>
            <p className="text-xs text-nexora-muted leading-tight">Operations</p>
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold text-center mb-2">Staff sign in</h1>
        <p className="text-nexora-muted text-center text-sm mb-8">Access the operations dashboard</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-nexora-surface border border-nexora-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
              placeholder="you@nexora.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-nexora-surface border border-nexora-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-nexora-danger text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-nexora-primary text-white py-2.5 rounded-xl font-medium hover:bg-nexora-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs text-nexora-muted mt-8">
          This portal is restricted to NEXORA staff.
        </p>
      </div>
    </main>
  );
}