"use client";

import { useRef, useState, ReactNode, MouseEvent } from "react";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  as?: "button" | "a";
  strength?: number;
}

export default function MagneticButton({
  children,
  className = "",
  onClick,
  href,
  as = "button",
  strength = 0.35,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setOffset({ x: x * strength, y: y * strength });
  };

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  const Tag = as === "a" ? "a" : "button";

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        transition: offset.x === 0 && offset.y === 0 ? "transform 0.4s cubic-bezier(0.2,0.8,0.2,1)" : "transform 0.1s linear",
      }}
      className="inline-block will-change-transform"
    >
      <Tag href={href} onClick={onClick} className={className}>
        {children}
      </Tag>
    </div>
  );
}