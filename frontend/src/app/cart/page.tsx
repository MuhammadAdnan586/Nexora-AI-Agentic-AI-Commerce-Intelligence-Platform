"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, ArrowLeft, ShoppingBag, Minus, Plus } from "lucide-react";
import { api, useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import StoreHeader from "@/components/StoreHeader";

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
    <main className="min-h-screen bg-paper">
      <StoreHeader />

      <section className="px-6 md:px-12 py-10 max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-ink/60 mb-6 hover:text-volt transition-colors">
          <ArrowLeft size={16} />
          Continue shopping
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="bg-volt/10 text-volt w-10 h-10 rounded-xl flex items-center justify-center">
            <ShoppingBag size={18} />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold leading-tight">Your Cart</h1>
            {!loading && cart && cart.items.length > 0 && (
              <p className="text-sm text-ink/50">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-ink/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !cart || cart.items.length === 0 ? (
          <div className="text-center py-20 bg-white border border-ink/10 rounded-3xl">
            <div className="bg-volt/10 text-volt w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag size={24} />
            </div>
            <p className="font-display text-lg font-bold mb-1">Your cart is empty</p>
            <p className="text-ink/50 text-sm mb-6">Looks like you haven&apos;t added anything yet.</p>
            <Link
              href="/"
              className="inline-block bg-ink text-paper px-6 py-3 rounded-full font-medium hover:bg-volt transition-colors"
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
                    className="flex items-center gap-4 bg-white border border-ink/10 rounded-2xl p-4 hover:border-ink/20 transition-colors"
                  >
                    <Link
                      href={`/products/${product.id}`}
                      className="w-20 h-20 bg-gradient-to-br from-volt/10 to-mango/10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                    >
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-display text-2xl text-volt/40">{product.name.charAt(0)}</span>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link href={`/products/${product.id}`} className="font-display font-bold hover:text-volt transition-colors line-clamp-1">
                        {product.name}
                      </Link>
                      <p className="text-sm text-ink/50 mt-0.5">${product.price.toFixed(2)} each</p>
                      <div className="flex items-center gap-2 mt-2 bg-ink/5 rounded-full w-fit px-1 py-1">
                        <span className="w-7 h-7 flex items-center justify-center text-ink/40">
                          <Minus size={12} />
                        </span>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <span className="w-7 h-7 flex items-center justify-center text-ink/40">
                          <Plus size={12} />
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-volt mb-2">
                        ${(product.price * item.quantity).toFixed(2)}
                      </p>
                      <button
                        onClick={() => removeItem(item.product_id)}
                        disabled={removingId === item.product_id}
                        className="text-ink/30 hover:text-coral transition-colors disabled:opacity-40"
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
              <div className="bg-white border border-ink/10 rounded-2xl p-6 sticky top-6">
                <h2 className="font-display font-bold text-lg mb-4">Order Summary</h2>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between text-ink/60">
                    <span>Subtotal</span>
                    <span className="font-mono">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-ink/60">
                    <span>Shipping</span>
                    <span className="text-nexora-success font-medium">Calculated at checkout</span>
                  </div>
                </div>
                <div className="border-t border-ink/10 pt-4 flex items-center justify-between mb-6">
                  <span className="font-display font-bold">Total</span>
                  <span className="font-mono text-xl font-bold text-volt">${total.toFixed(2)}</span>
                </div>
                <Link
                  href="/checkout"
                  className="block text-center bg-ink text-paper py-3.5 rounded-full font-medium hover:bg-volt transition-colors"
                >
                  Proceed to Checkout
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}