"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Mic, MicOff, X, Loader2, Sparkles, Send } from "lucide-react";
import { api, useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface AtlasProduct {
  id: number;
  name: string;
  price: number;
  compare_at_price?: number | null;
  image_url?: string | null;
}

interface Turn {
  role: "user" | "agent";
  text: string;
  products?: AtlasProduct[];
}

const SUGGESTIONS = [
  "Find gaming headphones",
  "Best laptop under $1500",
  "Show me trending products",
];

const resolveImage = (url?: string | null) => {
  if (!url) return null;
  return url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_API_URL}${url}`;
};

export default function VoiceShoppingWidget() {
  const { token } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [conversation, setConversation] = useState<Turn[]>([]);
  const [typedInput, setTypedInput] = useState("");
  const recognitionRef = useRef<any>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const text = Array.from(event.results).map((r: any) => r[0].transcript).join("");
      setTranscript(text);
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    if (!listening && transcript.trim()) {
      setAwaitingConfirm(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation, transcript, processing]);

  useEffect(() => {
    if (open && window.innerWidth < 640) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const openWidget = () => {
    if (!token) {
      router.push("/login");
      return;
    }
    setOpen(true);
    if (conversation.length === 0) {
      const greeting = "Hey! I am ATLAS, your Nexora shopping assistant. What are you looking for today?";
      setConversation([{ role: "agent", text: greeting }]);
      speak(greeting);
    }
  };

  const startListening = () => {
    setTranscript("");
    setListening(true);
    recognitionRef.current?.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const confirmSend = () => {
    setAwaitingConfirm(false);
    if (transcript.trim()) sendToAgent(transcript.trim());
  };

  const discardTranscript = () => {
    setAwaitingConfirm(false);
    setTranscript("");
  };

  const notifyPageOfProducts = (products: AtlasProduct[]) => {
    if (products.length === 0) return;
    window.dispatchEvent(
      new CustomEvent("nexora-atlas-products", { detail: products.map((p) => p.id) })
    );
  };

  const sendToAgent = async (message: string) => {
    setConversation((prev) => [...prev, { role: "user", text: message }]);
    setProcessing(true);
    setTranscript("");
    try {
      const res = await api.post("/shopping/chat", { message });
      const reply = res.data.reply as string;
      const products = (res.data.products as AtlasProduct[]) || [];
      setConversation((prev) => [...prev, { role: "agent", text: reply, products }]);
      notifyPageOfProducts(products);
      speak(reply);
    } catch {
      const err = "Sorry, something went wrong. Could you try again?";
      setConversation((prev) => [...prev, { role: "agent", text: err }]);
      speak(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleTypedSend = () => {
    if (!typedInput.trim() || processing) return;
    sendToAgent(typedInput.trim());
    setTypedInput("");
  };

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    const cleaned = text
      .replace(/\*\*/g, "")
      .replace(/[#*_]/g, "")
      .replace(/NEXORA/gi, "Nex-ora");
    const utterance = new SpeechSynthesisUtterance(cleaned);
    window.speechSynthesis.speak(utterance);
  };

  const closeWidget = async () => {
    setOpen(false);
    window.speechSynthesis.cancel();
    try {
      await api.post("/shopping/reset");
    } catch {}
    setConversation([]);
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={closeWidget}
        />
      )}

      <div className="fixed bottom-6 left-6 z-50 sm:bottom-6 sm:left-6">
        {open && (
          <div
            className={`
              fixed sm:absolute
              left-0 right-0 bottom-0 sm:bottom-[72px] sm:left-0 sm:right-auto
              w-full sm:w-[380px]
              max-h-[85vh] sm:max-h-[75vh]
              rounded-t-3xl sm:rounded-3xl
              overflow-hidden flex flex-col
              bg-nova-bg2/95 sm:bg-nova-bg2/90 backdrop-blur-xl
              border border-white/10 border-b-0 sm:border-b
              shadow-2xl z-50
            `}
          >
            <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="p-4 border-b border-white/10 flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-nova-cyan to-nova-violet flex items-center justify-center shrink-0">
                <Sparkles size={16} className="text-nova-bg" />
              </div>
              <div className="flex-1">
                <p className="font-display font-bold text-sm text-nova-text leading-tight">ATLAS</p>
                <p className="text-[11px] text-nova-muted flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {listening ? "Listening..." : processing ? "Thinking..." : "Nexora intelligence \u00b7 online"}
                </p>
              </div>
              <button onClick={closeWidget} className="text-nova-muted hover:text-nova-text" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div ref={threadRef} className="flex-1 p-4 space-y-3 overflow-y-auto">
              {conversation.map((turn, i) => (
                <div key={i} className={`flex flex-col ${turn.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm max-w-[85%] ${
                      turn.role === "user"
                        ? "bg-white/10 text-nova-text rounded-tr-sm"
                        : "bg-white/5 border border-white/10 text-nova-text rounded-tl-sm"
                    }`}
                  >
                    {turn.text}
                  </div>

                  {turn.products && turn.products.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-2 max-w-[95%] w-full">
                      {turn.products.slice(0, 4).map((p) => {
                        const img = resolveImage(p.image_url);
                        const hasDiscount = p.compare_at_price && p.compare_at_price > p.price;
                        return (
                          <Link
                            key={p.id}
                            href={`/products/${p.id}`}
                            className="rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.08] hover:border-nova-cyan/40 transition-colors"
                          >
                            <div className="h-16 bg-nova-bg flex items-center justify-center overflow-hidden">
                              {img ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={img} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-nova-muted/40 text-lg font-display">{p.name.charAt(0)}</span>
                              )}
                            </div>
                            <div className="p-2">
                              <p className="text-[11px] text-nova-text line-clamp-1 font-medium">{p.name}</p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-nova-cyan font-semibold">${p.price.toFixed(2)}</span>
                                {hasDiscount && (
                                  <span className="text-[10px] text-nova-muted line-through">
                                    ${p.compare_at_price!.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {conversation.length === 1 && !transcript && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendToAgent(s)}
                      className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-nova-text hover:border-nova-cyan/40 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {transcript && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm bg-nova-cyan/10 border border-nova-cyan/30 text-nova-text">
                    <textarea
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      className="w-full bg-transparent resize-none focus:outline-none italic text-nova-text"
                      rows={2}
                    />
                    {awaitingConfirm && (
                      <div className="flex gap-2 mt-2 justify-end">
                        <button
                          onClick={confirmSend}
                          className="bg-gradient-to-br from-nova-cyan to-nova-violet text-nova-bg text-xs px-3 py-1 rounded-full font-semibold"
                        >
                          Send
                        </button>
                        <button
                          onClick={discardTranscript}
                          className="bg-white/10 text-nova-text text-xs px-3 py-1 rounded-full font-medium"
                        >
                          Discard
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {processing && (
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-3.5 py-3 w-fit flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-nova-muted animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-nova-muted animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-nova-muted animate-bounce" />
                </div>
              )}
            </div>

            <div
              className="p-3 border-t border-white/10 flex items-center gap-2 shrink-0"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              <input
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTypedSend()}
                placeholder="Ask ATLAS anything..."
                disabled={processing}
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-nova-text placeholder:text-nova-muted focus:outline-none focus:border-nova-cyan/50 disabled:opacity-50"
              />
              <button
                onClick={listening ? stopListening : startListening}
                disabled={processing}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-50 ${
                  listening
                    ? "bg-rose-500 animate-pulse text-white"
                    : "bg-white/5 border border-white/10 text-nova-text hover:border-nova-cyan/40"
                }`}
                aria-label={listening ? "Stop listening" : "Start voice input"}
              >
                {listening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
              <button
                onClick={handleTypedSend}
                disabled={processing}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-nova-cyan to-nova-violet flex items-center justify-center shrink-0 text-nova-bg disabled:opacity-50"
                aria-label="Send"
              >
                {processing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        )}

        {!open && (
          <button
            id="atlas-fab-trigger"
            onClick={openWidget}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-nova-cyan to-nova-violet flex items-center justify-center shadow-2xl animate-[fabfloat_4s_ease-in-out_infinite]"
            aria-label="Open ATLAS assistant"
          >
            <Sparkles size={22} className="text-nova-bg" />
          </button>
        )}
      </div>
    </>
  );
}