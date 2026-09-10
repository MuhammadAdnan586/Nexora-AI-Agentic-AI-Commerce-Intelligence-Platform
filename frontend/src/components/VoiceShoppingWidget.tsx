"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, X, Loader2, Sparkles } from "lucide-react";
import { api, useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface Turn {
  role: "user" | "agent";
  text: string;
}

export default function VoiceShoppingWidget() {
  const { token } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [conversation, setConversation] = useState<Turn[]>([]);
  const recognitionRef = useRef<any>(null);


  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US"; // browser auto-detects mixed Urdu/English speech reasonably well with en-US; Urdu-script recognition uses ur-PK if needed

    recognition.onresult = (event: any) => {
      const text = Array.from(event.results).map((r: any) => r[0].transcript).join("");
      setTranscript(text);
    };
    recognition.onend = () => {
      setListening(false);
      // handled by awaitingConfirm effect below
    };
    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    if (!listening && transcript.trim()) {
      setAwaitingConfirm(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  const openWidget = () => {
    if (!token) {
      router.push("/login");
      return;
    }
    setOpen(true);
    if (conversation.length === 0) {
      const greeting = "Hi! Welcome to NEXORA — I'm your personal shopping assistant, here to help you find the best deals. What are you looking for today?";
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

  const sendToAgent = async (message: string) => {
    setConversation((prev) => [...prev, { role: "user", text: message }]);
    setProcessing(true);
    setTranscript("");
    try {
      const res = await api.post("/shopping/chat", { message });
      const reply = res.data.reply;
      setConversation((prev) => [...prev, { role: "agent", text: reply }]);
      speak(reply);
    } catch {
      const err = "Sorry, something went wrong. Could you try again?";
      setConversation((prev) => [...prev, { role: "agent", text: err }]);
      speak(err);
    } finally {
      setProcessing(false);
    }
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
      {!open && (
        <button
          onClick={openWidget}
          className="fixed bottom-6 right-6 bg-volt text-paper w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:bg-volt-dark transition-colors z-40"
        >
          <Mic size={26} />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 w-full max-w-sm bg-paper border border-ink/10 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden" style={{ maxHeight: "70vh" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-ink/10 bg-ink text-paper">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-mango" />
              <p className="font-display font-bold text-sm">Shop with Voice</p>
            </div>
            <button onClick={closeWidget} className="text-paper/60 hover:text-paper">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {conversation.map((turn, i) => (
              <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    turn.role === "user" ? "bg-volt text-paper" : "bg-white border border-ink/10"
                  }`}
                >
                  {turn.text}
                </div>
              </div>
            ))}
            {transcript && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm bg-volt/40 text-ink">
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="w-full bg-transparent resize-none focus:outline-none italic"
                    rows={2}
                  />
                  {awaitingConfirm && (
                    <div className="flex gap-2 mt-2 justify-end">
                      <button onClick={confirmSend} className="bg-volt text-white text-xs px-3 py-1 rounded-full font-medium">
                        Send
                      </button>
                      <button onClick={discardTranscript} className="bg-white/60 text-ink text-xs px-3 py-1 rounded-full font-medium">
                        Discard
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-ink/10 flex justify-center">
            <button
              onClick={listening ? stopListening : startListening}
              disabled={processing}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${
                listening ? "bg-coral animate-pulse" : "bg-ink hover:bg-volt"
              }`}
            >
              {processing ? (
                <Loader2 size={22} className="text-paper animate-spin" />
              ) : listening ? (
                <MicOff size={22} className="text-paper" />
              ) : (
                <Mic size={22} className="text-paper" />
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}