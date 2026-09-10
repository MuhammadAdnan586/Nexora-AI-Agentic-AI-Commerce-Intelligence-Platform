"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  RotateCcw,
  Users,
  Warehouse,
  Truck,
  BarChart3,
  Sparkles,
  TrendingUp,
  CloudRain,
  ShieldAlert,
  AlertTriangle,
  Tag,
  CheckSquare,
  Megaphone,
  Bot,
  Mic,
  LogOut,
  UserPlus,
  MessageSquare,
  Zap,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/returns", label: "Returns", icon: RotateCcw },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/inventory", label: "Inventory", icon: Warehouse },
  { href: "/admin/suppliers", label: "Suppliers", icon: Truck },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/intelligence", label: "Intelligence", icon: Sparkles },
  { href: "/admin/forecast", label: "Forecast", icon: TrendingUp },
  { href: "/admin/weather", label: "Weather", icon: CloudRain },
  { href: "/admin/inventory-intelligence", label: "Stock Health", icon: ShieldAlert },
  { href: "/admin/pricing", label: "Pricing", icon: Tag },
  { href: "/admin/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/admin/copilot", label: "Copilot", icon: Bot },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
  { href: "/admin/voice", label: "Voice AI", icon: Mic },
  { href: "/admin/risk", label: "Risk & Fraud", icon: AlertTriangle },
  { href: "/admin/warehouse-staff", label: "Warehouse Staff", icon: UserPlus },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-nexora-bg text-nexora-text flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-nexora-border flex flex-col">
        <div className="flex items-center gap-2.5 px-6 py-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="NEXORA" width={36} height={36} className="rounded-lg object-cover" />
          <div>
            <p className="font-display font-bold text-sm leading-tight">NEXORA</p>
            <p className="text-xs text-nexora-muted leading-tight">Operations</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-nexora-primary/15 text-nexora-primary"
                    : "text-nexora-muted hover:bg-nexora-surface hover:text-nexora-text"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3">
          <a
            href="/warehouse/login"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-nexora-muted hover:bg-nexora-surface hover:text-nexora-text transition-colors"
          >
            <ExternalLink size={18} />
            Warehouse Portal
          </a>
        </div>

        <div className="px-6 py-4 border-t border-nexora-border">
          <div className="flex items-center gap-2 text-xs text-nexora-muted">
            <span className="w-2 h-2 rounded-full bg-nexora-success" />
            All systems operational
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="border-b border-nexora-border px-8 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-nexora-muted">Good to see you</p>
            <p className="font-display font-bold">Admin Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                logout(true);
                router.push("/admin/login");
              }}
              className="text-nexora-muted hover:text-nexora-danger transition-colors"
            >
              <LogOut size={18} />
            </button>
            <div className="w-9 h-9 rounded-full bg-nexora-surface border border-nexora-border flex items-center justify-center text-sm font-medium">
              A
            </div>
          </div>
        </header>

        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}