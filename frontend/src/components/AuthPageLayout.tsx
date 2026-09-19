import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function AuthPageLayout({ initialMode }: { initialMode: "login" | "signup" }) {
  return (
    <main className="min-h-screen bg-nova-bg text-nova-text flex flex-col lg:flex-row overflow-hidden">
      <div className="relative lg:w-[58%] min-h-[420px] lg:min-h-screen flex flex-col justify-between px-6 sm:px-10 lg:px-16 py-10 lg:py-14 overflow-hidden" style={{ backgroundColor: "#0a1a33" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/auth-bg-2.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/10 to-transparent" />

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="NEXORA" className="w-9 h-9 rounded-lg object-cover shrink-0" />
            <span className="font-display text-xl font-bold tracking-tight text-white">
              NE<span className="bg-gradient-to-r from-nova-cyan to-nova-violet bg-clip-text text-transparent">X</span>ORA
            </span>
          </Link>
          <p className="text-[11px] tracking-[0.2em] text-white/60 mt-2 uppercase">Smart shopping &middot; Better living</p>
        </div>
      </div>

      <div className="lg:w-[42%] flex items-center justify-center px-6 sm:px-10 py-10 lg:py-14 bg-nova-bg">
        <AuthForm initialMode={initialMode} />
      </div>
    </main>
  );
}