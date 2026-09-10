"use client";

import { useState } from "react";
import { Bot, Send, FileText } from "lucide-react";
import { api } from "@/context/AuthContext";

interface Source {
  title: string;
  relevance_score: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const question = input;
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/copilot/ask", { question });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.answer, sources: res.data.sources },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="flex items-center gap-2 mb-6">
        <Bot className="text-nexora-primary" size={22} />
        <h1 className="font-display text-2xl font-bold">RAG Admin Copilot</h1>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <p className="text-nexora-muted text-sm">
            Ask about policies, SOPs, or business documents. e.g. &ldquo;What is our return policy?&rdquo;
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-lg rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-nexora-primary text-white"
                  : "bg-nexora-surface border border-nexora-border"
              }`}
            >
              <p>{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-nexora-border/50 space-y-1">
                  {msg.sources.map((s, j) => (
                    <div key={j} className="flex items-center gap-1.5 text-xs text-nexora-muted">
                      <FileText size={12} />
                      {s.title} · relevance {s.relevance_score}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <p className="text-nexora-muted text-sm">Thinking...</p>}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask the copilot..."
          className="flex-1 bg-nexora-surface border border-nexora-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="bg-nexora-primary text-white px-5 rounded-xl disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}