"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Heart } from "lucide-react";

interface Tile {
  src: string;
  alt: string;
  className: string;
  rotate: number;
  glow: string;
  z: number;
  delay: number;
  dim?: boolean;
}

// All tiles are anchored from the BOTTOM of the panel and clustered in the
// lower ~55% of the container so they never collide with the heading text
// above them, regardless of viewport height / zoom level.
const TILES: Tile[] = [
  {
    src: "/products/nexora-headphones.png",
    alt: "Premium wireless headphones",
    className: "left-[0%] bottom-[2%] w-[19%] sm:w-[17%]",
    rotate: -6,
    glow: "rgba(79,227,242,0.28)",
    z: 20,
    delay: 0.1,
  },
  {
    src: "/products/nexora-watch.png",
    alt: "Smartwatch",
    className: "left-[19%] bottom-[16%] w-[11%] sm:w-[10%]",
    rotate: 4,
    glow: "rgba(79,227,242,0.35)",
    z: 30,
    delay: 0.25,
  },
  {
    src: "/products/nexora-sneaker.png",
    alt: "White sneaker",
    className: "left-[6%] bottom-[0%] w-[26%] sm:w-[23%]",
    rotate: -3,
    glow: "rgba(139,107,240,0.4)",
    z: 40,
    delay: 0.4,
  },
  {
    src: "/products/nexora-bottle.png",
    alt: "Water bottle",
    className: "left-[32%] bottom-[6%] w-[10%] sm:w-[9%]",
    rotate: 5,
    glow: "rgba(139,107,240,0.28)",
    z: 25,
    delay: 0.55,
    dim: true,
  },
];

// Simple podium/pedestal shapes underneath a couple of the tiles, to echo
// the "product on a stand" look from the reference design.
const PODIUMS = [
  { className: "left-[17%] bottom-[2%] w-[14%] h-[22%]", color: "rgba(120,180,255,0.14)" },
  { className: "left-[4%] bottom-[0%] w-[20%] h-[10%]", color: "rgba(139,107,240,0.16)" },
];

export default function AuthProductShowcase() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMouse({ x, y });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Ambient background glows */}
      <div
        className="absolute w-72 h-72 rounded-full blur-3xl opacity-35 transition-transform duration-300 ease-out"
        style={{
          background: "radial-gradient(circle, rgba(79,227,242,0.5), transparent 70%)",
          right: "8%",
          top: "0%",
          transform: `translate(${mouse.x * 14}px, ${mouse.y * 10}px)`,
        }}
      />
      <div
        className="absolute w-80 h-80 rounded-full blur-3xl opacity-25 transition-transform duration-300 ease-out"
        style={{
          background: "radial-gradient(circle, rgba(139,107,240,0.5), transparent 70%)",
          right: "2%",
          top: "10%",
          transform: `translate(${-mouse.x * 16}px, ${-mouse.y * 11}px)`,
        }}
      />
      {/* Decorative translucent sphere, top-right, like the reference image */}
      <div
        className="absolute w-16 h-16 rounded-full opacity-70"
        style={{
          right: "22%",
          top: "26%",
          background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55), rgba(139,107,240,0.35) 55%, rgba(79,227,242,0.25) 100%)",
          boxShadow: "0 10px 30px -8px rgba(79,227,242,0.4)",
          transform: `translate(${mouse.x * 10}px, ${mouse.y * 8}px)`,
        }}
      />

      {/* Minimal decorative chips — kept in the upper area, away from products */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute top-[6%] right-[14%] w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.14] backdrop-blur-md flex items-center justify-center animate-[floaty_5s_ease-in-out_infinite] shadow-lg z-50"
        style={{ transform: `translate(${mouse.x * 8}px, ${mouse.y * 6}px)` }}
      >
        <ShoppingCart size={15} className="text-nova-cyan" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-[30%] right-[4%] w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.14] backdrop-blur-md flex items-center justify-center animate-[floaty_5.5s_ease-in-out_infinite] z-50"
        style={{ animationDelay: "0.8s", transform: `translate(${-mouse.x * 8}px, ${-mouse.y * 6}px)` }}
      >
        <Heart size={13} className="text-pink-300" />
      </motion.div>

      {/* Product composition — bottom-anchored so it always sits in the
          lower portion of the panel, clear of the heading text above */}
      <div className="absolute inset-0">
        {PODIUMS.map((p, i) => (
          <div
            key={i}
            className={`absolute ${p.className} rounded-t-full`}
            style={{ background: p.color, filter: "blur(0.5px)" }}
          />
        ))}

        {TILES.map((t) => (
          <motion.div
            key={t.src}
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: t.dim ? 0.85 : 1, y: 0, scale: 1 }}
            transition={{ delay: t.delay, duration: 0.6, ease: "easeOut" }}
            className={`absolute ${t.className} animate-[floaty_6s_ease-in-out_infinite]`}
            style={{
              zIndex: t.z,
              animationDelay: `${t.delay}s`,
              transform: `translate(${mouse.x * (4 + t.z / 10)}px, ${mouse.y * (3 + t.z / 12)}px) rotate(${t.rotate}deg)`,
              transition: "transform 0.35s ease-out",
            }}
          >
            <div
              className="absolute -inset-3 rounded-[26px] blur-2xl"
              style={{ background: t.glow, opacity: t.dim ? 0.5 : 0.8 }}
            />
            <div
              className="relative rounded-2xl overflow-hidden border border-white/[0.12] shadow-[0_20px_45px_-15px_rgba(0,0,0,0.65)]"
              style={{ filter: t.dim ? "brightness(0.85)" : undefined }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.src} alt={t.alt} className="w-full h-full object-cover aspect-square" />
            </div>
          </motion.div>
        ))}

        {/* Ground shadow */}
        <div
          className="absolute left-[6%] right-[10%] bottom-[0%] h-5 rounded-full blur-xl opacity-40"
          style={{ background: "radial-gradient(ellipse, rgba(79,227,242,0.3), transparent 70%)" }}
        />
      </div>

      <style jsx global>{`
        @keyframes floaty {
          0%, 100% { margin-top: 0px; }
          50% { margin-top: -10px; }
        }
      `}</style>
    </div>
  );
}