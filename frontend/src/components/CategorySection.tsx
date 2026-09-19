"use client";
import { useRouter } from "next/navigation";

interface Category {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
}

const GLOW_COLORS = ["#22D3EE", "#6D5EF5", "#F17FA6", "#7CF29B"];

const resolveImage = (url?: string | null) => {
  if (!url) return null;
  return url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_API_URL}${url}`;
};

export default function CategorySection({
  categories,
  countFor,
}: {
  categories: Category[];
  countFor: (id: number) => number;
}) {
  const router = useRouter();
  if (categories.length === 0) return null;

  return (
    <section id="categories" className="py-20 px-6 md:px-10 max-w-7xl mx-auto">
      <div className="mb-10">
        <h2 className="font-display text-3xl font-semibold text-nova-text mb-2">Shop by collection</h2>
        <p className="text-nova-muted text-sm max-w-md">Browse categories curated and ranked by Nexora intelligence.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {categories.map((cat, i) => {
          const img = resolveImage(cat.image_url);
          return (
            <button
              key={cat.id}
              onClick={() => router.push(`/?category=${cat.id}#products`)}
              className="text-left relative rounded-[18px] h-[190px] bg-nova-bg2 border border-white/[0.08] hover:border-white/[0.18] hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col justify-end"
            >
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-80 transition-opacity"
                />
              ) : (
                <div
                  className="absolute w-40 h-40 rounded-full -top-16 -right-16 blur-3xl opacity-35"
                  style={{ background: GLOW_COLORS[i % GLOW_COLORS.length] }}
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-nova-bg via-nova-bg/40 to-transparent" />

              <div className="relative z-10 p-6">
                <p className="font-display text-lg font-semibold text-nova-text mb-1">{cat.name}</p>
                <span className="text-xs text-nova-muted">{countFor(cat.id)} products</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}