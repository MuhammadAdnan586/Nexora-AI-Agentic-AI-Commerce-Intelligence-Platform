"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Heart, ShoppingBag, User, LogOut, Menu, X, ChevronDown } from "lucide-react";
import { api, useAuth } from "@/context/AuthContext";
import NexoraWordmark from "@/components/NexoraWordmark";
interface Category {
  id: number;
  name: string;
}

const NAV_LINKS = [
  { label: "Collections", href: "#categories" },
  { label: "AI Assistant", href: "#atlas" },
  { label: "Smart Deals", href: "#deals" },
];

export default function NovaHeader() {
  const { token, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const shopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    api.get("/categories/").then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shopRef.current && !shopRef.current.contains(e.target as Node)) {
        setShopOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      window.location.href = `/?search=${encodeURIComponent(search.trim())}`;
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || mobileOpen ? "bg-nova-bg/85 backdrop-blur-xl border-b border-white/10" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-[72px] flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setMobileOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="NEXORA" width={36} height={36} className="rounded-lg object-cover" />
          <NexoraWordmark size="text-lg" className="text-nova-text" />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-nova-muted">
          <div className="relative" ref={shopRef}>
            <button
              onClick={() => setShopOpen((v) => !v)}
              className="flex items-center gap-1.5 hover:text-nova-text transition-colors"
            >
              Shop
              <ChevronDown size={14} className={`transition-transform ${shopOpen ? "rotate-180" : ""}`} />
            </button>

            <div
              className={`absolute top-full left-1/2 -translate-x-1/2 pt-3 transition-all duration-200 ${
                shopOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"
              }`}
            >
              <div className="w-56 rounded-2xl bg-nova-bg2/95 backdrop-blur-xl border border-white/10 shadow-2xl p-2">
                <Link
                  href="/"
                  onClick={() => setShopOpen(false)}
                  className="block px-3.5 py-2.5 rounded-xl text-sm text-nova-text font-medium hover:bg-white/[0.06] transition-colors"
                >
                  All products
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/?category=${c.id}#products`}
                    onClick={() => setShopOpen(false)}
                    className="block px-3.5 py-2.5 rounded-xl text-sm text-nova-muted hover:text-nova-text hover:bg-white/[0.06] transition-colors"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} className="hover:text-nova-text transition-colors">
              {link.label}
            </a>
          ))}
        </nav>

        <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-xs">
          <div className="flex w-full items-center bg-white/5 border border-white/10 rounded-full overflow-hidden focus-within:border-nova-cyan/50 transition-colors">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="flex-1 bg-transparent px-4 py-2 text-sm text-nova-text placeholder:text-nova-muted focus:outline-none"
            />
            <button type="submit" className="px-3 text-nova-muted hover:text-nova-cyan transition-colors" aria-label="Search">
              <Search size={16} />
            </button>
          </div>
        </form>

        <div className="flex items-center gap-5 shrink-0">
          <button className="lg:hidden text-nova-muted hover:text-nova-text transition-colors" aria-label="Search">
            <Search size={18} />
          </button>
          <Link href="/account" className="hidden sm:block text-nova-muted hover:text-nova-text transition-colors" aria-label="Wishlist">
            <Heart size={18} />
          </Link>
          <Link href="/cart" className="text-nova-muted hover:text-nova-text transition-colors" aria-label="Cart">
            <ShoppingBag size={18} />
          </Link>
          {token ? (
            <button onClick={() => logout()} className="hidden sm:flex w-8 h-8 rounded-full bg-white/5 border border-white/10 items-center justify-center hover:border-nova-cyan/50 transition-colors text-nova-text" aria-label="Log out">
              <LogOut size={14} />
            </button>
          ) : (
            <Link
              href="/login"
              className="hidden sm:flex w-8 h-8 rounded-full bg-white/5 border border-white/10 items-center justify-center hover:border-nova-cyan/50 transition-colors text-nova-text"
              aria-label="Account"
            >
              <User size={15} />
            </Link>
          )}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden text-nova-text"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      <div
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out border-t border-white/10 ${
          mobileOpen ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-6 py-5 flex flex-col gap-5 overflow-y-auto max-h-[80vh]">
          <form onSubmit={handleSearch} className="flex items-center bg-white/5 border border-white/10 rounded-full overflow-hidden focus-within:border-nova-cyan/50 transition-colors">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="flex-1 bg-transparent px-4 py-2.5 text-sm text-nova-text placeholder:text-nova-muted focus:outline-none"
            />
            <button type="submit" className="px-4 text-nova-muted hover:text-nova-cyan transition-colors" aria-label="Search">
              <Search size={16} />
            </button>
          </form>

          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-nova-muted uppercase tracking-wide mb-1">Shop</p>
            <Link href="/" onClick={() => setMobileOpen(false)} className="py-2 text-sm text-nova-text hover:text-nova-cyan transition-colors">
              All products
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/?category=${c.id}#products`}
                onClick={() => setMobileOpen(false)}
                className="py-2 text-sm text-nova-muted hover:text-nova-cyan transition-colors"
              >
                {c.name}
              </Link>
            ))}
          </div>

          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="py-2.5 text-sm text-nova-text border-t border-white/5 hover:text-nova-cyan transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3 pt-2">
            <Link
              href="/account"
              onClick={() => setMobileOpen(false)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-nova-text"
            >
              <Heart size={15} />
              Wishlist
            </Link>
            {token ? (
              <button
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-nova-text"
              >
                <LogOut size={15} />
                Log out
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-br from-nova-cyan to-nova-violet text-nova-bg text-sm font-semibold"
              >
                <User size={15} />
                Log in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}