"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ExpenseList from "@/components/ExpenseList";

export default function AdminExpensesPage() {
  const [items, setItems] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadItems() {
    try {
      setLoading(true);

      const res = await fetch("/api/expenses", { cache: "no-store" });
      const text = await res.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function approveExpense(id) {
    try {
      const res = await fetch(`/api/expenses/${id}/approve`, {
        method: "PATCH",
      });

      const text = await res.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        setMessage(data.error || "Failed to approve expense");
        return;
      }

      setMessage(data.message || "Expense approved successfully");
      loadItems();
    } catch {
      setMessage("Something went wrong while approving expense");
    }
  }

  async function rejectExpense(item) {
    const reason = prompt("Enter rejection comment");
    if (!reason) return;

    try {
      const res = await fetch(`/api/expenses/${item._id}/reject`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewComment: reason }),
      });

      const text = await res.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        setMessage(data.error || "Failed to reject expense");
        return;
      }

      setMessage(data.message || "Expense rejected successfully");
      loadItems();
    } catch {
      setMessage("Something went wrong while rejecting expense");
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar
          role="admin"
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="min-w-0 flex-1">
          <Navbar
            user="Admin User"
            onMenuClick={() => setSidebarOpen(true)}
          />

          <div className="mx-auto w-full max-w-[1700px] p-4 sm:p-6 space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Expenses Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Review, edit, approve, and reject expense claims.
              </p>
            </div>

            {message ? (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                {message}
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                Loading expenses...
              </div>
            ) : (
              <ExpenseList
                items={items}
                admin
                onApprove={approveExpense}
                onReject={rejectExpense}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}