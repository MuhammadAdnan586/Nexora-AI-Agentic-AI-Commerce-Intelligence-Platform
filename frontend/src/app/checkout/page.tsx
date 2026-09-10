"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, ArrowLeft, CheckCircle2 } from "lucide-react";
import { api, useAuth } from "@/context/AuthContext";

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
      <main className="min-h-screen bg-paper flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="bg-volt/10 text-volt w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="font-display text-3xl font-bold mb-3">Order placed!</h1>
          <p className="text-ink/60 mb-8">
            Your order <span className="font-mono text-ink">#{orderId}</span> has been confirmed.
          </p>
          <Link
            href="/"
            className="inline-block bg-ink text-paper px-6 py-3 rounded-full font-medium hover:bg-volt transition-colors"
          >
            Back to shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="flex items-center justify-between px-6 md:px-12 py-6 border-b border-ink/10">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-volt text-paper w-8 h-8 rounded-lg flex items-center justify-center">
            <Zap size={18} fill="currentColor" />
          </div>
          <span className="font-display text-xl font-bold">Volt</span>
        </Link>
      </header>

      <section className="px-6 md:px-12 py-12 max-w-md mx-auto">
        <Link href="/cart" className="inline-flex items-center gap-2 text-sm text-ink/60 mb-8 hover:text-volt">
          <ArrowLeft size={16} />
          Back to cart
        </Link>

        <h1 className="font-display text-3xl font-bold mb-8">Checkout</h1>

        <form onSubmit={handleCheckout} className="space-y-4">
<div>
            <label className="text-sm font-medium mb-1.5 block">Shipping address</label>
            <textarea
              required
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border border-ink/15 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-volt resize-none"
              placeholder="House #, Street"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">City</label>
            <input
              required
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full border border-ink/15 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-volt"
              placeholder="e.g. Islamabad"
            />
          </div>

          {error && <p className="text-coral text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-paper py-3.5 rounded-full font-medium hover:bg-volt transition-colors disabled:opacity-50"
          >
            {loading ? "Placing order..." : "Place Order"}
          </button>
        </form>
      </section>
    </main>
  );
}