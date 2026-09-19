"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Mic, Send, X } from "lucide-react";

interface ChatMsg {
  id: number;
  from: "atlas" | "me";
  text: string;
}

const SUGGESTIONS = [
  "Find gaming headphones",
  "Best laptop under $1500",
  "Show me trending products",
];

export default function AtlasAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 1, from: "atlas", text: "Hey! What are you looking for today?" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMsg = { id: Date.now(), from: "me", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          from: "atlas",
          text: "I found — a few strong matches based on your recent browsing.",
        },
      ]);
    }, 1300);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute bottom-[72px] right-0 w-[340px] h-[440px] rounded-3xl overflow-hidden flex flex-col bg-nova-bg2/90 backdrop-blur-xl border border-white/10 shadow-2xl"
          >
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-nova-cyan to-nova-violet flex items-center justify-center shrink-0">
                <Sparkles size={16} className="text-nova-bg" />
              </div>
              <div className="flex-1">
                <p className="font-display font-bold text-sm text-nova-text leading-tight">ATLAS</p>
                <p className="text-[11px] text-nova-muted flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Nexora intelligence · online
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-nova-muted hover:text-nova-text">
                <X size={16} />
              </button>
            </div>

            <div ref={threadRef} className="flex-1 p-4 space-y-3 overflow-y-auto">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-2xl px-3.5 py-2.5 text-sm max-w-[85%] ${
                    m.from === "me"
                      ? "ml-auto bg-white/10 text-nova-text rounded-tr-sm"
                      : "bg-white/5 border border-white/10 text-nova-text rounded-tl-sm"
                  }`}
                >
                  {m.text}                </div>
              ))}

              {messages.length === 1 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-nova-text hover:border-nova-cyan/40 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {typing && (
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-3.5 py-3 w-fit flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-nova-muted animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-nova-muted animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-nova-muted animate-bounce" />
                </div>
              )}
            </div>

            <div className="p-3 border-t border-white/10 flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Ask ATLAS anything..."
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-nova-text placeholder:text-nova-muted focus:outline-none focus:border-nova-cyan/50"
              />
              <button
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 hover:border-nova-cyan/40 transition-colors text-nova-text"
                aria-label="Voice"
              >
                <Mic size={14} />
              </button>
              <button
                onClick={() => send(input)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-nova-cyan to-nova-violet flex items-center justify-center shrink-0 text-nova-bg"
                aria-label="Send"
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((v) => !v)}
        id="atlas-fab-trigger"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        animate={{ boxShadow: ["0 0 0 0 rgba(34,211,238,0.45)", "0 0 0 14px rgba(34,211,238,0)"] }}
        transition={{ boxShadow: { duration: 2.2, repeat: Infinity } }}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-nova-cyan to-nova-violet flex items-center justify-center shadow-2xl"
        aria-label="Open ATLAS assistant"
      >
        <Sparkles size={22} className="text-nova-bg" />
      </motion.button>
    </div>
  );
}