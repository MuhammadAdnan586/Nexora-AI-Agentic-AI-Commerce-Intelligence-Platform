"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, ArrowLeft, Package, User as UserIcon, X, Upload, MessageSquare, Send } from "lucide-react";
import { api, useAuth } from "@/context/AuthContext";

interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: number;
  status: string;
  total_amount: number;
  shipping_address: string | null;
  created_at: string;
  items: OrderItem[];
}

interface Me {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

interface ReturnStatus {
  id: number;
  order_id: number;
  reason: string | null;
  status: string;
  admin_note: string | null;
  refund_warehouse: string | null;
  refund_warehouse_address: string | null;
  created_at: string;
}

interface ChatMessage {
  id: number;
  sender_name: string | null;
  sender_id: number;
  message: string;
  is_me: boolean;
  created_at: string;
}

const statusColor: Record<string, string> = {
  pending: "bg-mango/20 text-ink",
  confirmed: "bg-volt/10 text-volt",
  shipped: "bg-volt/10 text-volt",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-coral/10 text-coral",
};

export default function AccountPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [returnItemId, setReturnItemId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [myReturns, setMyReturns] = useState<ReturnStatus[]>([]);

  const [chatOrderId, setChatOrderId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  const load = () => {
    Promise.all([api.get("/auth/me"), api.get("/orders/"), api.get("/orders/returns/mine")])
      .then(([meRes, ordersRes, returnsRes]) => {
        setMe(meRes.data);
        setOrders(ordersRes.data);
        setMyReturns(returnsRes.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    load();
  }, [token]);

  const submitReturn = async () => {
    if (!returnItemId || !reason.trim()) return;
    setSubmitting(true);
    try {
      let image_url: string | undefined;
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await api.post("/uploads/image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        image_url = uploadRes.data.url;
      }
      await api.post("/orders/returns", { order_item_id: returnItemId, reason, image_url });
      setReturnItemId(null);
      setReason("");
      setImageFile(null);
      alert("Return request submitted! We'll notify you once it's reviewed.");
      load();
    } catch {
      alert("Could not submit return request.");
    } finally {
      setSubmitting(false);
    }
  };

  const openChat = async (orderId: number) => {
    setChatOrderId(orderId);
    const res = await api.get(`/orders/${orderId}/messages`);
    setChatMessages(res.data);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !chatOrderId) return;
    await api.post(`/orders/${chatOrderId}/messages`, { message: chatInput });
    setChatInput("");
    const res = await api.get(`/orders/${chatOrderId}/messages`);
    setChatMessages(res.data);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink/50">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="flex items-center justify-between px-6 md:px-12 py-6 border-b border-ink/10">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-volt text-paper w-8 h-8 rounded-lg flex items-center justify-center">
            <Zap size={18} fill="currentColor" />
          </div>
          <span className="font-display text-xl font-bold">Volt</span>
        </Link>
      </header>

      <section className="px-6 md:px-12 py-12 max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-ink/60 mb-8 hover:text-volt">
          <ArrowLeft size={16} />
          Back to shopping
        </Link>

        <div className="bg-white border border-ink/10 rounded-2xl p-6 mb-8 flex items-center gap-4">
          <div className="bg-volt/10 text-volt w-14 h-14 rounded-full flex items-center justify-center">
            <UserIcon size={24} />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">{me?.full_name || "Customer"}</h1>
            <p className="text-sm text-ink/60">{me?.email}</p>
            <p className="text-xs text-ink/40 mt-1">
              Member since {me?.created_at ? new Date(me.created_at).toLocaleDateString() : "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Package size={18} className="text-ink/60" />
          <h2 className="font-display text-lg font-bold">My Orders</h2>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 bg-white border border-ink/10 rounded-2xl">
            <p className="text-ink/50 mb-4">You haven&apos;t placed any orders yet.</p>
            <Link href="/" className="text-volt font-medium">Browse products →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white border border-ink/10 rounded-2xl p-5">
                <div
                  className="flex items-center justify-between mb-3 cursor-pointer"
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                >
                  <p className="font-mono font-bold text-ink">Order #{order.id}</p>
                  <span className={`text-xs px-2.5 py-1 rounded-full capitalize font-medium ${statusColor[order.status]}`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-sm text-ink/60 mb-1">
                  {order.items.length} item{order.items.length > 1 ? "s" : ""} · {new Date(order.created_at).toLocaleDateString()}
                </p>
                <p className="font-mono font-bold text-volt mb-2">${order.total_amount.toFixed(2)}</p>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openChat(order.id);
                  }}
                  className="flex items-center gap-1.5 text-xs text-ink/60 hover:text-volt"
                >
                  <MessageSquare size={13} />
                  Chat about this order
                </button>

                {expandedOrder === order.id && (
                  <div className="mt-4 pt-4 border-t border-ink/10 space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-ink/70">
                          Product #{item.product_id} · Qty {item.quantity} · ${item.unit_price.toFixed(2)}
                        </span>
                        {order.status === "delivered" && (
                          <button
                            onClick={() => setReturnItemId(item.id)}
                            className="text-xs text-coral hover:underline"
                          >
                            Request Return
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {myReturns.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-lg font-bold mb-4">My Returns</h2>
            <div className="space-y-3">
              {myReturns.map((r) => (
                <div key={r.id} className="bg-white border border-ink/10 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-sm text-ink/60">Order #{r.order_id}</p>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full capitalize font-medium ${
                        r.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : r.status === "rejected"
                          ? "bg-coral/10 text-coral"
                          : "bg-mango/20 text-ink"
                      }`}
                    >
                      {r.status === "completed" ? "Approved & Refunded" : r.status}
                    </span>
                  </div>
                  <p className="text-sm text-ink/70 mb-1">Reason: {r.reason}</p>
                  {r.status === "completed" && r.refund_warehouse && (
                    <p className="text-sm text-ink/60">
                      Refund processed via <span className="font-medium">{r.refund_warehouse}</span>
                      {r.refund_warehouse_address && ` — ${r.refund_warehouse_address}`}
                    </p>
                  )}
                  {r.status === "rejected" && r.admin_note && (
                    <p className="text-sm text-coral">Reason for rejection: {r.admin_note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {returnItemId && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-6 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">Request Return</h3>
              <button onClick={() => setReturnItemId(null)} className="text-ink/40 hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <label className="text-sm font-medium mb-1.5 block">Reason for return</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Item arrived damaged"
              className="w-full border border-ink/15 rounded-xl px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-volt resize-none"
            />

            <label className="text-sm font-medium mb-1.5 block">Photo (optional)</label>
            <label className="flex items-center gap-2 border border-dashed border-ink/20 rounded-xl px-4 py-3 mb-4 cursor-pointer text-sm text-ink/60 hover:border-volt">
              <Upload size={16} />
              {imageFile ? imageFile.name : "Upload a photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </label>

            <button
              onClick={submitReturn}
              disabled={submitting || !reason.trim()}
              className="w-full bg-ink text-paper py-3 rounded-full font-medium hover:bg-volt transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Return Request"}
            </button>
          </div>
        </div>
      )}

      {chatOrderId && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-6 z-50" onClick={() => setChatOrderId(null)}>
          <div
            className="bg-white rounded-2xl w-full max-w-md flex flex-col"
            style={{ maxHeight: "70vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink/10">
              <h3 className="font-display text-lg font-bold">Order #{chatOrderId} — Support Chat</h3>
              <button onClick={() => setChatOrderId(null)} className="text-ink/40 hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-ink/50 text-center">No messages yet. Ask us anything about this order!</p>
              ) : (
                chatMessages.map((m) => (
                  <div key={m.id} className={`flex ${m.is_me ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.is_me ? "bg-volt text-white" : "bg-ink/5"
                      }`}
                    >
                      {!m.is_me && <p className="text-xs font-medium text-volt mb-0.5">{m.sender_name}</p>}
                      <p>{m.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-ink/10 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 border border-ink/15 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-volt"
              />
              <button onClick={sendChatMessage} className="bg-volt text-white px-4 rounded-xl">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}