"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Heart, ShoppingBag, User } from "lucide-react";

const NAV_LINKS = [
  { label: "Shop", href: "#products" },
  { label: "Collections", href: "#categories" },
  { label: "AI Assistant", href: "#atlas" },
  { label: "Smart Deals", href: "#deals" },
];

export default function NovaNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-nova-bg/80 backdrop-blur-xl border-b border-white/10" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-[72px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.jpg" alt="NEXORA" width={32} height={32} className="rounded-lg object-cover" />
          <span className="font-display font-bold text-lg tracking-tight text-nova-text">NEXORA</span>
        </Link>

        <div className="hidden md:flex items-center gap-9 text-sm text-nova-muted">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} className="hover:text-nova-text transition-colors">
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-5">
          <button className="hidden sm:block text-nova-muted hover:text-nova-text transition-colors" aria-label="Search">
            <Search size={18} />
          </button>
          <Link href="/account" className="hidden sm:block text-nova-muted hover:text-nova-text transition-colors" aria-label="Wishlist">
            <Heart size={18} />
          </Link>
          <Link href="/cart" className="relative text-nova-muted hover:text-nova-text transition-colors" aria-label="Cart">
            <ShoppingBag size={18} />
          </Link>
          <Link
            href="/login"
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:border-nova-cyan/50 transition-colors text-nova-text"
            aria-label="Account"
          >
            <User size={15} />
          </Link>
        </div>
      </div>
    </nav>
  );
}