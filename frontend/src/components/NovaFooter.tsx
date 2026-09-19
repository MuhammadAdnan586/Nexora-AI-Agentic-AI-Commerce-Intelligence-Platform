import Link from "next/link";
import { Globe } from "lucide-react";
import NexoraWordmark from "@/components/NexoraWordmark";
function LinkedinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.5-1.11-1.5-.9-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/m-adnan-12a816402/", Icon: LinkedinIcon },
  { label: "Portfolio", href: "https://portfolio-eight-delta-7blam1yft8.vercel.app/", Icon: Globe },
  { label: "GitHub", href: "https://github.com/MuhammadAdnan586", Icon: GithubIcon },
];

export default function NovaFooter() {
  return (
    <footer className="border-t border-white/[0.08] px-6 md:px-10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt="NEXORA" width={30} height={30} className="rounded-lg object-cover" />
              <NexoraWordmark size="text-lg" />
            </Link>
            <p className="text-sm text-nova-muted leading-relaxed max-w-xs mb-6">
              An agentic commerce intelligence platform. Products curated, priced and delivered with the help of ATLAS.
            </p>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-nova-muted hover:text-nova-cyan hover:border-nova-cyan/30 transition-colors">
                  <s.Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-nova-text mb-4 tracking-wide uppercase">Shop</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/?category=1#products" className="text-nova-muted hover:text-nova-cyan transition-colors">Electronics</Link></li>
              <li><Link href="/?category=2#products" className="text-nova-muted hover:text-nova-cyan transition-colors">Clothes</Link></li>
              <li><Link href="/?category=3#products" className="text-nova-muted hover:text-nova-cyan transition-colors">Beauty</Link></li>
              <li><Link href="/?category=4#products" className="text-nova-muted hover:text-nova-cyan transition-colors">Game</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-nova-text mb-4 tracking-wide uppercase">Company</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/" className="text-nova-muted hover:text-nova-cyan transition-colors">About Nexora</Link></li>
              <li><Link href="/#atlas" className="text-nova-muted hover:text-nova-cyan transition-colors">Meet ATLAS</Link></li>
              <li><Link href="/#deals" className="text-nova-muted hover:text-nova-cyan transition-colors">Smart deals</Link></li>
              <li><Link href="/register" className="text-nova-muted hover:text-nova-cyan transition-colors">Create account</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-nova-text mb-4 tracking-wide uppercase">Support</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/account" className="text-nova-muted hover:text-nova-cyan transition-colors">My orders</Link></li>
              <li><Link href="/cart" className="text-nova-muted hover:text-nova-cyan transition-colors">Your cart</Link></li>
              <li><Link href="/login" className="text-nova-muted hover:text-nova-cyan transition-colors">Log in</Link></li>
              <li>
                <a href="https://github.com/MuhammadAdnan586" target="_blank" rel="noopener noreferrer" className="text-nova-muted hover:text-nova-cyan transition-colors">
                  Developer
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-nova-muted">
          <p>&copy; {new Date().getFullYear()} Nexora Intelligence Inc. All rights reserved.</p>
          <p>Powered by ATLAS AI commerce.</p>
        </div>
      </div>
    </footer>
  );
}