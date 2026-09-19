"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, ArrowLeft, ShoppingBag, Minus, Plus } from "lucide-react";
import { api, useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import NovaHeader from "@/components/NovaHeader";
import NovaFooter from "@/components/NovaFooter";

interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
}

interface Cart {
  id: number;
  user_id: number;
  items: CartItem[];
}

interface Product {
  id: number;
  name: string;
  price: number;
  image_url?: string | null;
}

const resolveImage = (url?: string | null) => {
  if (!url) return null;
  return url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_API_URL}${url}`;
};

export default function CartPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [products, setProducts] = useState<Record<number, Product>>({});
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadCart = async () => {
    setLoading(true);
    try {
      const cartRes = await api.get("/cart/");
      setCart(cartRes.data);

      const productMap: Record<number, Product> = {};
      await Promise.all(
        cartRes.data.items.map(async (item: CartItem) => {
          const res = await api.get(`/products/${item.product_id}`);
          productMap[item.product_id] = res.data;
        })
      );
      setProducts(productMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (productId: number) => {
    setRemovingId(productId);
    try {
      await api.delete(`/cart/remove/${productId}`);
      await loadCart();
    } finally {
      setRemovingId(null);
    }
  };

  const total =
    cart?.items.reduce((sum, item) => {
      const product = products[item.product_id];
      return sum + (product ? product.price * item.quantity : 0);
    }, 0) ?? 0;

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <main className="min-h-screen bg-nova-bg text-nova-text">
      <NovaHeader />

      <section className="px-6 md:px-10 pt-32 pb-20 max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-nova-muted mb-6 hover:text-nova-cyan transition-colors"
        >
          <ArrowLeft size={16} />
          Continue shopping
        </Link>

        <div className="flex items-center gap-3 mb-9">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-nova-cyan/10 text-nova-cyan border border-nova-cyan/20">
            <ShoppingBag size={18} />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold leading-tight">Your cart</h1>
            {!loading && cart && cart.items.length > 0 && (
              <p className="text-sm text-nova-muted">
                {itemCount} item{itemCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white/[0.03] border border-white/[0.06] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !cart || cart.items.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.03] border border-white/[0.08] rounded-3xl">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-nova-cyan/10 text-nova-cyan border border-nova-cyan/20">
              <ShoppingBag size={24} />
            </div>
            <p className="font-display text-lg font-bold mb-1">Your cart is empty</p>
            <p className="text-nova-muted text-sm mb-6">Looks like you haven&apos;t added anything yet.</p>
            <Link
              href="/"
              className="inline-block bg-gradient-to-br from-nova-cyan to-nova-violet text-nova-bg px-6 py-3 rounded-xl font-semibold hover:-translate-y-0.5 transition-transform"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Items list */}
            <div className="lg:col-span-2 space-y-3">
              {cart.items.map((item) => {
                const product = products[item.product_id];
                if (!product) return null;
                const img = resolveImage(product.image_url);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 hover:border-white/[0.16] transition-colors"
                  >
                    <Link
                      href={`/products/${product.id}`}
                      className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-nova-bg2"
                    >
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-display text-2xl text-nova-muted/40">
                          {product.name.charAt(0)}
                        </span>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${product.id}`}
                        className="font-display font-bold hover:text-nova-cyan transition-colors line-clamp-1"
                      >
                        {product.name}
                      </Link>
                      <p className="text-sm text-nova-muted mt-0.5">${product.price.toFixed(2)} each</p>
                      <div className="flex items-center gap-2 mt-2 bg-white/[0.05] border border-white/[0.06] rounded-full w-fit px-1 py-1">
                        <span className="w-7 h-7 flex items-center justify-center text-nova-muted/60">
                          <Minus size={12} />
                        </span>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <span className="w-7 h-7 flex items-center justify-center text-nova-muted/60">
                          <Plus size={12} />
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-display font-bold text-nova-cyan mb-2">
                        ${(product.price * item.quantity).toFixed(2)}
                      </p>
                      <button
                        onClick={() => removeItem(item.product_id)}
                        disabled={removingId === item.product_id}
                        className="text-nova-muted/50 hover:text-rose-400 transition-colors disabled:opacity-40"
                        aria-label="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order summary */}
            <div className="lg:col-span-1">
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 sticky top-28">
                <h2 className="font-display font-bold text-lg mb-4">Order summary</h2>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between text-nova-muted">
                    <span>Subtotal</span>
                    <span className="font-mono text-nova-text">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-nova-muted">
                    <span>Shipping</span>
                    <span className="text-emerald-400 font-medium">Calculated at checkout</span>
                  </div>
                </div>
                <div className="border-t border-white/[0.08] pt-4 flex items-center justify-between mb-6">
                  <span className="font-display font-bold">Total</span>
                  <span className="font-display text-xl font-bold text-nova-cyan">${total.toFixed(2)}</span>
                </div>
                <Link
                  href="/checkout"
                  className="block text-center bg-gradient-to-br from-nova-cyan to-nova-violet text-nova-bg py-3.5 rounded-xl font-semibold hover:-translate-y-0.5 transition-transform"
                >
                  Proceed to checkout
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>
      <NovaFooter />
    </main>
  );
}