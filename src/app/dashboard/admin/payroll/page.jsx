"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";  

function SummaryCard({ title, value }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="mt-2 text-3xl font-bold text-slate-900">{value}</h3>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles =
    status === "paid"
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
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

function PayTypeBadge({ payType }) {
  const styles =
    payType === "hourly"
      ? "bg-violet-100 text-violet-700 ring-violet-200"
      : "bg-sky-100 text-sky-700 ring-sky-200";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${styles}`}
    >
      {payType}
    </span>
  );
}

export default function AdminPayrollPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [statusFilter, setStatusFilter] = useState("");
  const [payTypeFilter, setPayTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchPayroll() {
    try {
      setLoading(true);
      setMessage("");

      const params = new URLSearchParams();
      if (month) params.set("month", month);
      if (statusFilter) params.set("status", statusFilter);
      if (payTypeFilter) params.set("payType", payTypeFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/payroll?${params.toString()}`, {
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
        setMessage(data.error || "Failed to fetch payroll");
        setItems([]);
        return;
      }

      setItems(data.items || []);
    } catch {
      setMessage("Something went wrong while loading payroll");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleGeneratePayroll() {
    try {
      setGenerating(true);
      setMessage("");

      const res = await fetch("/api/payroll/generate", {
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
        setMessage(data.error || "Failed to generate payroll");
        return;
      }

      setMessage(data.message || "Payroll generated successfully");
      await fetchPayroll();
    } catch {
      setMessage("Something went wrong while generating payroll");
    } finally {
      setGenerating(false);
    }
  }
  function handleExportCsv() {
  const params = new URLSearchParams();

  if (month) params.set("month", month);
  if (statusFilter) params.set("status", statusFilter);
  if (payTypeFilter) params.set("payType", payTypeFilter);
  if (search.trim()) params.set("search", search.trim());

  const url = `/api/payroll/export?${params.toString()}`;
  window.open(url, "_blank");
}

  useEffect(() => {
    fetchPayroll();
  }, [month, statusFilter, payTypeFilter]);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;

    return items.filter((item) => {
      const employeeName = item.employeeName?.toLowerCase() || "";
      const employeeCode = item.employeeCode?.toLowerCase() || "";
      const department = item.department?.toLowerCase() || "";
      const designation = item.designation?.toLowerCase() || "";

      return (
        employeeName.includes(q) ||
        employeeCode.includes(q) ||
        department.includes(q) ||
        designation.includes(q)
      );
    });
  }, [items, search]);

  const summary = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        acc.totalEmployees += 1;
        acc.totalGross += Number(item.grossPay || 0);
        acc.totalPo += Number(item.poAmount || 0);
        acc.totalEmployerTax += Number(item.employerTax || 0);
        acc.totalNetProfit += Number(item.netProfit || 0);
        acc.totalMargin += Number(item.margin || 0);
        acc.totalNet += Number(item.netPay || 0);
        return acc;
      },
     {
  totalEmployees: 0,
  totalGross: 0,
  totalPo: 0,
  totalMargin: 0,
  totalNet: 0,
  totalEmployerTax: 0,
  totalNetProfit: 0,
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
                  Payroll Management
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Generate payroll, PO amount, and margin from approved timesheets.
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
    onClick={handleGeneratePayroll}
    disabled={generating}
    className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
  >
    {generating ? "Generating..." : "Generate Payroll"}
  </button>

  <button
    onClick={handleExportCsv}
    className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
  >
    Export CSV
  </button>
</div>
              
            </div>
            

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
              <SummaryCard title="Employees" value={summary.totalEmployees} />
              <SummaryCard title="Gross Salary" value={summary.totalGross.toFixed(2)} />
              <SummaryCard title="PO Amount" value={summary.totalPo.toFixed(2)} />
              <SummaryCard title="Margin" value={summary.totalMargin.toFixed(2)} />
              <SummaryCard title="Net Payroll" value={summary.totalNet.toFixed(2)} />
              <SummaryCard title="Employer Tax (7.65%)" value={summary.totalEmployerTax.toFixed(2)} />

<SummaryCard
  title="Net Profit"
  value={summary.totalNetProfit.toFixed(2)}
/>
            </div>

            <div className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search by employee, ID, dept..."
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
                    <option value="paid">Paid</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Pay Type
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    value={payTypeFilter}
                    onChange={(e) => setPayTypeFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="daily">Daily</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={fetchPayroll}
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
                  Payroll Records
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Employee payout and PO amount based on approved timesheets.
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-[1500px] w-full">
                    <thead className="bg-slate-900 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Employee</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Employee ID</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Department</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Pay Type</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Present Days</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Regular Hours</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">OT Hours</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Gross Salary</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">PO Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Margin</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Employee Expense</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Real Profit</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Net Pay</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Employer Tax</th>
<th className="px-4 py-3 text-left text-sm font-semibold">Net Profit</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 bg-white">
                      {loading ? (
                        <tr>
                          <td colSpan="12" className="px-4 py-10 text-center text-slate-500">
                            Loading payroll...
                          </td>
                        </tr>
                        
                      ) : filteredItems.length > 0 ? (
                        filteredItems.map((item) => (
                          <tr key={item._id} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-4">
                              <div>
                                <p className="font-semibold text-slate-900">{item.employeeName}</p>
                                <p className="text-sm text-slate-500">{item.designation || "-"}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm font-medium text-slate-700">
                              {item.employeeCode}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {item.department || "-"}
                            </td>
                            <td className="px-4 py-4">
                              <PayTypeBadge payType={item.payType} />
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {item.presentDays}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {item.regularHours}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {item.otHours}
                            </td>
                            <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                              {item.grossPay}
                            </td>
                            <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                              {item.poAmount}
                            </td>
                           <td className="px-4 py-4 text-sm font-semibold text-emerald-700">
  {item.margin}
</td>

<td className="px-4 py-4 text-sm font-semibold text-red-600">
  {item.employeeExpense || 0}
</td>

<td className="px-4 py-4 text-sm font-semibold text-green-700">
  {item.realProfit || 0}
</td>

<td className="px-4 py-4 text-sm font-semibold text-slate-900">
  {item.netPay}
</td>
                            <td className="px-4 py-4 text-sm text-red-600 font-semibold">
                              {item.employerTax}</td>
                            <td className="px-4 py-4 text-sm font-semibold text-emerald-700">
                              {item.netProfit}
                            </td>
                            <td className="px-4 py-4">
                              <StatusBadge status={item.status} />
                            </td>
                     <td className="px-4 py-4">
  <div className="flex flex-wrap gap-2">
    <Link
      href={`/dashboard/admin/payroll/${item._id}`}
      className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white"
    >
      View
    </Link>

    {item.status !== "finalized" && item.status !== "paid" && (
      <button
        onClick={async () => {
          try {
            const res = await fetch(`/api/payroll/${item._id}/finalize`, {
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
              setMessage(data.error || "Failed to finalize payroll");
              return;
            }

            setMessage(data.message || "Payroll finalized successfully");
            fetchPayroll();
          } catch {
            setMessage("Something went wrong while finalizing payroll");
          }
        }}
        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
      >
        Finalize
      </button>
    )}

    {item.status !== "paid" && (
      <button
        onClick={async () => {
          try {
            const res = await fetch(`/api/payroll/${item._id}/mark-paid`, {
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
              setMessage(data.error || "Failed to mark payroll as paid");
              return;
            }

            setMessage(data.message || "Payroll marked as paid successfully");
            fetchPayroll();
          } catch {
            setMessage("Something went wrong while marking payroll as paid");
          }
        }}
        className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white"
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
                          <td colSpan="15" className="px-4 py-10 text-center text-slate-500">
                            No payroll records found
                          </td>
                        </tr>
                        
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Scroll horizontally to view all payroll columns on smaller screens.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}