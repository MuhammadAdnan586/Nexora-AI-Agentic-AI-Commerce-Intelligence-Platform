"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ShoppingCart, Heart } from "lucide-react";

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  compare_at_price?: number | null;
  sku: string;
  image_url?: string | null;
}

const resolveImage = (url?: string | null) => {
  if (!url) return null;
  return url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_API_URL}${url}`;
};

export default function NovaProductCard({ product }: { product: Product }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [transform, setTransform] = useState("");
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

  const img = resolveImage(product.image_url);
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const percentX = x / rect.width;
    const percentY = y / rect.height;

    const maxTilt = 8;
    const rotateY = (percentX - 0.5) * maxTilt * 2;
    const rotateX = (0.5 - percentY) * maxTilt * 2;

    setTransform(
      `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
    );
    setGlowPos({ x: percentX * 100, y: percentY * 100 });
  };

  const handleMouseLeave = () => {
    setTransform("perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
  };

  return (
    <Link
      ref={cardRef}
      href={`/products/${product.id}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform: transform || undefined, transition: transform ? "transform 60ms linear" : "transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1)" }}
      className="group relative rounded-2xl sm:rounded-[20px] p-3 sm:p-5 bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.16] hover:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] block will-change-transform"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(79,227,242,0.12), transparent 60%)`,
        }}
      />

      <div className="relative h-[110px] sm:h-[150px] rounded-xl sm:rounded-2xl mb-3 sm:mb-4 overflow-hidden bg-nova-bg2 flex items-center justify-center">
        {hasDiscount && (
          <span className="absolute top-2.5 right-2.5 z-10 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-rose-500 text-white shadow-[0_0_12px_-2px_rgba(244,63,94,0.6)]">
  -{discountPercent}%
</span>
        )}
        <button
          onClick={(e) => e.preventDefault()}
          className="absolute top-2.5 left-2.5 z-10 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center text-nova-muted hover:text-pink-400 transition-colors"
          aria-label="Add to wishlist"
        >
          <Heart size={14} />
        </button>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <span className="font-display text-3xl text-nova-muted/40">{product.name.charAt(0)}</span>
        )}
      </div>

      <h3 className="relative text-[13px] sm:text-[15px] font-semibold text-nova-text mb-1 leading-tight line-clamp-1">{product.name}</h3>
      <p className="relative text-[11px] sm:text-xs text-nova-muted/80 line-clamp-2 mb-3 sm:mb-4 leading-relaxed hidden sm:block">
        {product.description || "No description available"}
      </p>

      <div className="relative flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          {hasDiscount && (
            <span className="text-xs text-nova-muted line-through">${product.compare_at_price!.toFixed(2)}</span>
          )}
          <span className="font-display text-sm sm:text-lg font-bold text-nova-text">${product.price.toFixed(2)}</span>
        </div>
        <span className="w-9 h-9 rounded-[11px] border border-white/10 bg-white/[0.03] flex items-center justify-center text-nova-text group-hover:bg-gradient-to-br group-hover:from-nova-cyan group-hover:to-nova-violet group-hover:text-nova-bg group-hover:border-transparent transition-all">
          <ShoppingCart size={15} />
        </span>
      </div>
    </Link>
  );
}