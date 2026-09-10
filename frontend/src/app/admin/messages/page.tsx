"use client";

import { useEffect, useState } from "react";
import { Send, User, Warehouse as WarehouseIcon, Paperclip, Download, Plus, X } from "lucide-react";
import { api } from "@/context/AuthContext";

interface CustomerConvo {
  user_id: number;
  name: string;
  email: string;
  last_message: string;
  last_message_at: string;
  unread: boolean;
}

interface WarehouseConvo {
  warehouse_id: number;
  name: string;
  city: string;
  last_message: string;
  last_message_at: string;
  unread: boolean;
}

interface Message {
  id: number;
  sender_name: string | null;
  is_me: boolean;
  message: string;
  order_id: number;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
}

type Mode = "customers" | "warehouses";

export default function AdminMessagesPage() {
  const [mode, setMode] = useState<Mode>("customers");
  const [customerConvos, setCustomerConvos] = useState<CustomerConvo[]>([]);
  const [warehouseConvos, setWarehouseConvos] = useState<WarehouseConvo[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [allCustomers, setAllCustomers] = useState<{ user_id: number; name: string; email: string }[]>([]);
  const [allWarehouses, setAllWarehouses] = useState<{ warehouse_id: number; name: string; city: string }[]>([]);
  const [pickerSearch, setPickerSearch] = useState("");
  const loadConvos = async () => {
    setLoading(true);
    setSelectedId(null);
    setThread([]);
    try {
      if (mode === "customers") {
        const res = await api.get("/admin/messages/customers");
        setCustomerConvos(res.data);
      } else {
        const res = await api.get("/admin/messages/warehouses");
        setWarehouseConvos(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConvos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    const interval = setInterval(loadConvos, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const openThread = async (id: number) => {
    setSelectedId(id);
    setThreadLoading(true);
    try {
      const url = mode === "customers" ? `/admin/messages/customers/${id}/thread` : `/admin/messages/warehouses/${id}/thread`;
      const res = await api.get(url);
      setThread(res.data);
    } finally {
      setThreadLoading(false);
    }
  };
  const openPicker = async () => {
    setPickerSearch("");
    setShowPicker(true);
    if (mode === "customers" && allCustomers.length === 0) {
      const res = await api.get("/admin/messages/all-customers");
      setAllCustomers(res.data);
    } else if (mode === "warehouses" && allWarehouses.length === 0) {
      const res = await api.get("/admin/messages/all-warehouses");
      setAllWarehouses(res.data);
    }
  };

  const startConversation = (id: number) => {
    setShowPicker(false);
    openThread(id);
  };
  const sendMessage = async (attachment?: { url: string; name: string }) => {
    if ((!input.trim() && !attachment) || !selectedId) return;
    const url = mode === "customers" ? `/admin/messages/customers/${selectedId}/send` : `/admin/messages/warehouses/${selectedId}/send`;
    await api.post(url, {
      message: input.trim() || (attachment ? `📎 ${attachment.name}` : ""),
      attachment_url: attachment?.url || null,
      attachment_name: attachment?.name || null,
    });
    setInput("");
    openThread(selectedId);
    loadConvos();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/uploads/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await sendMessage({ url: res.data.url, name: file.name });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const activeList = mode === "customers" ? customerConvos : warehouseConvos;
  const selectedMeta =
    mode === "customers"
      ? customerConvos.find((c) => c.user_id === selectedId)
      : warehouseConvos.find((c) => c.warehouse_id === selectedId);

  const totalUnread = customerConvos.filter((c) => c.unread).length + warehouseConvos.filter((c) => c.unread).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold">Messages</h1>
          {totalUnread > 0 && (
            <span className="bg-nexora-danger text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {totalUnread}
            </span>
          )}
        </div>
        <button
          onClick={openPicker}
          className="flex items-center gap-2 bg-nexora-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-nexora-primary/90 transition-colors"
        >
          <Plus size={16} />
          New Conversation
        </button>
      </div>

      <div className="bg-nexora-surface border border-nexora-border rounded-2xl overflow-hidden flex" style={{ height: "70vh" }}>
        {/* Left: conversation list */}
        <div className="w-72 border-r border-nexora-border flex flex-col shrink-0">
          <div className="flex border-b border-nexora-border">
            <button
              onClick={() => setMode("customers")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors relative ${
                mode === "customers" ? "text-nexora-primary border-b-2 border-nexora-primary" : "text-nexora-muted"
              }`}
            >
              <User size={14} /> Customers
              {customerConvos.some((c) => c.unread) && (
                <span className="w-1.5 h-1.5 rounded-full bg-nexora-danger absolute top-2 right-6" />
              )}
            </button>
            <button
              onClick={() => setMode("warehouses")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors relative ${
                mode === "warehouses" ? "text-nexora-primary border-b-2 border-nexora-primary" : "text-nexora-muted"
              }`}
            >
              <WarehouseIcon size={14} /> Warehouses
              {warehouseConvos.some((w) => w.unread) && (
                <span className="w-1.5 h-1.5 rounded-full bg-nexora-danger absolute top-2 right-6" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-nexora-muted text-sm p-4">Loading...</p>
            ) : activeList.length === 0 ? (
              <p className="text-nexora-muted text-sm p-4">No conversations yet.</p>
            ) : mode === "customers" ? (
              customerConvos.map((c) => (
                <button
                  key={c.user_id}
                  onClick={() => openThread(c.user_id)}
                  className={`w-full text-left px-4 py-3 border-b border-nexora-border hover:bg-nexora-bg transition-colors flex items-start gap-2 ${
                    selectedId === c.user_id ? "bg-nexora-bg" : ""
                  }`}
                >
                  {c.unread && <span className="w-2 h-2 rounded-full bg-nexora-primary mt-1.5 shrink-0" />}
                  <div className="min-w-0">
                    <p className={`text-sm truncate ${c.unread ? "font-bold" : "font-medium"}`}>{c.name}</p>
                    <p className="text-xs text-nexora-muted truncate mt-0.5">{c.last_message}</p>
                  </div>
                </button>
              ))
            ) : (
              warehouseConvos.map((w) => (
                <button
                  key={w.warehouse_id}
                  onClick={() => openThread(w.warehouse_id)}
                  className={`w-full text-left px-4 py-3 border-b border-nexora-border hover:bg-nexora-bg transition-colors flex items-start gap-2 ${
                    selectedId === w.warehouse_id ? "bg-nexora-bg" : ""
                  }`}
                >
                  {w.unread && <span className="w-2 h-2 rounded-full bg-nexora-primary mt-1.5 shrink-0" />}
                  <div className="min-w-0">
                    <p className={`text-sm truncate ${w.unread ? "font-bold" : "font-medium"}`}>{w.name}</p>
                    <p className="text-xs text-nexora-muted truncate mt-0.5">{w.last_message}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: thread */}
        <div className="flex-1 flex flex-col">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-nexora-muted text-sm">
              Select a conversation to view messages
            </div>
          ) : (
            <>
              <div className="px-5 py-3.5 border-b border-nexora-border">
                <p className="font-display font-bold text-sm">
                  {mode === "customers" ? (selectedMeta as CustomerConvo)?.name : (selectedMeta as WarehouseConvo)?.name}
                </p>
                <p className="text-xs text-nexora-muted">
                  {mode === "customers" ? (selectedMeta as CustomerConvo)?.email : (selectedMeta as WarehouseConvo)?.city}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {threadLoading ? (
                  <p className="text-nexora-muted text-sm">Loading...</p>
                ) : thread.length === 0 ? (
                  <p className="text-nexora-muted text-sm">No messages yet.</p>
                ) : (
                  thread.map((m) => (
                    <div key={m.id} className={`flex ${m.is_me ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                          m.is_me ? "bg-nexora-primary text-white" : "bg-nexora-bg border border-nexora-border"
                        }`}
                      >
                        <p>{m.message}</p>
                        {m.attachment_url && (
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL}${m.attachment_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 mt-2 rounded-lg px-3 py-2 text-xs w-fit hover:underline ${
                              m.is_me ? "bg-white/15 text-white" : "bg-nexora-surface border border-nexora-border text-nexora-primary"
                            }`}
                          >
                            <Download size={12} />
                            {m.attachment_name}
                          </a>
                        )}
                        <p className={`text-[10px] mt-1 ${m.is_me ? "text-white/60" : "text-nexora-muted"}`}>
                          Order #{m.order_id} · {new Date(m.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-nexora-border flex gap-2 items-center">
                <label className="text-nexora-muted hover:text-nexora-primary cursor-pointer transition-colors shrink-0">
                  <Paperclip size={18} />
                  <input type="file" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                </label>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={uploading ? "Uploading..." : "Type a message..."}
                  disabled={uploading}
                  className="flex-1 bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={uploading}
                  className="bg-nexora-primary text-white px-4 py-2.5 rounded-xl hover:bg-nexora-primary/90 transition-colors disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showPicker && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-6 z-50" onClick={() => setShowPicker(false)}>
          <div
            className="bg-nexora-surface border border-nexora-border rounded-2xl w-full max-w-md flex flex-col"
            style={{ maxHeight: "70vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-nexora-border flex items-center justify-between">
              <h2 className="font-display font-bold">
                Start conversation with {mode === "customers" ? "a customer" : "a warehouse"}
              </h2>
              <button onClick={() => setShowPicker(false)} className="text-nexora-muted"><X size={18} /></button>
            </div>
            <div className="px-5 py-3 border-b border-nexora-border">
              <input
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Search..."
                className="w-full bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {mode === "customers"
                ? allCustomers
                    .filter((c) => c.name.toLowerCase().includes(pickerSearch.toLowerCase()) || c.email.toLowerCase().includes(pickerSearch.toLowerCase()))
                    .map((c) => (
                      <button
                        key={c.user_id}
                        onClick={() => startConversation(c.user_id)}
                        className="w-full text-left px-5 py-3 hover:bg-nexora-bg transition-colors border-b border-nexora-border last:border-0"
                      >
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-nexora-muted">{c.email}</p>
                      </button>
                    ))
                : allWarehouses
                    .filter((w) => w.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                    .map((w) => (
                      <button
                        key={w.warehouse_id}
                        onClick={() => startConversation(w.warehouse_id)}
                        className="w-full text-left px-5 py-3 hover:bg-nexora-bg transition-colors border-b border-nexora-border last:border-0"
                      >
                        <p className="text-sm font-medium">{w.name}</p>
                        <p className="text-xs text-nexora-muted">{w.city}</p>
                      </button>
                    ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}