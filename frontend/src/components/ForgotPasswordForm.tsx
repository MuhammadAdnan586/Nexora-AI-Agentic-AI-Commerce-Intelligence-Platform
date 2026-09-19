"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { api } from "@/context/AuthContext";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-nova-cyan focus:ring-2 focus:ring-nova-cyan/20 transition-colors";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl p-7 sm:p-9 bg-white shadow-[0_40px_100px_-30px_rgba(0,0,0,0.5)]">
      {sent ? (
        <div className="text-center py-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-nova-cyan to-nova-violet flex items-center justify-center mb-5">
            <CheckCircle2 size={26} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-1.5 text-slate-900">Check your email</h1>
          <p className="text-slate-500 text-sm mb-7 leading-relaxed">
            If an account exists for <span className="text-slate-900 font-medium">{email}</span>, we&apos;ve sent a
            link to reset your password.
          </p>

          <button
            type="button"
            onClick={() => setSent(false)}
            className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-sm hover:border-slate-300 hover:bg-slate-50 transition-colors mb-4"
          >
            Try a different email
          </button>

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-nova-cyan hover:underline"
          >
            <ArrowLeft size={14} />
            Back to Login
          </Link>
        </div>
      ) : (
        <>
          <h1 className="font-display text-2xl font-bold mb-1.5 text-slate-900">Forgot password?</h1>
          <p className="text-slate-500 text-sm mb-7 leading-relaxed">
            No worries. Enter the email linked to your account and we&apos;ll send you a link to reset your
            password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className={inputClass}
                autoFocus
              />
            </div>

            {error && <p className="text-rose-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-nova-cyan to-nova-violet text-white py-3 rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_-8px_rgba(79,227,242,0.5)] transition-shadow disabled:opacity-50"
            >
              {loading ? "Sending link..." : "Send Reset Link"}
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