"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, MapPin, Building2 } from "lucide-react";
import { api, useAuth } from "@/context/AuthContext";
import NovaFooter from "@/components/NovaFooter";
import NexoraWordmark from "@/components/NexoraWordmark";
export default function CheckoutPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
  }, [token]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/orders/checkout", { shipping_address: address, city });
      setOrderId(res.data.id);
      setOrderPlaced(true);
    } catch {
      setError("Checkout failed. Your cart may be empty.");
    } finally {
      setLoading(false);
    }
  };

  if (orderPlaced) {
    return (
      <main className="min-h-screen bg-nova-bg text-nova-text flex items-center justify-center px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 50% 45% at 50% 25%, rgba(34,211,238,0.12), transparent 60%)",
          }}
        />
        <div className="relative text-center max-w-sm">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-nova-cyan/10 text-nova-cyan border border-nova-cyan/20">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="font-display text-3xl font-bold mb-3">Order placed!</h1>
          <p className="text-nova-muted mb-8">
            Your order <span className="font-mono text-nova-text">#{orderId}</span> has been confirmed.
          </p>
          <Link
            href="/"
            className="inline-block bg-gradient-to-br from-nova-cyan to-nova-violet text-nova-bg px-6 py-3 rounded-xl font-semibold hover:-translate-y-0.5 transition-transform"
          >
            Back to shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-nova-bg text-nova-text relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 80% 10%, rgba(109,94,245,0.14), transparent 60%)",
        }}
      />

      <header className="relative flex items-center justify-between px-6 md:px-10 py-6 border-b border-white/[0.08]">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="NEXORA" width={30} height={30} className="rounded-lg object-cover" />
          <NexoraWordmark size="text-lg" />
        </Link>
      </header>

      <section className="relative px-6 md:px-10 py-14 max-w-md mx-auto">
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-sm text-nova-muted mb-8 hover:text-nova-cyan transition-colors"
        >
          <ArrowLeft size={16} />
          Back to cart
        </Link>

        <h1 className="font-display text-3xl font-bold mb-2">Checkout</h1>
        <p className="text-nova-muted text-sm mb-8">Confirm your delivery details to complete the order.</p>

        <form onSubmit={handleCheckout} className="space-y-5">
          <div>
            <label className="text-xs font-medium text-nova-muted mb-1.5 block">Shipping address</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-3.5 text-nova-muted" />
              <textarea
                required
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl pl-10 pr-4 py-2.5 text-sm text-nova-text placeholder:text-nova-muted focus:outline-none focus:border-nova-cyan/50 resize-none transition-colors"
                placeholder="House #, Street"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-nova-muted mb-1.5 block">City</label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nova-muted" />
              <input
                required
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl pl-10 pr-4 py-2.5 text-sm text-nova-text placeholder:text-nova-muted focus:outline-none focus:border-nova-cyan/50 transition-colors"
                placeholder="e.g. Islamabad"
              />
            </div>
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-br from-nova-cyan to-nova-violet text-nova-bg py-3.5 rounded-xl font-semibold text-sm hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:translate-y-0"
          >
            {loading ? "Placing order..." : "Place order"}
          </button>
        </form>
      </section>
      <NovaFooter />
    </main>
  );
}