"use client";

import { useEffect, useState } from "react";
import { api } from "@/context/AuthContext";

interface Customer {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/customers")
      .then((res) => setCustomers(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Customers</h1>

      <div className="bg-nexora-surface border border-nexora-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nexora-border text-nexora-muted text-left">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-nexora-muted">Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-nexora-muted">No customers yet.</td></tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="border-b border-nexora-border last:border-0">
                  <td className="px-5 py-3 font-medium">{c.full_name || "—"}</td>
                  <td className="px-5 py-3 text-nexora-muted">{c.email}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${c.is_active ? "bg-nexora-success/10 text-nexora-success" : "bg-nexora-danger/10 text-nexora-danger"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-nexora-muted">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}