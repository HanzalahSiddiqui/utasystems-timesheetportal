"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseList from "@/components/ExpenseList";

export default function EmployeeExpensesPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  useEffect(() => {
    if (session?.user) loadItems();
  }, [session]);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar
          role="employee"
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="min-w-0 flex-1">
          <Navbar
            user={session?.user?.name || "Employee"}
            onMenuClick={() => setSidebarOpen(true)}
          />

          <div className="mx-auto w-full max-w-[1700px] p-4 sm:p-6 space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Expenses
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Create and track your expense claims.
              </p>
            </div>

            <ExpenseForm onSaved={loadItems} />

            {loading ? (
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                Loading expenses...
              </div>
            ) : (
              <ExpenseList items={items} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}