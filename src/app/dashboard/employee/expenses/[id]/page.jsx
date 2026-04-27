"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ExpenseStatusBadge from "@/components/ExpenseStatusBadge";

export default function EmployeeExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadItem() {
    try {
      setLoading(true);

      const res = await fetch(`/api/expenses/${params.id}`, {
        cache: "no-store",
      });

      const text = await res.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      setItem(data.item || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params?.id) loadItem();
  }, [params?.id]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!item) {
    return <div className="p-6">Expense not found</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar role="employee" />

        <div className="flex-1">
          <Navbar user={session?.user?.name || "Employee"} />

          <div className="mx-auto w-full max-w-[1200px] p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">
                Expense Detail
              </h1>

              <button
                onClick={() => router.push("/dashboard/employee/expenses")}
                className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Back
              </button>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 grid gap-4 md:grid-cols-2">
              <p><span className="font-semibold">Expense Type:</span> {item.expenseType}</p>
              <p><span className="font-semibold">Amount:</span> {Number(item.amount || 0).toFixed(2)}</p>
              <p><span className="font-semibold">Incurred By:</span> {item.incurredByName}</p>
              <p><span className="font-semibold">Incurred For:</span> {item.incurredFor}</p>
              <p><span className="font-semibold">Paid By:</span> {item.paidBy}</p>
              <p>
                <span className="font-semibold">Status:</span>{" "}
                <ExpenseStatusBadge status={item.status} />
              </p>

              <div className="md:col-span-2">
                <p className="font-semibold">Description:</p>
                <p className="mt-1 text-slate-700 whitespace-pre-line">
                  {item.description || "-"}
                </p>
              </div>

              {item.reviewComment ? (
                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold">Admin Comment</p>
                  <p className="mt-1 text-slate-700">{item.reviewComment}</p>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Receipt
              </h2>

            {item.receiptUrl ? (
  <div className="space-y-4">

    {/* 🔹 Button */}
    <a
      href={item.receiptUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
    >
      View / Download Receipt
    </a>

    {/* 🔹 Preview */}
    {item.receiptUrl.endsWith(".pdf") ? (
      <iframe
        src={item.receiptUrl}
        className="w-full h-[600px] rounded-2xl border"
      />
    ) : (
      <img
        src={item.receiptUrl}
        alt="Receipt"
        className="max-h-[700px] w-full rounded-2xl object-contain bg-slate-50"
      />
    )}
  </div>
) : (
  <p className="text-slate-500">No receipt available</p>
)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}