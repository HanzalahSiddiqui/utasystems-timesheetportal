"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

function InfoCard({ title, value, subtitle }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="mt-2 text-2xl font-bold text-slate-900">{value}</h3>
      {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
    </div>
  );
}

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

export default function PayrollDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    allowances: "",
    deductions: "",
    remarks: "",
    status: "draft",
  });

  async function loadItem() {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(`/api/payroll/${params.id}`, {
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
        setMessage(data.error || "Failed to fetch payroll record");
        setItem(null);
        return;
      }

      setItem(data.item);
      setForm({
        allowances: data.item.allowances ?? 0,
        deductions: data.item.deductions ?? 0,
        remarks: data.item.remarks ?? "",
        status: data.item.status ?? "draft",
      });
    } catch {
      setMessage("Something went wrong while loading payroll record");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params?.id) {
      loadItem();
    }
  }, [params?.id]);

  async function handleSave(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const res = await fetch(`/api/payroll/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          allowances: Number(form.allowances || 0),
          deductions: Number(form.deductions || 0),
          remarks: form.remarks || "",
          status: form.status,
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
        setMessage(data.error || "Failed to update payroll");
        return;
      }

      setMessage(data.message || "Payroll updated successfully");
      await loadItem();
    } catch {
      setMessage("Something went wrong while updating payroll");
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize() {
    try {
      setFinalizing(true);
      setMessage("");

      const res = await fetch(`/api/payroll/${params.id}/finalize`, {
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
      await loadItem();
    } catch {
      setMessage("Something went wrong while finalizing payroll");
    } finally {
      setFinalizing(false);
    }
  }

  async function handleMarkPaid() {
    try {
      setPaying(true);
      setMessage("");

      const res = await fetch(`/api/payroll/${params.id}/mark-paid`, {
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
      await loadItem();
    } catch {
      setMessage("Something went wrong while marking payroll as paid");
    } finally {
      setPaying(false);
    }
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

          <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 space-y-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <button
                  onClick={() => router.push("/dashboard/admin/payroll")}
                  className="mb-3 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
                >
                  ← Back to Payroll
                </button>

                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Payroll Detail
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Review payroll breakdown, adjustments, and update status.
                </p>
              </div>
            </div>

            {message && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                {message}
              </div>
            )}

            {loading ? (
              <div className="rounded-3xl bg-white p-10 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
                Loading payroll record...
              </div>
            ) : !item ? (
              <div className="rounded-3xl bg-white p-10 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
                Payroll record not found.
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <InfoCard
                    title="Employee"
                    value={item.employeeName}
                    subtitle={item.employeeCode}
                  />
                  <InfoCard title="Month" value={item.month} />
                  <InfoCard title="Pay Type" value={item.payType} />
                  <InfoCard title="Status" value={item.status} />
                  <InfoCard title="Department" value={item.department || "-"} />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <h2 className="mb-5 text-xl font-semibold text-slate-900">
                      Timesheet Summary
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <InfoCard title="Present Days" value={item.presentDays} />
                      <InfoCard title="Paid Leaves" value={item.paidLeaveDays} />
                      <InfoCard title="Unpaid Leaves" value={item.unpaidLeaveDays} />
                      <InfoCard title="Payable Days" value={item.payableDays} />
                      <InfoCard title="Regular Hours" value={item.regularHours} />
                      <InfoCard title="OT Hours" value={item.otHours} />
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <h2 className="mb-5 text-xl font-semibold text-slate-900">
                      Rate Configuration
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <InfoCard
                        title="Employee Daily Rate"
                        value={item.perDayRate ?? 0}
                      />
                      <InfoCard
                        title="Employee Hourly Rate"
                        value={item.perHourRate ?? 0}
                      />
                      <InfoCard
                        title="Employee OT Rate"
                        value={item.otRatePerHour ?? 0}
                      />
                      <InfoCard
                        title="Client Daily Rate"
                        value={item.clientPerDayRate ?? 0}
                      />
                      <InfoCard
                        title="Client Hourly Rate"
                        value={item.clientPerHourRate ?? 0}
                      />
                      <InfoCard
                        title="Client OT Rate"
                        value={item.clientOtRatePerHour ?? 0}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
                  <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <h2 className="mb-5 text-xl font-semibold text-slate-900">
                      Payroll Breakdown
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      <InfoCard title="Regular Pay" value={item.regularPay} />
                      <InfoCard title="OT Pay" value={item.otPay} />
                      <InfoCard title="Gross Salary" value={item.grossPay} />
                      <InfoCard
                        title="PO Regular Amount"
                        value={item.poRegularAmount}
                      />
                      <InfoCard title="PO OT Amount" value={item.poOtAmount} />
                      <InfoCard title="PO Amount" value={item.poAmount} />
                      <InfoCard title="Allowances" value={item.allowances} />
                      <InfoCard title="Deductions" value={item.deductions} />
                      <InfoCard title="Net Pay" value={item.netPay} />
                      <InfoCard title="Margin" value={item.margin} />
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <h2 className="mb-5 text-xl font-semibold text-slate-900">
                      Adjustments & Status
                    </h2>

                    <form onSubmit={handleSave} className="space-y-4">
                      <Field label="Allowances">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.allowances}
                          onChange={(e) =>
                            setForm({ ...form, allowances: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                        />
                      </Field>

                      <Field label="Deductions">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.deductions}
                          onChange={(e) =>
                            setForm({ ...form, deductions: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                        />
                      </Field>

                      <Field label="Status">
                        <select
                          value={form.status}
                          onChange={(e) =>
                            setForm({ ...form, status: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                        >
                          <option value="draft">draft</option>
                          <option value="finalized">finalized</option>
                          <option value="paid">paid</option>
                        </select>
                      </Field>

                      <Field label="Remarks">
                        <textarea
                          rows={5}
                          value={form.remarks}
                          onChange={(e) =>
                            setForm({ ...form, remarks: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                        />
                      </Field>

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
                          onClick={handleFinalize}
                          disabled={finalizing || item.status === "paid"}
                          className="rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white hover:bg-sky-700 disabled:opacity-70"
                        >
                          {finalizing ? "Finalizing..." : "Quick Finalize"}
                        </button>

                        <button
                          type="button"
                          onClick={handleMarkPaid}
                          disabled={paying || item.status === "paid"}
                          className="rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-70"
                        >
                          {paying ? "Updating..." : "Quick Mark Paid"}
                        </button>
                      </div>
                    </form>

                    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      <p>
                        You can now change payroll status manually from the dropdown
                        and save it.
                      </p>
                      <p className="mt-2">
                        Quick buttons are still available for faster actions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <InfoCard
                    title="Generated At"
                    value={
                      item.generatedAt
                        ? new Date(item.generatedAt).toLocaleString()
                        : "-"
                    }
                  />
                  <InfoCard
                    title="Finalized At"
                    value={
                      item.finalizedAt
                        ? new Date(item.finalizedAt).toLocaleString()
                        : "-"
                    }
                  />
                  <InfoCard
                    title="Paid At"
                    value={
                      item.paidAt ? new Date(item.paidAt).toLocaleString() : "-"
                    }
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}