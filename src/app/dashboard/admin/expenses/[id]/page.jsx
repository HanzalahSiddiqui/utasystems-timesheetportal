"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ReceiptUploadField from "@/components/ReceiptUploadField";
import ExpenseStatusBadge from "@/components/ExpenseStatusBadge";

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function AdminExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [item, setItem] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    expenseType: "travel",
    amount: "",
    description: "",
    receiptUrl: "",
    receiptFileName: "",
    incurredByName: "",
    incurredFor: "self",
    paidBy: "employee",
    status: "submitted",
    reviewComment: "",
  });

  async function loadItem() {
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

    if (data.item) {
      setForm({
        expenseType: data.item.expenseType || "travel",
        amount: data.item.amount ?? "",
        description: data.item.description || "",
        receiptUrl: data.item.receiptUrl || "",
        receiptFileName: data.item.receiptFileName || "",
        incurredByName: data.item.incurredByName || "",
        incurredFor: data.item.incurredFor || "self",
        paidBy: data.item.paidBy || "employee",
        status: data.item.status || "submitted",
        reviewComment: data.item.reviewComment || "",
      });
    }
  }

  useEffect(() => {
  if (!params?.id) return;

  loadItem();
}, [params]);

  async function saveChanges(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const res = await fetch(`/api/expenses/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount || 0),
        }),
      });

      const text = await res.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        setMessage(data.error || "Failed to update expense");
        return;
      }

      setMessage(data.message || "Expense updated successfully");
      await loadItem();
    } catch {
      setMessage("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function quickApprove() {
    const res = await fetch(`/api/expenses/${params.id}/approve`, {
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
    loadItem();
  }

  async function quickReject() {
    if (!form.reviewComment.trim()) {
      setMessage("Review comment is required for rejection");
      return;
    }

    const res = await fetch(`/api/expenses/${params.id}/reject`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reviewComment: form.reviewComment,
      }),
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
    loadItem();
  }

  if (!item) {
    return <div className="p-6">Loading...</div>;
  }

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

          <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <button
                  onClick={() => router.push("/dashboard/admin/expenses")}
                  className="mb-3 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
                >
                  ← Back to Expenses
                </button>

                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Expense Detail
                </h1>
              </div>

              <ExpenseStatusBadge status={item.status} />
            </div>

            {message ? (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                {message}
              </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="mb-5 text-xl font-semibold text-slate-900">
                  Receipt
                </h2>

        {form.receiptUrl ? (
  <div className="space-y-4">

    {/* 🔹 Button */}
    <a
      href={form.receiptUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
    >
      View / Download Receipt
    </a>

    {/* 🔹 Preview */}
    {form.receiptUrl.toLowerCase().endsWith(".pdf") ? (
      <iframe
        src={form.receiptUrl}
        className="w-full h-[600px] rounded-2xl border"
      />
    ) : (
      <img
        src={form.receiptUrl}
        alt="Receipt"
        className="max-h-[700px] w-full rounded-2xl object-contain bg-slate-50"
      />
    )}

  </div>
) : (
  <p className="text-slate-500">No receipt available</p>
)}
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="mb-5 text-xl font-semibold text-slate-900">
                  Expense Controls
                </h2>

                <form onSubmit={saveChanges} className="space-y-4">
                  <Field label="Expense Type">
                    <select
                      value={form.expenseType}
                      onChange={(e) =>
                        setForm({ ...form, expenseType: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3"
                    >
                      <option value="travel">travel</option>
                      <option value="meal">meal</option>
                      <option value="fuel">fuel</option>
                      <option value="hotel">hotel</option>
                      <option value="medical">medical</option>
                      <option value="office">office</option>
                      <option value="internet">internet</option>
                      <option value="transport">transport</option>
                      <option value="other">other</option>
                    </select>
                  </Field>

                  <Field label="Amount">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) =>
                        setForm({ ...form, amount: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3"
                    />
                  </Field>

                  <Field label="Incurred By / Whose Expense">
                    <input
                      value={form.incurredByName}
                      onChange={(e) =>
                        setForm({ ...form, incurredByName: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3"
                    />
                  </Field>

                  <Field label="Incurred For">
                    <select
                      value={form.incurredFor}
                      onChange={(e) =>
                        setForm({ ...form, incurredFor: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3"
                    >
                      <option value="self">self</option>
                      <option value="company">company</option>
                      <option value="client">client</option>
                      <option value="other">other</option>
                    </select>
                  </Field>

                  <Field label="Paid By">
                    <select
                      value={form.paidBy}
                      onChange={(e) =>
                        setForm({ ...form, paidBy: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3"
                    >
                      <option value="employee">employee</option>
                      <option value="company">company</option>
                    </select>
                  </Field>

                  <Field label="Status">
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3"
                    >
                      <option value="draft">draft</option>
                      <option value="submitted">submitted</option>
                      <option value="approved">approved</option>
                      <option value="rejected">rejected</option>
                      <option value="paid">paid</option>
                    </select>
                  </Field>

                  <Field label="Description">
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3"
                    />
                  </Field>

                  <Field label="Review Comment">
                    <textarea
                      rows={4}
                      value={form.reviewComment}
                      onChange={(e) =>
                        setForm({ ...form, reviewComment: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3"
                    />
                  </Field>

                  <ReceiptUploadField
                    value={form.receiptUrl}
                    onChange={({ receiptUrl, receiptFileName }) =>
                      setForm({ ...form, receiptUrl, receiptFileName })
                    }
                  />

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>

                    <button
                      type="button"
                      onClick={quickApprove}
                      className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
                    >
                      Quick Approve
                    </button>

                    <button
                      type="button"
                      onClick={quickReject}
                      className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
                    >
                      Quick Reject
                    </button>
                  </div>
                </form>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Submitted At
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {item.submittedAt
                        ? new Date(item.submittedAt).toLocaleString()
                        : "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Approved At
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {item.approvedAt
                        ? new Date(item.approvedAt).toLocaleString()
                        : "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Rejected At
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {item.rejectedAt
                        ? new Date(item.rejectedAt).toLocaleString()
                        : "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Paid At
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {item.paidAt
                        ? new Date(item.paidAt).toLocaleString()
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}   