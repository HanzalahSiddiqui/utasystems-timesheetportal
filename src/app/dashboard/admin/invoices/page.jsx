"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

function SummaryCard({ title, value }) {
  return (
 <div className="rounded-3xl bg-white p-4 sm:p-8 shadow-sm ring-1 ring-slate-200 invoice-print">
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="mt-2 text-3xl font-bold text-slate-900">{value}</h3>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles =
    status === "paid"
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
      : status === "sent"
      ? "bg-violet-100 text-violet-700 ring-violet-200"
      : status === "finalized"
      ? "bg-sky-100 text-sky-700 ring-sky-200"
      : "bg-amber-100 text-amber-700 ring-amber-200";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${styles}`}
    >
      {status}
    </span>
  );
}

export default function InvoicesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchInvoices() {
    try {
      setLoading(true);
      setMessage("");

      const params = new URLSearchParams();
      if (month) params.set("month", month);
      if (statusFilter) params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/invoices?${params.toString()}`, {
        cache: "no-store",
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        setMessage(data.error || "Failed to fetch invoices");
        setItems([]);
        return;
      }

      setItems(data.items || []);
    } catch {
      setMessage("Something went wrong while loading invoices");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateInvoices() {
    try {
      setGenerating(true);
      setMessage("");

      const res = await fetch("/api/invoices/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ month }),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        setMessage(data.error || "Failed to generate invoices");
        return;
      }

      setMessage(data.message || "Invoices generated successfully");
      await fetchInvoices();
    } catch {
      setMessage("Something went wrong while generating invoices");
    } finally {
      setGenerating(false);
    }
  }

  async function quickAction(url, fallbackMessage) {
    try {
      const res = await fetch(url, {
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
        setMessage(data.error || fallbackMessage);
        return;
      }

      setMessage(data.message || "Invoice updated successfully");
      fetchInvoices();
    } catch {
      setMessage(fallbackMessage);
    }
  }

  useEffect(() => {
    fetchInvoices();
  }, [month, statusFilter]);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;

    return items.filter((item) => {
      const invoiceNumber = item.invoiceNumber?.toLowerCase() || "";
      const employeeName = item.employeeName?.toLowerCase() || "";
      const clientName = item.clientName?.toLowerCase() || "";
      const clientEmail = item.clientEmail?.toLowerCase() || "";
      const monthValue = item.month?.toLowerCase() || "";
      const status = item.status?.toLowerCase() || "";

      return (
        invoiceNumber.includes(q) ||
        employeeName.includes(q) ||
        clientName.includes(q) ||
        clientEmail.includes(q) ||
        monthValue.includes(q) ||
        status.includes(q)
      );
    });
  }, [items, search]);

  const summary = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        acc.totalInvoices += 1;
        acc.totalAmount += Number(item.totalDue || 0);
        return acc;
      },
      {
        totalInvoices: 0,
        totalAmount: 0,
      }
    );
  }, [filteredItems]);

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
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Invoices
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Generate and manage employee-wise client invoices.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="month"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />

                <button
                  onClick={handleGenerateInvoices}
                  disabled={generating}
                  className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
                >
                  {generating ? "Generating..." : "Generate Invoices"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SummaryCard title="Total Invoices" value={summary.totalInvoices} />
              <SummaryCard title="Total Amount" value={summary.totalAmount.toFixed(2)} />
            </div>

            <div className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search by employee, client, invoice no..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Status
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="draft">Draft</option>
                    <option value="finalized">Finalized</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={fetchInvoices}
                    className="w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {message && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {message}
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-slate-900">
                  Invoice Records
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  One invoice per employee payroll record.
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-[1450px] w-full">
                    <thead className="bg-slate-900 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Invoice No
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Employee
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Client
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Month
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Charges
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Total Due
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 bg-white">
                      {loading ? (
                        <tr>
                          <td colSpan="8" className="px-4 py-10 text-center text-slate-500">
                            Loading invoices...
                          </td>
                        </tr>
                      ) : filteredItems.length > 0 ? (
                        filteredItems.map((item) => (
                          <tr key={item._id} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                              {item.invoiceNumber}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-700">
                              <div>
                                <p className="font-semibold">{item.employeeName}</p>
                                <p className="text-xs text-slate-500">
                                  {item.jobTitle || "-"}
                                </p>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-700">
                              <div>
                                <p className="font-semibold">{item.clientName}</p>
                                <p className="text-xs text-slate-500">
                                  {item.clientEmail}
                                </p>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-700">
                              {item.month}
                            </td>

                            <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                              {Number(item.professionalServiceCharges || 0).toFixed(2)}
                            </td>

                            <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                              {Number(item.totalDue || 0).toFixed(2)}
                            </td>

                            <td className="px-4 py-4">
                              <StatusBadge status={item.status} />
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                <Link
                                  href={`/dashboard/admin/invoices/${item._id}`}
                                  className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white"
                                >
                                  View
                                </Link>

                                {item.status !== "finalized" &&
                                  item.status !== "sent" &&
                                  item.status !== "paid" && (
                                    <button
                                      onClick={() =>
                                        quickAction(
                                          `/api/invoices/${item._id}/finalize`,
                                          "Failed to finalize invoice"
                                        )
                                      }
                                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                                    >
                                      Finalize
                                    </button>
                                  )}

                                {item.status !== "sent" && item.status !== "paid" && (
                                  <button
                                    onClick={() =>
                                      quickAction(
                                        `/api/invoices/${item._id}/mark-sent`,
                                        "Failed to mark invoice as sent"
                                      )
                                    }
                                    className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white"
                                  >
                                    Mark Sent
                                  </button>
                                )}

                                {item.status !== "paid" && (
                                  <button
                                    onClick={() =>
                                      quickAction(
                                        `/api/invoices/${item._id}/mark-paid`,
                                        "Failed to mark invoice as paid"
                                      )
                                    }
                                    className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white"
                                  >
                                    Mark Paid
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="px-4 py-10 text-center text-slate-500">
                            No invoices found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Scroll horizontally to view all invoice columns on smaller screens.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}