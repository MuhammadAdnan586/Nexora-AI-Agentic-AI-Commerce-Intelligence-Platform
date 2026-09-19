"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, User as UserIcon, X, Upload, MessageSquare, Send } from "lucide-react";
import { api, useAuth } from "@/context/AuthContext";
import NovaFooter from "@/components/NovaFooter";
import NexoraWordmark from "@/components/NexoraWordmark";
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

const statusStyle: Record<string, string> = {
  pending: "bg-amber-400/10 text-amber-300 border-amber-400/25",
  confirmed: "bg-nova-cyan/10 text-nova-cyan border-nova-cyan/25",
  shipped: "bg-nova-violet/15 text-violet-200 border-nova-violet/25",
  delivered: "bg-emerald-400/10 text-emerald-300 border-emerald-400/25",
  cancelled: "bg-rose-400/10 text-rose-300 border-rose-400/25",
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
      <main className="min-h-screen bg-nova-bg flex items-center justify-center">
        <p className="text-nova-muted">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-nova-bg text-nova-text">
      <header className="flex items-center justify-between px-6 md:px-10 py-6 border-b border-white/[0.08]">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="NEXORA" width={30} height={30} className="rounded-lg object-cover" />
          <NexoraWordmark size="text-lg" />
        </Link>
      </header>

      <section className="px-6 md:px-10 py-12 max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-nova-muted mb-8 hover:text-nova-cyan transition-colors"
        >
          <ArrowLeft size={16} />
          Back to shopping
        </Link>

        <div className="rounded-2xl p-6 mb-8 flex items-center gap-4 bg-white/[0.04] border border-white/[0.08]">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-nova-cyan/10 text-nova-cyan border border-nova-cyan/20">
            <UserIcon size={24} />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">{me?.full_name || "Customer"}</h1>
            <p className="text-sm text-nova-muted">{me?.email}</p>
            <p className="text-xs text-nova-muted/70 mt-1">
              Member since {me?.created_at ? new Date(me.created_at).toLocaleDateString() : "-"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Package size={18} className="text-nova-muted" />
          <h2 className="font-display text-lg font-bold">My orders</h2>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
            <p className="text-nova-muted mb-4">You haven&apos;t placed any orders yet.</p>
            <Link href="/" className="text-nova-cyan font-medium hover:underline">
              Browse products &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl p-5 bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.16] transition-colors"
              >
                <div
                  className="flex items-center justify-between mb-3 cursor-pointer"
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                >
                  <p className="font-mono font-bold text-nova-text">Order #{order.id}</p>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full capitalize font-medium border ${
                      statusStyle[order.status] || "bg-white/[0.05] text-nova-muted border-white/10"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="text-sm text-nova-muted mb-1">
                  {order.items.length} item{order.items.length > 1 ? "s" : ""} &middot;{" "}
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
                <p className="font-display font-bold text-nova-cyan mb-2">${order.total_amount.toFixed(2)}</p>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openChat(order.id);
                  }}
                  className="flex items-center gap-1.5 text-xs text-nova-muted hover:text-nova-cyan transition-colors"
                >
                  <MessageSquare size={13} />
                  Chat about this order
                </button>

                {expandedOrder === order.id && (
                  <div className="mt-4 pt-4 border-t border-white/[0.08] space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-nova-muted">
                          Product #{item.product_id} &middot; Qty {item.quantity} &middot; ${item.unit_price.toFixed(2)}
                        </span>
                        {order.status === "delivered" && (
                          <button
                            onClick={() => setReturnItemId(item.id)}
                            className="text-xs text-rose-400 hover:underline"
                          >
                            Request return
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
            <h2 className="font-display text-lg font-bold mb-4">My returns</h2>
            <div className="space-y-3">
              {myReturns.map((r) => (
                <div key={r.id} className="rounded-2xl p-5 bg-white/[0.03] border border-white/[0.08]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-sm text-nova-muted">Order #{r.order_id}</p>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full capitalize font-medium border ${
                        r.status === "completed"
                          ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/25"
                          : r.status === "rejected"
                          ? "bg-rose-400/10 text-rose-300 border-rose-400/25"
                          : "bg-amber-400/10 text-amber-300 border-amber-400/25"
                      }`}
                    >
                      {r.status === "completed" ? "Approved & refunded" : r.status}
                    </span>
                  </div>
                  <p className="text-sm text-nova-muted mb-1">Reason: {r.reason}</p>
                  {r.status === "completed" && r.refund_warehouse && (
                    <p className="text-sm text-nova-muted">
                      Refund processed via <span className="font-medium text-nova-text">{r.refund_warehouse}</span>
                      {r.refund_warehouse_address && ` - ${r.refund_warehouse_address}`}
                    </p>
                  )}
                  {r.status === "rejected" && r.admin_note && (
                    <p className="text-sm text-rose-400">Reason for rejection: {r.admin_note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {returnItemId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-6 z-50">
          <div className="rounded-2xl p-6 max-w-md w-full bg-nova-bg2 border border-white/[0.1]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">Request return</h3>
              <button onClick={() => setReturnItemId(null)} className="text-nova-muted hover:text-nova-text">
                <X size={18} />
              </button>
            </div>

            <label className="text-sm font-medium text-nova-muted mb-1.5 block">Reason for return</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Item arrived damaged"
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-2.5 mb-4 text-sm text-nova-text placeholder:text-nova-muted focus:outline-none focus:border-nova-cyan/50 resize-none transition-colors"
            />

            <label className="text-sm font-medium text-nova-muted mb-1.5 block">Photo (optional)</label>
            <label className="flex items-center gap-2 border border-dashed border-white/[0.15] rounded-xl px-4 py-3 mb-4 cursor-pointer text-sm text-nova-muted hover:border-nova-cyan/40 transition-colors">
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
              className="w-full bg-gradient-to-br from-nova-cyan to-nova-violet text-nova-bg py-3 rounded-xl font-semibold hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:translate-y-0"
            >
              {submitting ? "Submitting..." : "Submit return request"}
            </button>
          </div>
        </div>
      )}

      {chatOrderId && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-6 z-50"
          onClick={() => setChatOrderId(null)}
        >
          <div
            className="rounded-2xl w-full max-w-md flex flex-col bg-nova-bg2 border border-white/[0.1]"
            style={{ maxHeight: "70vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
              <h3 className="font-display text-lg font-bold">Order #{chatOrderId} - Support chat</h3>
              <button onClick={() => setChatOrderId(null)} className="text-nova-muted hover:text-nova-text">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-nova-muted text-center">No messages yet. Ask us anything about this order!</p>
              ) : (
                chatMessages.map((m) => (
                  <div key={m.id} className={`flex ${m.is_me ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.is_me
                          ? "bg-gradient-to-br from-nova-cyan to-nova-violet text-nova-bg"
                          : "bg-white/[0.05] border border-white/[0.08] text-nova-text"
                      }`}
                    >
                      {!m.is_me && <p className="text-xs font-medium text-nova-cyan mb-0.5">{m.sender_name}</p>}
                      <p>{m.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-white/[0.08] flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-nova-text placeholder:text-nova-muted focus:outline-none focus:border-nova-cyan/50 transition-colors"
              />
              <button
                onClick={sendChatMessage}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-nova-cyan to-nova-violet flex items-center justify-center text-nova-bg shrink-0"
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
      <NovaFooter />
    </main>
  );
}