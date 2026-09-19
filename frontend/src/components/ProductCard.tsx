"use client";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  compare_at_price?: number | null;
  sku: string;
  image_url?: string | null;
}

export default function ProductCard({ product }: { product: Product }) {
  const imageSrc = product.image_url
    ? product.image_url.startsWith("http")
      ? product.image_url
      : `${process.env.NEXT_PUBLIC_API_URL}${product.image_url}`
    : null;

  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group relative bg-white rounded-2xl border border-ink/10 overflow-hidden hover:border-volt transition-colors block"
    >
      {hasDiscount && (
        <span className="absolute top-3 left-3 z-10 bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          -{discountPercent}%
        </span>
      )}
      <div className="aspect-square bg-gradient-to-br from-volt/10 to-mango/10 flex items-center justify-center overflow-hidden">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className="font-display text-4xl text-volt/30 group-hover:text-volt/50 transition-colors">
            {product.name.charAt(0)}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg leading-tight mb-1">{product.name}</h3>
        <p className="text-sm text-ink/60 line-clamp-2 mb-3">
          {product.description || "No description available"}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasDiscount && (
              <span className="font-mono text-sm text-ink/40 line-through">
                ${product.compare_at_price!.toFixed(2)}
              </span>
            )}
            <span className="font-mono text-lg font-bold text-volt">
              ${product.price.toFixed(2)}
            </span>
          </div>
          <span className="flex items-center gap-1.5 bg-ink text-paper px-3 py-2 rounded-full text-sm font-medium group-hover:bg-volt transition-colors">
            <ShoppingCart size={14} />
            View
          </span>
        </div>
      </div>
    </Link>
  );
}