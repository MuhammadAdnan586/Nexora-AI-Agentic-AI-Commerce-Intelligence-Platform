"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, Minus, Plus, Heart, ShieldCheck, Truck, Sparkles } from "lucide-react";
import NovaHeader from "@/components/NovaHeader";
import VoiceShoppingWidget from "@/components/VoiceShoppingWidget";
import NovaFooter from "@/components/NovaFooter";
import { api, useAuth } from "@/context/AuthContext";
import MagneticButton from "@/components/MagneticButton";

interface ProductImage {
  id: number;
  image_url: string;
  sort_order: number;
}

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  compare_at_price?: number | null;
  sku: string;
  image_url?: string | null;
  images?: ProductImage[];
}

const resolveImage = (url?: string | null) => {
  if (!url) return null;
  return url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_API_URL}${url}`;
};

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    api
      .get(`/products/${id}`)
      .then((res) => {
        setProduct(res.data);
        const cover = res.data.image_url || res.data.images?.[0]?.image_url || null;
        setActiveImage(cover);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    if (!token) {
      router.push("/login");
      return;
    }
    setAdding(true);
    setMessage("");
    try {
      await api.post("/cart/add", { product_id: Number(id), quantity });
      setMessage(`Added ${quantity} to cart!`);
    } catch {
      setMessage("Could not add to cart.");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-nova-bg flex items-center justify-center">
        <p className="text-nova-muted">Loading...</p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-nova-bg flex items-center justify-center">
        <p className="text-nova-muted">Product not found.</p>
      </main>
    );
  }

  const galleryUrls: string[] = [];
  if (product.image_url) galleryUrls.push(product.image_url);
  (product.images || [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .forEach((img) => {
      if (!galleryUrls.includes(img.image_url)) galleryUrls.push(img.image_url);
    });

  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  // Deterministic "AI match" score derived from product id, purely presentational.
  const aiMatch = 90 + (product.id * 7) % 9;

  return (
    <main className="min-h-screen bg-nova-bg text-nova-text">
      <NovaHeader />
      <VoiceShoppingWidget />

      <section className="px-6 md:px-10 pt-32 pb-20 max-w-6xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-nova-muted mb-8 hover:text-nova-cyan transition-colors"
        >
          <ArrowLeft size={16} />
          Back to products
        </Link>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <div className="relative aspect-square rounded-3xl overflow-hidden mb-4 bg-nova-bg2 border border-white/[0.08] flex items-center justify-center">
              {hasDiscount && (
                <span className="absolute top-4 left-4 z-10 text-xs font-semibold px-3 py-1.5 rounded-full bg-rose-500 text-white shadow-[0_0_14px_-2px_rgba(244,63,94,0.6)]">
  -{discountPercent}%
</span>
              )}
              <span className="absolute top-4 right-4 z-10 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-nova-violet/15 text-violet-200 border border-nova-violet/25">
                <Sparkles size={12} />
                {aiMatch}% match
              </span>
              {activeImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveImage(activeImage) || ""}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-display text-8xl text-nova-muted/30">
                  {product.name.charAt(0)}
                </span>
              )}
            </div>

            {galleryUrls.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {galleryUrls.map((url) => (
                  <button
                    key={url}
                    onClick={() => setActiveImage(url)}
                    className={`w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-colors ${
                      activeImage === url ? "border-nova-cyan" : "border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveImage(url) || ""} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">{product.name}</h1>
            <p className="text-nova-muted mb-4 font-mono text-sm">SKU: {product.sku}</p>
            <p className="text-nova-muted leading-relaxed mb-7">
              {product.description || "No description available."}
            </p>

            <div className="flex items-baseline gap-3 mb-8">
              <p className="font-display text-3xl font-bold text-nova-text">${product.price.toFixed(2)}</p>
              {hasDiscount && (
                <p className="text-lg text-nova-muted line-through">${product.compare_at_price!.toFixed(2)}</p>
              )}
            </div>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-nova-muted">Quantity</span>
              <div className="flex items-center border border-white/[0.1] rounded-full overflow-hidden bg-white/[0.03]">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-nova-muted hover:text-nova-text hover:bg-white/[0.05] transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="w-12 text-center font-mono font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  className="w-10 h-10 flex items-center justify-center text-nova-muted hover:text-nova-text hover:bg-white/[0.05] transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <p className="font-mono text-sm text-nova-muted mb-7">
              Subtotal:{" "}
              <span className="text-nova-text font-bold">${(product.price * quantity).toFixed(2)}</span>
            </p>

            <div className="flex items-center gap-3 mb-6">
<MagneticButton
  onClick={handleAddToCart}
  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-br from-nova-cyan to-nova-violet text-nova-bg px-6 py-3.5 rounded-xl font-semibold w-full hover:shadow-[0_0_30px_-6px_rgba(79,227,242,0.5)] transition-shadow disabled:opacity-50"
>
  <span className="flex items-center justify-center gap-2">
    <ShoppingCart size={18} />
    {adding ? "Adding..." : `Add ${quantity} to cart`}
  </span>
</MagneticButton>
              <button
                onClick={() => setWishlisted((w) => !w)}
                className={`w-[52px] h-[52px] shrink-0 rounded-xl border flex items-center justify-center transition-colors ${
                  wishlisted
                    ? "border-pink-400/40 bg-pink-400/10 text-pink-400"
                    : "border-white/[0.1] bg-white/[0.03] text-nova-muted hover:text-nova-text"
                }`}
                aria-label="Toggle wishlist"
              >
                <Heart size={18} fill={wishlisted ? "currentColor" : "none"} />
              </button>
            </div>

            {message && <p className="text-sm text-nova-cyan font-medium mb-6">{message}</p>}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2.5 border border-white/[0.08] rounded-xl px-4 py-3 bg-white/[0.02]">
                <Truck size={16} className="text-nova-cyan shrink-0" />
                <span className="text-xs text-nova-muted">Free delivery over $50</span>
              </div>
              <div className="flex items-center gap-2.5 border border-white/[0.08] rounded-xl px-4 py-3 bg-white/[0.02]">
                <ShieldCheck size={16} className="text-nova-cyan shrink-0" />
                <span className="text-xs text-nova-muted">Secure checkout</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <NovaFooter />
    </main>
  );
}