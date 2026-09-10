"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Heart, ShoppingBag, User, LogOut, Phone, Truck } from "lucide-react";
import { api, useAuth } from "@/context/AuthContext";

interface Category {
  id: number;
  name: string;
}

export default function StoreHeader() {
  const { token, logout } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/categories/").then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      window.location.href = `/?search=${encodeURIComponent(search.trim())}`;
    }
  };

  return (
    <div className="border-b border-ink/10">
      {/* Top utility bar */}
      <div className="hidden md:flex items-center justify-between px-6 md:px-12 py-2 bg-ink text-paper/80 text-xs">
        <div className="flex items-center gap-2">
          <Truck size={13} />
          <span>Free shipping on orders over $50</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone size={13} />
          <span>Call us: +923199398845</span>
        </div>
      </div>

      {/* Main header */}
      <div className="flex items-center justify-between gap-6 px-6 md:px-12 py-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.jpg" alt="NEXORA" width={38} height={38} className="rounded-lg" />
          <span className="font-display text-xl font-bold text-ink hidden sm:inline">NEXORA</span>
        </Link>

        <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:flex">
          <div className="flex w-full border border-ink/15 rounded-full overflow-hidden">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for products..."
              className="flex-1 px-4 py-2.5 text-sm focus:outline-none"
            />
            <button type="submit" className="bg-volt text-white px-5 flex items-center justify-center hover:bg-volt-dark transition-colors">
              <Search size={16} />
            </button>
          </div>
        </form>

        <div className="flex items-center gap-5 shrink-0">
          {token ? (
            <>
              <Link href="/account" className="hidden sm:flex items-center gap-1.5 text-sm text-ink/70 hover:text-volt">
                <User size={18} />
                <span className="hidden lg:inline">Account</span>
              </Link>
              <Link href="/cart" className="flex items-center gap-1.5 text-sm text-ink/70 hover:text-volt">
                <ShoppingBag size={18} />
                <span className="hidden lg:inline">Cart</span>
              </Link>
              <button onClick={() => logout()} className="flex items-center gap-1.5 text-sm text-ink/60 hover:text-coral">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-ink text-paper px-4 py-2 rounded-full text-sm font-medium hover:bg-volt transition-colors"
            >
              Log in
            </Link>
          )}
        </div>
      </div>

      {/* Category nav bar */}
      <div className="bg-ink">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center gap-6 overflow-x-auto py-3 text-sm">
          <Link href="/" className="text-paper font-medium shrink-0 hover:text-mango transition-colors">
            All Products
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/?category=${c.id}`}
              className="text-paper/70 shrink-0 hover:text-mango transition-colors"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
