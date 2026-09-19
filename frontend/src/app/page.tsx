"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import NovaHeader from "@/components/NovaHeader";
import Hero3D from "@/components/Hero3D";
import NovaProductCard from "@/components/NovaProductCard";
import CategorySection from "@/components/CategorySection";
import SmartInsights from "@/components/SmartInsights";
import VoiceShoppingWidget from "@/components/VoiceShoppingWidget";
import NovaFooter from "@/components/NovaFooter";
import { api } from "@/context/AuthContext";
import MagneticButton from "@/components/MagneticButton";

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  compare_at_price?: number | null;
  sku: string;
  category_id: number | null;
  image_url?: string | null;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryParam = searchParams.get("category");
  const searchTerm = searchParams.get("search") || "";
  const activeCategory: number | "all" = categoryParam ? parseInt(categoryParam) : "all";

  useEffect(() => {
    Promise.all([api.get("/products/?limit=100"), api.get("/categories/")])
      .then(([prodRes, catRes]) => {
        setProducts(prodRes.data);
        setCategories(catRes.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const [atlasFilterIds, setAtlasFilterIds] = useState<number[] | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ids = (e as CustomEvent<number[]>).detail;
      setAtlasFilterIds(ids);
      setTimeout(() => {
        document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };
    window.addEventListener("nexora-atlas-products", handler);
    return () => window.removeEventListener("nexora-atlas-products", handler);
  }, []);

  const filteredProducts = useMemo(() => {
    if (atlasFilterIds && atlasFilterIds.length > 0) {
      return atlasFilterIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p));
    }
    let result = products;
    if (activeCategory !== "all") {
      result = result.filter((p) => p.category_id === activeCategory);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.description || "").toLowerCase().includes(term)
      );
    }
    return result;
  }, [products, activeCategory, searchTerm, atlasFilterIds]);

  const clearFilters = () => router.push("/");
  const countFor = (id: number) => products.filter((p) => p.category_id === id).length;

  const dealProducts = useMemo(
    () => products.filter((p) => p.compare_at_price && p.compare_at_price > p.price).slice(0, 3),
    [products]
  );

  const activeCategoryName =
    activeCategory !== "all" ? categories.find((c) => c.id === activeCategory)?.name : null;

  return (
    <main className="min-h-screen bg-nova-bg text-nova-text">
      <NovaHeader />
      <VoiceShoppingWidget />

      <section className="relative min-h-screen flex items-center pt-28 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 78% 32%, rgba(109,94,245,0.16), transparent 60%), radial-gradient(ellipse 50% 45% at 15% 75%, rgba(34,211,238,0.10), transparent 60%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 md:px-10 grid lg:grid-cols-2 gap-10 items-center w-full">
          <div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-nova-muted mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-nova-cyan animate-pulse" />
              ATLAS intelligence is now live
            </span>
            <h1 className="font-display text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight mb-6 max-w-xl">
              The future of{" "}
              <span className="bg-gradient-to-r from-nova-cyan to-nova-violet bg-clip-text text-transparent">
                intelligent commerce
              </span>
            </h1>
            <p className="text-nova-muted text-lg leading-relaxed max-w-md mb-9">
              Discover products curated by AI, optimized for you, and priced by real-time market intelligence.
            </p>
            <div className="flex flex-wrap gap-4 mb-12">
              <MagneticButton
                    as="a"
                    href="#products"
                    className="px-7 py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-br from-nova-cyan to-nova-violet text-nova-bg inline-block hover:shadow-[0_0_30px_-6px_rgba(79,227,242,0.5)] transition-shadow"
                  >
                    Explore collection
              </MagneticButton>
                  <MagneticButton
                    as="a"
                    href="#atlas"
                    onClick={() => document.getElementById("atlas-fab-trigger")?.click()}
                    className="px-7 py-3.5 rounded-xl font-semibold text-sm bg-white/[0.03] border border-white/[0.08] inline-block hover:border-white/20 transition-colors"
                  >
                    Meet ATLAS
                  </MagneticButton>
            </div>
            <div className="flex gap-10">
              <div>
                <p className="font-display text-2xl font-bold">2.4M+</p>
                <p className="text-xs text-nova-muted mt-1">Products curated</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold">98%</p>
                <p className="text-xs text-nova-muted mt-1">Match accuracy</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold">24/7</p>
                <p className="text-xs text-nova-muted mt-1">AI assistance</p>
              </div>
            </div>
          </div>
          <div className="relative h-[420px] lg:h-[560px]">
            <Hero3D />
          </div>
        </div>
      </section>

      <section id="products" className="py-20 px-6 md:px-10 max-w-7xl mx-auto">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
          <div>
            <h2 className="font-display text-3xl font-semibold mb-2">
              {atlasFilterIds
                ? "ATLAS found these for you"
                : searchTerm
                ? `Results for "${searchTerm}"`
                : activeCategoryName || "AI recommended for you"}
            </h2>
            <p className="text-nova-muted text-sm max-w-md">
              Products selected by Nexora intelligence, ranked by fit, price and demand.
            </p>
          </div>
          {(activeCategory !== "all" || searchTerm || atlasFilterIds) && (
            <button
              onClick={() => {
                setAtlasFilterIds(null);
                clearFilters();
              }}
              className="text-sm text-nova-muted hover:text-nova-cyan transition-colors"
            >
              {atlasFilterIds ? "Show all products" : "Clear filter"}
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-nova-muted">Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-nova-muted">No products found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {filteredProducts.map((product) => (
              <NovaProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <CategorySection categories={categories} countFor={countFor} />
      <SmartInsights />

      {dealProducts.length > 0 && (
        <section id="deals" className="py-20 px-6 md:px-10 max-w-7xl mx-auto">
          <div className="mb-10">
            <h2 className="font-display text-3xl font-semibold mb-2">Smart deals</h2>
            <p className="text-nova-muted text-sm max-w-md">Prices adjusted in real time as market conditions shift.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {dealProducts.map((p) => {
              const savePct = Math.round(((p.compare_at_price! - p.price) / p.compare_at_price!) * 100);
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="rounded-[20px] p-6 bg-gradient-to-br from-nova-cyan/[0.07] via-nova-violet/[0.05] to-transparent border border-white/[0.08] hover:border-white/[0.18] transition-colors block"
                >
                  <span className="inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full bg-nova-violet/15 text-violet-200 border border-nova-violet/25 mb-4">
                    AI smart price
                  </span>
                  <p className="text-base font-semibold mb-1">{p.name}</p>
                  <div className="flex items-baseline gap-2.5 mt-3 mb-1">
                    <span className="font-display text-2xl font-bold text-nova-cyan">${p.price.toFixed(2)}</span>
                    <span className="text-sm text-nova-muted line-through">${p.compare_at_price!.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-emerald-400">Save {savePct}%</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <NovaFooter />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-nova-bg" />}>
      <HomeContent />
    </Suspense>
  );
}