"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";
import { api } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/register", { email, password, full_name: fullName });
      const res = await api.post("/auth/login", { email, password });
      login(res.data.access_token);
      router.push("/");
    } catch {
      setError("Could not create account. Email may already be registered.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="bg-volt text-paper w-8 h-8 rounded-lg flex items-center justify-center">
            <Zap size={18} fill="currentColor" />
          </div>
          <span className="font-display text-xl font-bold">Volt</span>
        </div>

        <h1 className="font-display text-3xl font-bold text-center mb-2">Create account</h1>
        <p className="text-ink/60 text-center mb-8">Start shopping smarter</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Full name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-ink/15 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-volt"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-ink/15 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-volt"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-ink/15 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-volt"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-coral text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-paper py-2.5 rounded-xl font-medium hover:bg-volt transition-colors disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-ink/60 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-volt font-medium">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}