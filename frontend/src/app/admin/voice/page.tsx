"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { api } from "@/context/AuthContext";

interface Turn {
  role: "user" | "agent";
  text: string;
}

export default function VoiceAssistantPage() {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [conversation, setConversation] = useState<Turn[]>([]);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
    useEffect(() => {
    // Ensure voice list is loaded before we ever need it
    window.speechSynthesis?.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }, []);
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "ur-PK";

    recognition.onresult = (event: any) => {
      const text = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      transcriptRef.current = text;
      setTranscript(text);
    };

    recognition.onerror = (event: any) => {
      setListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        alert("Microphone access denied. Please allow microphone permission in your browser settings.");
      } else if (event.error === "no-speech") {
        alert("No speech detected. Please try again and speak clearly.");
      } else if (event.error !== "aborted") {
        alert(`Voice recognition error: ${event.error}`);
      }
    };

    // Fires automatically when the browser detects silence (continuous=false),
    // OR when the user manually clicks stop. Either way, send whatever we captured.
    recognition.onend = () => {
      setListening(false);
      const finalText = transcriptRef.current.trim();
      if (finalText) {
        setAwaitingConfirm(true);
      }
    };

    recognitionRef.current = recognition;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = () => {
    setTranscript("");
    transcriptRef.current = "";
    setListening(true);
    recognitionRef.current?.start();
  };

  const stopListening = () => {
    // onend will fire after this and handle sending automatically
    recognitionRef.current?.stop();
  };
  const confirmSend = () => {
    setAwaitingConfirm(false);
    if (transcript.trim()) sendToAgent(transcript.trim());
  };

  const discardTranscript = () => {
    setAwaitingConfirm(false);
    setTranscript("");
    transcriptRef.current = "";
  };
  const sendToAgent = async (message: string) => {
    setConversation((prev) => [...prev, { role: "user", text: message }]);
    setProcessing(true);
    setTranscript("");
    transcriptRef.current = "";
    try {
      const res = await api.post("/agent/chat", { message });
      const reply = res.data.reply;
      setConversation((prev) => [...prev, { role: "agent", text: reply }]);
      speak(reply);
    } catch {
      const errText = "Sorry, I couldn't process that request.";
      setConversation((prev) => [...prev, { role: "agent", text: errText }]);
      speak(errText);
    } finally {
      setProcessing(false);
    }
  };

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    const cleaned = text.replace(/\*\*/g, "").replace(/[#*_]/g, "").replace(/\|/g, " ");
    const isUrdu = /[\u0600-\u06FF]/.test(cleaned);

    window.speechSynthesis.cancel();

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice: SpeechSynthesisVoice | undefined;
    let lang = "en-US";

    if (isUrdu) {
      // Prefer a real Urdu voice if one ever becomes available, otherwise fall back to Hindi
      selectedVoice = voices.find((v) => v.lang.startsWith("ur")) || voices.find((v) => v.lang.startsWith("hi"));
      lang = selectedVoice?.lang || "hi-IN";
    }

    const chunks = cleaned.split(/(?<=[.!?۔])\s+/).filter((c) => c.trim().length > 0);

    chunks.forEach((chunk) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.rate = 1.0;
      utterance.lang = lang;
      if (selectedVoice) utterance.voice = selectedVoice;
      window.speechSynthesis.speak(utterance);
    });
  };

  if (!supported) {
    return (
      <div className="text-center py-16">
        <p className="text-nexora-muted">
          Voice recognition isn&apos;t supported in this browser. Please use Chrome or Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <h1 className="font-display text-2xl font-bold mb-2">Talk to NEXORA</h1>
      <p className="text-nexora-muted text-sm mb-10">
        Ask about inventory, orders, pricing, risk, weather, or business insights.
      </p>

      <button
        onClick={listening ? stopListening : startListening}
        disabled={processing}
        className={`w-28 h-28 rounded-full flex items-center justify-center transition-all mb-8 ${
          listening
            ? "bg-nexora-danger animate-pulse"
            : "bg-nexora-primary hover:bg-nexora-primary/90"
        } disabled:opacity-50`}
      >
        {processing ? (
          <Loader2 size={36} className="text-white animate-spin" />
        ) : listening ? (
          <MicOff size={36} className="text-white" />
        ) : (
          <Mic size={36} className="text-white" />
        )}
      </button>

      <p className="text-sm text-nexora-muted mb-8">
        {processing ? "Thinking..." : listening ? "Listening... click to stop" : "Click to speak"}
      </p>

      {transcript && (
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl px-5 py-3 mb-6 max-w-lg w-full">
          <textarea
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value);
              transcriptRef.current = e.target.value;
            }}
            className="w-full bg-transparent text-sm text-center resize-none focus:outline-none"
            rows={2}
          />
          {awaitingConfirm && (
            <div className="flex gap-2 justify-center mt-3">
              <button
                onClick={confirmSend}
                className="bg-nexora-primary text-white px-4 py-1.5 rounded-full text-xs font-medium"
              >
                Send
              </button>
              <button
                onClick={discardTranscript}
                className="bg-nexora-bg border border-nexora-border px-4 py-1.5 rounded-full text-xs font-medium"
              >
                Discard
              </button>
            </div>
          )}
        </div>
      )}

      <div className="w-full max-w-lg space-y-3">
        {conversation.slice().reverse().map((turn, i) => (
          <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-md rounded-2xl px-4 py-3 text-sm ${
                turn.role === "user"
                  ? "bg-nexora-primary text-white"
                  : "bg-nexora-surface border border-nexora-border"
              }`}
            >
              {turn.role === "agent" && (
                <div className="flex items-center gap-1.5 text-xs text-nexora-primary mb-1">
                  <Volume2 size={12} />
                  NEXORA
                </div>
              )}
              <p>{turn.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
