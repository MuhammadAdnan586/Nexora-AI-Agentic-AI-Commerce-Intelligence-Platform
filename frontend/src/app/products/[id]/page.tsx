"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, Minus, Plus } from "lucide-react";
import StoreHeader from "@/components/StoreHeader";
import { api, useAuth } from "@/context/AuthContext";

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
      <main className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink/50">Loading...</p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink/50">Product not found.</p>
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

  return (
    <main className="min-h-screen bg-paper">
      <StoreHeader />

      <section className="px-6 md:px-12 py-12 max-w-5xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-ink/60 mb-8 hover:text-volt">
          <ArrowLeft size={16} />
          Back to products
        </Link>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <div className="aspect-square bg-gradient-to-br from-volt/10 to-mango/10 rounded-3xl flex items-center justify-center overflow-hidden mb-4">
              {activeImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveImage(activeImage) || ""}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-display text-8xl text-volt/30">
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
                      activeImage === url ? "border-volt" : "border-ink/10 hover:border-ink/30"
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
            <p className="text-ink/60 mb-2 font-mono text-sm">SKU: {product.sku}</p>
            <p className="text-ink/70 mb-6">{product.description || "No description available."}</p>
            <p className="font-mono text-3xl font-bold text-volt mb-8">
              ${product.price.toFixed(2)}
            </p>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-ink/70">Quantity</span>
              <div className="flex items-center border border-ink/15 rounded-full overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-ink/60 hover:bg-ink/5 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="w-12 text-center font-mono font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  className="w-10 h-10 flex items-center justify-center text-ink/60 hover:bg-ink/5 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <p className="font-mono text-sm text-ink/50 mb-6">
              Subtotal: <span className="text-ink font-bold">${(product.price * quantity).toFixed(2)}</span>
            </p>

            <button
              onClick={handleAddToCart}
              disabled={adding}
              className="flex items-center gap-2 bg-ink text-paper px-6 py-3 rounded-full font-medium hover:bg-volt transition-colors disabled:opacity-50"
            >
              <ShoppingCart size={18} />
              {adding ? "Adding..." : `Add ${quantity} to Cart`}
            </button>

            {message && <p className="mt-4 text-sm text-volt font-medium">{message}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}