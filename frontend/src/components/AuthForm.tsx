"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { api, useAuth } from "@/context/AuthContext";
import Link from "next/link";
type Mode = "login" | "signup";

export default function AuthForm({ initialMode = "login" }: { initialMode?: Mode }) {
  const router = useRouter();
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      login(res.data.access_token);
      router.push("/");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
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

  const switchMode = (next: Mode) => {
    setError("");
    setMode(next);
  };

  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-nova-cyan focus:ring-2 focus:ring-nova-cyan/20 transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-md rounded-3xl p-7 sm:p-9 bg-white shadow-[0_40px_100px_-30px_rgba(0,0,0,0.5)]"
    >
      <div className="relative flex items-center gap-8 mb-8 border-b border-slate-200">
        <button
          onClick={() => switchMode("login")}
          className={`relative pb-3 text-sm font-semibold transition-colors ${
            mode === "login" ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Login
          {mode === "login" && (
            <motion.div layoutId="auth-tab" className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-gradient-to-r from-nova-cyan to-nova-violet" />
          )}
        </button>
        <button
          onClick={() => switchMode("signup")}
          className={`relative pb-3 text-sm font-semibold transition-colors ${
            mode === "signup" ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Sign Up
          {mode === "signup" && (
            <motion.div layoutId="auth-tab" className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-gradient-to-r from-nova-cyan to-nova-violet" />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === "login" ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <h1 className="font-display text-2xl font-bold mb-1.5 text-slate-900">Welcome back</h1>
            <p className="text-slate-500 text-sm mb-7">Login to your Nexora account and continue your shopping journey.</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className={inputClass}
                />
              </div>

              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className={inputClass + " pr-11"}
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

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-nova-cyan"
                  />
                  Remember me
                </label>
                <Link href="/forgot-password" className="text-nova-cyan hover:underline">
                  Forgot password?
                </Link>
              </div>

              {error && <p className="text-rose-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-nova-cyan to-nova-violet text-white py-3 rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_-8px_rgba(79,227,242,0.5)] transition-shadow disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Login"}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <SocialDivider />

            <p className="text-center text-sm text-slate-500 mt-7">
              Don&apos;t have an account?{" "}
              <button onClick={() => switchMode("signup")} className="text-nova-cyan font-medium hover:underline">
                Sign Up
              </button>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="signup"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <h1 className="font-display text-2xl font-bold mb-1.5 text-slate-900">Create your account</h1>
            <p className="text-slate-500 text-sm mb-7">Join Nexora and start shopping smarter with AI-curated picks.</p>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  className={inputClass}
                />
              </div>

              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className={inputClass}
                />
              </div>

              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className={inputClass + " pr-11"}
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
                  placeholder="Confirm password"
                  className={inputClass}
                />
              </div>

              {error && <p className="text-rose-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-nova-cyan to-nova-violet text-white py-3 rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_-8px_rgba(79,227,242,0.5)] transition-shadow disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Create Account"}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-7">
              Already have an account?{" "}
              <button onClick={() => switchMode("login")} className="text-nova-cyan font-medium hover:underline">
                Login
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SocialDivider() {
  return (
    <>
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400">or</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {["Google", "Apple", "Facebook"].map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => alert(`${label} login is not connected yet.`)}
            className="py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}