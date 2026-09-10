"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Truck, HeadphonesIcon, ShieldCheck, BadgeCheck, Flame } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import StoreHeader from "@/components/StoreHeader";
import VoiceShoppingWidget from "@/components/VoiceShoppingWidget";
import { api } from "@/context/AuthContext";

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
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

const resolveImage = (url?: string | null) => {
  if (!url) return null;
  return url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_API_URL}${url}`;
};

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

  const filteredProducts = useMemo(() => {
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
  }, [products, activeCategory, searchTerm]);

  const setCategory = (id: number | "all") => {
    if (id === "all") {
      router.push("/");
    } else {
      router.push(`/?category=${id}`);
    }
  };

  const clearFilters = () => router.push("/");

  const productCountFor = (categoryId: number) =>
    products.filter((p) => p.category_id === categoryId).length;

  const newestIds = useMemo(
    () => [...products].sort((a, b) => b.id - a.id).slice(0, 3).map((p) => p.id),
    [products]
  );

  const sideDealProducts = products.slice(1, 3);
  const dealOfDayProducts = products.slice(0, 4);

  const activeCategoryName =
    activeCategory !== "all" ? categories.find((c) => c.id === activeCategory)?.name : null;

  return (
    <main className="min-h-screen bg-paper">
      <StoreHeader />
      <VoiceShoppingWidget />

      {/* Hero + side deal banners */}
      <section className="px-6 md:px-12 py-8 max-w-7xl mx-auto grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-ink rounded-3xl p-8 md:p-10 text-paper relative overflow-hidden min-h-[280px] flex flex-col justify-center">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-volt/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-10 w-56 h-56 bg-mango/20 rounded-full blur-3xl" />
          <span className="relative z-10 inline-block bg-mango/20 text-mango px-3 py-1 rounded-full text-xs font-mono font-semibold mb-4 w-fit">
            POWERED BY AI
          </span>
          <h1 className="relative z-10 font-display text-4xl md:text-5xl font-bold leading-[1.05] mb-4 max-w-lg">
            Shopping that <span className="text-mango">thinks ahead.</span>
          </h1>
          <p className="relative z-10 text-paper/70 max-w-md mb-6">
            Smart recommendations, real-time inventory, and a checkout that gets out of your way.
          </p>
          <Link
            href="#products"
            className="relative z-10 inline-block bg-volt text-white px-6 py-3 rounded-full font-medium hover:bg-volt-dark transition-colors w-fit"
          >
            Shop now
          </Link>
        </div>

        <div className="grid grid-rows-2 gap-5">
          {sideDealProducts.length > 0 ? (
            sideDealProducts.map((p, i) => {
              const img = resolveImage(p.image_url);
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className={`rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[125px] group ${
                    i === 0 ? "bg-volt" : "bg-ink"
                  }`}
                >
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={p.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity"
                    />
                  )}
                  <span className="relative z-10 bg-coral text-white text-[10px] font-bold px-2 py-1 rounded-full w-fit">
                    DEAL
                  </span>
                  <div className="relative z-10">
                    <p className="text-paper font-display font-bold text-sm leading-tight mb-1 group-hover:text-mango transition-colors">
                      {p.name}
                    </p>
                    <p className="text-paper/70 text-xs">${p.price.toFixed(2)}</p>
                  </div>
                </Link>
              );
            })
          ) : (
            <>
              <div className="rounded-2xl bg-volt p-5 flex items-center justify-center text-paper/60 text-sm">No deals yet</div>
              <div className="rounded-2xl bg-ink p-5 flex items-center justify-center text-paper/60 text-sm">No deals yet</div>
            </>
          )}
        </div>
      </section>

      {/* Trust badges */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto mb-10">
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { icon: Truck, label: "Free delivery", sub: "On orders over $50" },
            { icon: HeadphonesIcon, label: "Support 24/7", sub: "Always here to help" },
            { icon: ShieldCheck, label: "Secure payment", sub: "100% protected" },
            { icon: BadgeCheck, label: "Guarantee", sub: "Quality assured" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 border border-ink/10 rounded-2xl px-4 py-4">
              <div className="bg-volt/10 text-volt w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                <item.icon size={18} />
              </div>
              <div>
                <p className="font-display font-bold text-sm">{item.label}</p>
                <p className="text-xs text-ink/50">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Category strip */}
      {!loading && categories.length > 0 && (
        <section className="px-6 md:px-12 py-6 max-w-7xl mx-auto">
          <h2 className="font-display text-xl font-bold mb-5">Shop by category</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
            <button
              onClick={() => setCategory("all")}
              className="shrink-0 flex flex-col items-center gap-2 w-24 group"
            >
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center border-2 transition-colors ${
                  activeCategory === "all"
                    ? "border-volt bg-volt/10 text-volt"
                    : "border-ink/10 bg-ink/[0.03] text-ink/50 group-hover:border-ink/30"
                }`}
              >
                <span className="font-display text-lg font-bold">All</span>
              </div>
              <span className={`text-xs font-medium ${activeCategory === "all" ? "text-volt" : "text-ink/60"}`}>All</span>
            </button>

            {categories.map((cat) => {
              const img = resolveImage(cat.image_url);
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className="shrink-0 flex flex-col items-center gap-2 w-24 group"
                >
                  <div
                    className={`w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden border-2 transition-colors ${
                      activeCategory === cat.id ? "border-volt" : "border-transparent group-hover:border-ink/20"
                    } ${!img ? "bg-gradient-to-br from-volt/15 to-mango/15" : "bg-ink/[0.03]"}`}
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display text-2xl font-bold text-ink/40">{cat.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className={`text-xs font-medium text-center line-clamp-1 ${activeCategory === cat.id ? "text-volt" : "text-ink/60"}`}>
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-ink/40">{productCountFor(cat.id)} items</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Deal of the day */}
      {activeCategory === "all" && !searchTerm && dealOfDayProducts.length > 0 && (
        <section className="px-6 md:px-12 py-10 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-5">
            <div className="bg-coral/10 text-coral w-8 h-8 rounded-full flex items-center justify-center">
              <Flame size={16} />
            </div>
            <h2 className="font-display text-xl font-bold">Deal of the Day</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {dealOfDayProducts.map((p) => (
              <div key={p.id} className="relative">
                <span className="absolute top-3 left-3 z-10 bg-coral text-white text-[10px] font-bold px-2 py-1 rounded-full">
                  SALE
                </span>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Products */}
      <section id="products" className="px-6 md:px-12 py-10 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold">
            {searchTerm
              ? `Search results for "${searchTerm}"`
              : activeCategoryName || "Featured Products"}
          </h2>
          {(activeCategory !== "all" || searchTerm) && (
            <button onClick={clearFilters} className="text-sm font-medium text-ink/60 hover:text-volt">
              Clear filter
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-ink/50">Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-ink/50">No products found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredProducts.map((product) => (
              <div key={product.id} className="relative">
                {newestIds.includes(product.id) && (
                  <span className="absolute top-3 left-3 z-10 bg-volt text-white text-[10px] font-bold px-2 py-1 rounded-full">
                    NEW
                  </span>
                )}
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-ink/10 px-6 md:px-12 py-8 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink/50">
          <p>&copy; {new Date().getFullYear()} NEXORA. All rights reserved.</p>
          <p>Powered by AI-driven commerce.</p>
        </div>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <HomeContent />
    </Suspense>
  );
}