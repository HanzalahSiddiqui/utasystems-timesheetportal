"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function payrollMonthLabel(value) {
  if (!/^\d{4}-\d{2}$/.test(value || "")) return value || "-";
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}-01T00:00:00.000Z`));
}

export default function AdminPayrollPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [month, setMonth] = useState(() => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, "0")}`;
  });

  const [statusFilter, setStatusFilter] = useState("");
  const [payTypeFilter, setPayTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [accountantEmail, setAccountantEmail] = useState("");
  const [accountantNote, setAccountantNote] = useState("");
  const [message, setMessage] = useState("");

  const fetchPayroll = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const params = new URLSearchParams();
      if (month) params.set("month", month);
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
  }, [month]);

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

  function handleReviewAccountantEmail(event) {
    event.preventDefault();
    if (!items.length) {
      setMessage("There are no payroll records for this month to include in the email.");
      return;
    }
    setMessage("");
    const draft = {
      month,
      recipient: accountantEmail.trim(),
      note: accountantNote,
      items: items.map((item) => ({
        id: item._id,
        employeeName: item.employeeName,
        monthlyGrossSalary: item.monthlyGrossSalary,
        annualGrossSalary: item.annualGrossSalary,
        grossPay: item.grossPay,
        presentDays: item.presentDays,
        payableDays: item.payableDays,
        regularPay: item.regularPay,
        perDiemOtherIncome: item.perDiemOtherIncome,
        numberOfDependents: item.numberOfDependents,
      })),
    };
    sessionStorage.setItem("accountantPayrollEmailDraft", JSON.stringify(draft));
    router.push("/dashboard/admin/payroll/email-draft");
  }

  async function updatePayrollStatus(id, action, successMessage) {
    try {
      const res = await fetch(`/api/payroll/${id}/${action}`, { method: "PATCH" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || `Failed to ${action === "finalize" ? "finalize" : "mark paid"}`);
        return;
      }
      setMessage(data.message || successMessage);
      await fetchPayroll();
    } catch {
      setMessage("Something went wrong while updating payroll status");
    }
  }

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem("accountantPayrollEmailDraft");
      if (!savedDraft) return;
      const draft = JSON.parse(savedDraft);
      if (draft.month) setMonth(draft.month);
      if (draft.recipient) setAccountantEmail(draft.recipient);
      if (typeof draft.note === "string") setAccountantNote(draft.note);
      sessionStorage.removeItem("accountantPayrollEmailDraft");
    } catch {
      sessionStorage.removeItem("accountantPayrollEmailDraft");
    }
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((item) => {
      const employeeName = item.employeeName?.toLowerCase() || "";
      const employeeCode = item.employeeCode?.toLowerCase() || "";
      const department = item.department?.toLowerCase() || "";
      const designation = item.designation?.toLowerCase() || "";

      const matchesSearch = !q || employeeName.includes(q) || employeeCode.includes(q) || department.includes(q) || designation.includes(q);
      const matchesStatus = !statusFilter || item.status === statusFilter;
      const matchesPayType = !payTypeFilter || item.payType === payTypeFilter;
      return matchesSearch && matchesStatus && matchesPayType;
    });
  }, [items, search, statusFilter, payTypeFilter]);

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

          <div className="w-full p-3 sm:p-5 lg:p-7 space-y-5">
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
            

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
              <SummaryCard title="Employees" value={summary.totalEmployees} />
              <SummaryCard title="Gross Earnings" value={summary.totalGross.toFixed(2)} />
              <SummaryCard title="PO Amount" value={summary.totalPo.toFixed(2)} />
              <SummaryCard title="Margin" value={summary.totalMargin.toFixed(2)} />
              <SummaryCard title="Net Payroll" value={summary.totalNet.toFixed(2)} />
              <SummaryCard title="Employer Tax (7.65%)" value={summary.totalEmployerTax.toFixed(2)} />

<SummaryCard
  title="Net Profit"
  value={summary.totalNetProfit.toFixed(2)}
/>
            </div>

            <form onSubmit={handleReviewAccountantEmail} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Payroll summary</h2>
                <p className="mt-1 text-sm text-slate-500">Open a clean monthly summary. Emailing it to the accountant is optional.</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(280px,2fr)_auto] lg:items-end">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Accountant email (optional)</label>
                  <input type="email" autoComplete="email" value={accountantEmail} onChange={(event) => setAccountantEmail(event.target.value)} placeholder="Only needed if sending by email" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Email note (optional)</label>
                  <input type="text" maxLength={4000} value={accountantNote} onChange={(event) => setAccountantNote(event.target.value)} placeholder="Add instructions for the accountant" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />
                </div>
                <button type="submit" disabled={loading || items.length === 0} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                  Summary
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-500">The summary opens separately. Nothing is sent unless you choose email and confirm it there.</p>
            </form>

            <div className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:grid-cols-2 xl:grid-cols-4 sm:p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Search employees</label>
                <input type="text" placeholder="Name, employee ID, department…" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Payroll status</label>
                <select className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">All statuses</option><option value="draft">Draft</option><option value="finalized">Finalized</option><option value="paid">Paid</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Pay type</label>
                <select className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" value={payTypeFilter} onChange={(event) => setPayTypeFilter(event.target.value)}>
                  <option value="">All pay types</option><option value="daily">Daily</option><option value="hourly">Hourly</option>
                </select>
              </div>
              <div className="flex items-end">
                <button type="button" onClick={fetchPayroll} className="w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800">Refresh</button>
              </div>
            </div>

            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-slate-900">Payroll records</h2>
                <p className="mt-1 text-sm text-slate-500">The main figures are shown on each employee card. Open calculation details for hours, overtime, PO, tax, margin, and expenses.</p>
              </div>
              {loading ? (
                <div className="rounded-2xl border border-slate-200 p-10 text-center text-slate-500">Loading payroll…</div>
              ) : filteredItems.length ? (
                <div className="space-y-3">
                  {filteredItems.map((item) => {
                    const monthlySalary = Number(item.monthlyGrossSalary || 0)
                      || Number(item.annualGrossSalary || 0) / 12;
                    return (
                      <article key={item._id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-slate-900">{item.employeeName}</h3>
                              <StatusBadge status={item.status} />
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{item.designation || "Employee"}{item.department ? ` · ${item.department}` : ""}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/dashboard/admin/payroll/${item._id}`} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">View</Link>
                            {item.status !== "finalized" && item.status !== "paid" && (
                              <button onClick={() => updatePayrollStatus(item._id, "finalize", "Payroll finalized successfully")} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Finalize</button>
                            )}
                            {item.status !== "paid" && (
                              <button onClick={() => updatePayrollStatus(item._id, "mark-paid", "Payroll marked paid")} className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white">Mark Paid</button>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 2xl:grid-cols-7">
                          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Month</p><p className="mt-1 text-sm font-semibold text-slate-900">{payrollMonthLabel(item.month)}</p></div>
                          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{monthlySalary > 0 ? "Contract gross / month" : "Monthly gross salary"}</p><p className="mt-1 text-sm font-semibold text-slate-900">{monthlySalary > 0 ? formatMoney(monthlySalary) : "Not configured"}</p></div>
                          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Days worked</p><p className="mt-1 text-sm font-semibold text-slate-900">{item.presentDays ?? item.payableDays ?? 0}</p><p className="mt-1 text-xs text-slate-500">Paid leave: {item.paidLeaveDays ?? 0} · Unpaid leave: {item.unpaidLeaveDays ?? 0}</p></div>
                          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Regular earning</p><p className="mt-1 text-sm font-semibold text-slate-900">{formatMoney(item.regularPay)}</p></div>
                          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Per diem / other income</p><p className="mt-1 text-sm font-semibold text-slate-900">{formatMoney(item.perDiemOtherIncome)}</p></div>
                          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Dependents</p><p className="mt-1 text-sm font-semibold text-slate-900">{item.numberOfDependents ?? 0}</p></div>
                          <div className="rounded-xl border border-sky-100 bg-sky-50 p-3"><p className="text-xs text-sky-700">Gross earnings</p><p className="mt-1 text-sm font-bold text-sky-900">{formatMoney(item.grossPay)}</p></div>
                        </div>

                        <details className="mt-4 border-t border-slate-100 pt-3">
                          <summary className="cursor-pointer select-none text-sm font-semibold text-sky-700">Calculation and business details</summary>
                          {item.payType === "daily" && monthlySalary > 0 && <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900">Daily rate = monthly gross ÷ month working days (weekends and entered weekday holidays excluded). Regular earning = daily rate × approved timesheet days worked.</p>}
                          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                            {[
                              ["Pay type", item.payType], ["Daily rate used", formatMoney(item.perDayRate)], ["Hourly rate", formatMoney(item.perHourRate)],
                              ["Regular hours", item.regularHours], ["Overtime hours", item.otHours], ["Overtime pay", formatMoney(item.otPay)],
                              ["Annual gross", formatMoney(item.annualGrossSalary)], ["Net pay", formatMoney(item.netPay)], ["PO amount", formatMoney(item.poAmount)],
                              ["Margin", formatMoney(item.margin)], ["Employer tax", formatMoney(item.employerTax)], ["Employee expenses", formatMoney(item.employeeExpense)],
                              ["Net profit", formatMoney(item.netProfit)],
                            ].map(([label, value]) => (
                              <div key={label} className="rounded-xl border border-slate-100 px-3 py-2"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-medium text-slate-800">{value ?? 0}</p></div>
                            ))}
                          </div>
                        </details>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 p-10 text-center text-slate-500">No payroll records found for this month.</div>
              )}
            </section>

            <div className="hidden rounded-3xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">
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


          </div>
        </div>
      </div>
    </div>
  );
}
