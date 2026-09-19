"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { api } from "@/context/AuthContext";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-11 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-nova-cyan focus:ring-2 focus:ring-nova-cyan/20 transition-colors";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is invalid or has expired.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("This reset link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl p-7 sm:p-9 bg-white shadow-[0_40px_100px_-30px_rgba(0,0,0,0.5)]">
      {done ? (
        <div className="text-center py-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-nova-cyan to-nova-violet flex items-center justify-center mb-5">
            <CheckCircle2 size={26} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-1.5 text-slate-900">Password reset</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Your password has been updated. Redirecting you to login&hellip;
          </p>
        </div>
      ) : (
        <>
          <h1 className="font-display text-2xl font-bold mb-1.5 text-slate-900">Set a new password</h1>
          <p className="text-slate-500 text-sm mb-7 leading-relaxed">
            Choose a strong password you haven&apos;t used before.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-nova-cyan focus:ring-2 focus:ring-nova-cyan/20 transition-colors"
              />
            </div>

            {error && <p className="text-rose-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-nova-cyan to-nova-violet text-white py-3 rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_-8px_rgba(79,227,242,0.5)] transition-shadow disabled:opacity-50"
            >
              {loading ? "Updating..." : "Reset Password"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-7">
            Remembered your password?{" "}
            <Link href="/login" className="text-nova-cyan font-medium hover:underline">
              Login
            </Link>
          </p>
        </>
      )}
    </div>
  );
}