"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { formatInvoiceDate } from "@/lib/invoiceFormatters";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();

  const previewOuterRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState("");

  const [previewScale, setPreviewScale] = useState(1);
  const [previewHeight, setPreviewHeight] = useState(1123);

  const [form, setForm] = useState({
    invoiceNumber: "",
    issueDate: "",
    billingDateFrom: "",
    billingDateTo: "",
    professionalServiceCharges: "",
    totalDue: "",
    status: "draft",
    notes: "",
  });

  function updatePreviewScale() {
    if (!previewOuterRef.current) return;

    const availableWidth = previewOuterRef.current.clientWidth - 16;
    const baseWidth = 794;
    const baseHeight = 1123;

    const scale = Math.min(1, availableWidth / baseWidth);

    setPreviewScale(scale);
    setPreviewHeight(baseHeight * scale);
  }

  async function loadInvoice() {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(`/api/invoices/${params.id}`, {
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
        setMessage(data.error || "Failed to fetch invoice");
        setItem(null);
        return;
      }

      setItem(data.item);
      setForm({
        invoiceNumber: data.item.invoiceNumber || "",
        issueDate: data.item.issueDate
          ? new Date(data.item.issueDate).toISOString().split("T")[0]
          : "",
        billingDateFrom: data.item.billingDateFrom || "",
        billingDateTo: data.item.billingDateTo || "",
        professionalServiceCharges: data.item.professionalServiceCharges ?? 0,
        totalDue: data.item.totalDue ?? 0,
        status: data.item.status || "draft",
        notes: data.item.notes || "",
      });
    } catch {
      setMessage("Something went wrong while loading invoice");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params?.id) {
      loadInvoice();
    }
  }, [params?.id]);

  useEffect(() => {
    updatePreviewScale();

    window.addEventListener("resize", updatePreviewScale);
    return () => window.removeEventListener("resize", updatePreviewScale);
  }, []);

  useEffect(() => {
    updatePreviewScale();
  }, [loading, item]);

  async function handleSave(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const res = await fetch(`/api/invoices/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceNumber: form.invoiceNumber,
          issueDate: form.issueDate,
          billingDateFrom: form.billingDateFrom,
          billingDateTo: form.billingDateTo,
          professionalServiceCharges: Number(
            form.professionalServiceCharges || 0
          ),
          totalDue: Number(form.totalDue || 0),
          status: form.status,
          notes: form.notes,
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
        setMessage(data.error || "Failed to update invoice");
        return;
      }

      setMessage(data.message || "Invoice updated successfully");
      await loadInvoice();
    } catch {
      setMessage("Something went wrong while updating invoice");
    } finally {
      setSaving(false);
    }
  }

  async function quickAction(endpoint, fallbackMessage) {
    try {
      setMessage("");

      const res = await fetch(endpoint, {
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
      await loadInvoice();
    } catch {
      setMessage(fallbackMessage);
    }
  }

  async function handleDownloadPdf() {
    if (!item) return;

    try {
      setDownloading(true);
      setMessage("");

      const url = `/api/invoices/${params.id}/pdf`;
      window.open(url, "_blank");
    } catch (error) {
      console.error("PDF download error:", error);
      setMessage("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <div className="no-print">
          <Sidebar
            role="admin"
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="no-print">
            <Navbar
              user="Admin User"
              onMenuClick={() => setSidebarOpen(true)}
            />
          </div>

          <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 space-y-6">
            <div className="no-print flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <button
                  onClick={() => router.push("/dashboard/admin/invoices")}
                  className="mb-3 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
                >
                  ← Back to Invoices
                </button>

                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Invoice Detail
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Preview, edit, and export invoice.
                </p>
              </div>

              {!loading && item && (
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="w-full sm:w-auto rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
                >
                  {downloading ? "Preparing PDF..." : "Download PDF"}
                </button>
              )}
            </div>

            {message && (
              <div className="no-print rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                {message}
              </div>
            )}

            {loading ? (
              <div className="rounded-3xl bg-white p-10 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
                Loading invoice...
              </div>
            ) : !item ? (
              <div className="rounded-3xl bg-white p-10 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
                Invoice not found.
              </div>
            ) : (
              <>
                <div className="no-print grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
                  <div className="rounded-3xl bg-white p-3 sm:p-6 shadow-sm ring-1 ring-slate-200">
                    <div
                      ref={previewOuterRef}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:p-4 overflow-hidden"
                    >
                      <div
                        className="mx-auto"
                        style={{
                          width: `${794 * previewScale}px`,
                          height: `${previewHeight}px`,
                        }}
                      >
                        <div
                          className="invoice-pdf-page"
                          style={{
                            backgroundColor: "#ffffff",
                            color: "#0f172a",
                            transform: `scale(${previewScale})`,
                            transformOrigin: "top left",
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <img
                              src="/logo-left.jpeg"
                              alt="Left logo"
                              className="h-[72px] w-[72px] object-contain"
                            />

                            <img
                              src="/logo-right.png"
                              alt="Right logo"
                              className="h-[60px] w-[160px] object-contain"
                            />
                          </div>

                          <div className="mt-5 h-[10px] bg-[#2a4f84]" />

                          <div className="pt-10">
                            <h2 className="text-center text-[38px] font-medium tracking-wide text-[#0f2e63]">
                              INVOICE
                            </h2>

                            <div className="mt-12 grid grid-cols-2 gap-10 text-[13px] text-slate-900">
                              <div className="space-y-5">
                                <div className="uppercase leading-5">
                                  <div>UNIVERSAL TECHNOLOGY SYSTEMS</div>
                                  <div>AND ASSOCIATES LLC</div>
                                </div>

                                <div className="leading-6">
                                  <div>6675 Mediterranean Dr, Suite 304,</div>
                                  <div>McKinney, TX 75072.</div>
                                </div>

                                <div>
                                  <span className="text-blue-700 underline">
                                    accounts@utasystems.com
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <span className="font-semibold underline">
                                    Invoice No:
                                  </span>{" "}
                                  {form.invoiceNumber}
                                </div>

                                <div>
                                  <span className="font-semibold underline">
                                    Date:
                                  </span>{" "}
                                  {formatInvoiceDate(form.issueDate)}
                                </div>

                                <div>
                                  <span className="font-semibold underline">
                                    Resource Name:
                                  </span>{" "}
                                  {item.employeeName}
                                </div>
                              </div>
                            </div>

                            <div className="mt-14">
                              <h3 className="text-[28px] font-semibold tracking-wide text-slate-900">
                                BILL TO
                              </h3>
                              <div className="mt-2 h-px bg-slate-400" />

                              <div className="mt-5 space-y-4 text-[13px] text-slate-900">
                                <div className="uppercase">
                                  {item.clientName}
                                </div>

                                <div>
                                  <span className="text-blue-700 underline break-all">
                                    {item.clientEmail}
                                  </span>
                                </div>

                                {item.clientAddress ? (
                                  <div className="whitespace-pre-line leading-6">
                                    {item.clientAddress}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="mt-8 overflow-hidden border border-slate-300">
                              <table className="w-full border-collapse text-[13px]">
                                <tbody>
                                  <tr className="border-b border-slate-300">
                                    <td className="w-1/2 border-r border-slate-300 px-4 py-4 text-center font-semibold">
                                      Employee/Contractor Name:
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      {item.employeeName}
                                    </td>
                                  </tr>

                                  <tr className="border-b border-slate-300">
                                    <td className="border-r border-slate-300 px-4 py-4 text-center font-semibold">
                                      Job Title:
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      {item.jobTitle || "-"}
                                    </td>
                                  </tr>

                                  <tr className="border-b border-slate-300">
                                    <td className="border-r border-slate-300 px-4 py-4 text-center font-semibold">
                                      Billing Date From:
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      {form.billingDateFrom}
                                    </td>
                                  </tr>

                                  <tr className="border-b border-slate-300">
                                    <td className="border-r border-slate-300 px-4 py-4 text-center font-semibold">
                                      Billing Date To:
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      {form.billingDateTo}
                                    </td>
                                  </tr>

                                  <tr className="border-b border-slate-300">
                                    <td className="border-r border-slate-300 px-4 py-4 text-center font-semibold">
                                      Professional Service Charges:
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      $
                                      {Number(
                                        form.professionalServiceCharges || 0
                                      ).toFixed(2)}
                                    </td>
                                  </tr>

                                  <tr className="bg-slate-100">
                                    <td className="border-r border-slate-300 px-4 py-4 text-right font-bold">
                                      TOTAL DUE:
                                    </td>
                                    <td className="px-4 py-4 text-center font-bold">
                                      ${Number(form.totalDue || 0).toFixed(2)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="mt-16 h-[10px] bg-[#2a4f84]" />

                          <div className="grid grid-cols-2 gap-6 px-0 py-4 text-[12px] text-[#183d75]">
                            <div className="leading-6">
                              <div>
                                6675 Mediterranean Dr, Suite 304, McKinney, TX
                                75072
                              </div>
                              <div>Ph: +1 9452747148</div>
                              <div>Email: info@utasystems.com</div>
                            </div>

                            <div className="text-right font-semibold">
                              www.utasystems.com
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <h2 className="mb-5 text-xl font-semibold text-slate-900">
                      Invoice Controls
                    </h2>

                    <form onSubmit={handleSave} className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Invoice Number
                        </label>
                        <input
                          value={form.invoiceNumber}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              invoiceNumber: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Issue Date
                        </label>
                        <input
                          type="date"
                          value={form.issueDate}
                          onChange={(e) =>
                            setForm({ ...form, issueDate: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Billing Date From
                        </label>
                        <input
                          value={form.billingDateFrom}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              billingDateFrom: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Billing Date To
                        </label>
                        <input
                          value={form.billingDateTo}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              billingDateTo: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Professional Service Charges
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.professionalServiceCharges}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              professionalServiceCharges: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Total Due
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.totalDue}
                          onChange={(e) =>
                            setForm({ ...form, totalDue: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Status
                        </label>
                        <select
                          value={form.status}
                          onChange={(e) =>
                            setForm({ ...form, status: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                        >
                          <option value="draft">draft</option>
                          <option value="finalized">finalized</option>
                          <option value="sent">sent</option>
                          <option value="paid">paid</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Notes
                        </label>
                        <textarea
                          rows={5}
                          value={form.notes}
                          onChange={(e) =>
                            setForm({ ...form, notes: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                        />
                      </div>

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
                          onClick={() =>
                            quickAction(
                              `/api/invoices/${params.id}/finalize`,
                              "Failed to finalize invoice"
                            )
                          }
                          className="rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white hover:bg-sky-700"
                        >
                          Quick Finalize
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            quickAction(
                              `/api/invoices/${params.id}/mark-sent`,
                              "Failed to mark invoice as sent"
                            )
                          }
                          className="rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700"
                        >
                          Quick Mark Sent
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            quickAction(
                              `/api/invoices/${params.id}/mark-paid`,
                              "Failed to mark invoice as paid"
                            )
                          }
                          className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
                        >
                          Quick Mark Paid
                        </button>
                      </div>
                    </form>

                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Finalized At
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-900">
                          {item.finalizedAt
                            ? new Date(item.finalizedAt).toLocaleString()
                            : "-"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Sent At
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-900">
                          {item.sentAt
                            ? new Date(item.sentAt).toLocaleString()
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}