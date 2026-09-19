import { TrendingUp, Tag, PackageSearch, Sparkles } from "lucide-react";

const INSIGHTS = [
  {
    title: "Demand forecasting",
    text: "Demand for top categories is projected to rise this quarter based on browsing trends.",
    color: "#22D3EE",
    Icon: TrendingUp,
  },
  {
    title: "Smart pricing",
    text: "Prices are checked against live market signals to keep every listing competitive.",
    color: "#6D5EF5",
    Icon: Tag,
  },
  {
    title: "Inventory intelligence",
    text: "Low-stock items are flagged automatically before they run out.",
    color: "#F59E0B",
    Icon: PackageSearch,
  },
  {
    title: "Personalized picks",
    text: "Recommendations refresh daily from your browsing and purchase behavior.",
    color: "#F17FA6",
    Icon: Sparkles,
  },
];

export default function SmartInsights() {
  return (
    <section id="atlas" className="py-20 px-6 md:px-10 max-w-7xl mx-auto">
      <div className="mb-10">
        <h2 className="font-display text-3xl font-semibold text-nova-text mb-2">Powered by intelligence</h2>
        <p className="text-nova-muted text-sm max-w-md">Nexora reads demand, pricing and inventory signals so you don&apos;t have to.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {INSIGHTS.map((item) => (
          <div
            key={item.title}
            className="rounded-[18px] p-6 bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.16] hover:-translate-y-1 transition-all duration-300"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
              style={{ background: `${item.color}1F`, color: item.color }}
            >
              <item.Icon size={20} strokeWidth={2} />
            </div>
            <p className="text-[15px] font-semibold text-nova-text mb-2">{item.title}</p>
            <p className="text-[13px] text-nova-muted leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}