"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

const DRAFT_KEY = "accountantPayrollEmailDraft";

function payrollMonthLabel(value) {
  if (!/^\d{4}-\d{2}$/.test(value || "")) return value || "-";
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}-01T00:00:00.000Z`));
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SummaryCard({ label, value, accent = false }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-bold ${accent ? "text-indigo-900" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

export default function AccountantPayrollDraftPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(DRAFT_KEY);
      if (stored) setDraft(JSON.parse(stored));
    } catch {
      setMessage("The saved draft could not be loaded. Please return to Payroll and prepare it again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !draft) router.replace("/dashboard/admin/payroll");
  }, [draft, loading, router]);

  const rows = useMemo(() => (draft?.items || []).map((item) => {
    const monthlySalary = Number(item.monthlyGrossSalary || 0) || Number(item.annualGrossSalary || 0) / 12;
    return {
      ...item,
      grossSalary: monthlySalary > 0 ? monthlySalary : Number(item.grossPay || 0),
      daysWorked: Number(item.presentDays ?? item.payableDays ?? 0),
      proRateSalary: Number(item.regularPay || 0),
      perDiem: Number(item.perDiemOtherIncome || 0),
      dependents: Number(item.numberOfDependents || 0),
    };
  }), [draft]);

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    grossSalary: acc.grossSalary + row.grossSalary,
    proRateSalary: acc.proRateSalary + row.proRateSalary,
    perDiem: acc.perDiem + row.perDiem,
  }), { grossSalary: 0, proRateSalary: 0, perDiem: 0 }), [rows]);

  async function sendEmail() {
    if (!draft.recipient) return;
    try {
      setSending(true);
      setMessage("");
      const response = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: draft.month, recipient: draft.recipient, note: draft.note }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to send accountant email");
      setMessage(data.message || "Accountant payroll email sent");
      setConfirmSendOpen(false);
      sessionStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      setMessage(error.message || "Something went wrong while sending the accountant email");
    } finally {
      setSending(false);
    }
  }

  if (loading || !draft) {
    return <div className="min-h-screen bg-slate-100 p-8 text-center text-slate-600">{loading ? "Loading email draft…" : "Opening Payroll…"}</div>;
  }

  return (
    <div className="payroll-summary-print min-h-screen bg-slate-100">
      <div className="payroll-summary-print-layout flex min-h-screen">
        <div className="print:hidden"><Sidebar role="admin" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} /></div>
        <div className="payroll-summary-print-content min-w-0 flex-1">
          <div className="print:hidden"><Navbar onMenuClick={() => setSidebarOpen(true)} /></div>
          <main className="payroll-summary-print-main mx-auto w-full max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
            <div className="payroll-summary-print-header flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Monthly payroll</p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Payroll summary — {payrollMonthLabel(draft.month)}</h1>
              </div>
              <button type="button" onClick={() => router.back()} className="print:hidden rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to Payroll</button>
            </div>

            <section className="payroll-summary-print-card space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Monthly payroll overview</h2>
                <p className="mt-1 text-sm text-slate-500">Summary totals and employee-level payroll figures for this month.</p>
              </div>
              <div className="payroll-summary-print-metrics grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Employees" value={rows.length} />
                <SummaryCard label="Gross salary total" value={money(totals.grossSalary)} />
                <SummaryCard label="Pro Rate Salary total" value={money(totals.proRateSalary)} accent />
                <SummaryCard label="Per diem / other total" value={money(totals.perDiem)} />
              </div>
              <div className="payroll-summary-print-table-wrap overflow-x-auto rounded-2xl border border-slate-300">
                <table className="payroll-summary-print-table w-full min-w-[1000px] border-collapse text-sm">
                  <thead className="bg-yellow-300 text-slate-950">
                    <tr>{["Name", "Month", "Gross Salary", "Number of Days Worked", "Pro Rate Salary", "Per Diem/Other income", "Number of Dependents"].map((heading) => <th key={heading} className="border border-slate-400 px-4 py-3 text-left font-semibold">{heading}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => <tr key={row.id} className="odd:bg-white even:bg-slate-50">
                      <td className="border border-slate-300 px-4 py-3 font-medium">{row.employeeName}</td>
                      <td className="border border-slate-300 px-4 py-3">{payrollMonthLabel(draft.month)}</td>
                      <td className="border border-slate-300 px-4 py-3 text-right">{money(row.grossSalary)}</td>
                      <td className="border border-slate-300 px-4 py-3 text-right">{row.daysWorked}</td>
                      <td className="border border-slate-300 px-4 py-3 text-right">{money(row.proRateSalary)}</td>
                      <td className="border border-slate-300 px-4 py-3 text-right">{money(row.perDiem)}</td>
                      <td className="border border-slate-300 px-4 py-3 text-right">{row.dependents}</td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            </section>

            {message && <div className="print:hidden rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{message}</div>}
            <footer className="print:hidden flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <p className="text-sm text-slate-600">Email is optional. You can print the summary or send it after reviewing.</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => window.print()} className="rounded-xl bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Print / Save as PDF</button>
                <button type="button" onClick={() => setConfirmSendOpen(true)} disabled={!draft.recipient || sending} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">Send by Email</button>
              </div>
            </footer>
            {!draft.recipient && <p className="print:hidden text-right text-xs text-amber-700">Add the accountant email on the Payroll page to enable email sending.</p>}
          </main>
        </div>
      </div>
      {confirmSendOpen && (
        <div className="print:hidden fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="confirm-email-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-xl text-indigo-700" aria-hidden="true">✉</div>
            <h2 id="confirm-email-title" className="text-xl font-bold text-slate-900">Send this payroll summary?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">This will email the {payrollMonthLabel(draft.month)} payroll summary to:</p>
            <p className="mt-3 break-all rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">{draft.recipient}</p>
            {draft.note?.trim() && <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email note</p><p className="mt-1 whitespace-pre-wrap rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">{draft.note}</p></div>}
            {message && <p className="mt-4 text-sm text-red-700">{message}</p>}
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmSendOpen(false)} disabled={sending} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">No, go back</button>
              <button type="button" onClick={sendEmail} disabled={sending} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">{sending ? "Sending…" : "Yes, send email"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
