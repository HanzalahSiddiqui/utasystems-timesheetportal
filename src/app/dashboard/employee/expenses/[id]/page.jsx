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

  /* ================================
     LOAD EXPENSE
  ================================= */

  async function loadItem() {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/expenses/${params.id}`,
        {
          cache: "no-store",
        }
      );

      const text = await res.text();

      let data = {};

      try {
        data = text
          ? JSON.parse(text)
          : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        setItem(null);
        return;
      }

      setItem(data.item || null);

    } catch (error) {
      console.error(
        "Failed to load expense:",
        error
      );

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

  /* ================================
     LOADING
  ================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          Loading expense...
        </div>
      </div>
    );
  }

  /* ================================
     NOT FOUND
  ================================= */

  if (!item) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-slate-700">
            Expense not found.
          </p>

          <button
            onClick={() =>
              router.push(
                "/dashboard/employee/expenses"
              )
            }
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
          >
            Back to Expenses
          </button>
        </div>
      </div>
    );
  }

  /* ================================
     PAID BY
  ================================= */

  const paidBy =
    item.paidBy === "company"
      ? "Company"
      : item.paidByName ||
        item.paidByEmployeeId?.name ||
        "Employee";

  /* ================================
     EXPENSE DATE
  ================================= */

  const formattedExpenseDate =
    item.expenseDate
      ? new Date(
          item.expenseDate
        ).toLocaleDateString()
      : "-";

  /* ================================
     SUBMITTED DATE
  ================================= */

  const formattedSubmittedAt =
    item.submittedAt
      ? new Date(
          item.submittedAt
        ).toLocaleString()
      : "-";

  /* ================================
     RECEIPT
  ================================= */

  const receipt =
    item.receiptUrl ||
    item.evidence?.[0]?.url ||
    "";

  const isPdf =
    receipt.toLowerCase().includes(".pdf");

  /* ================================
     UI
  ================================= */

  return (
    <div className="min-h-screen bg-slate-100">

      <div className="flex min-h-screen">

        {/* SIDEBAR */}

        <Sidebar role="employee" />

        <div className="flex-1 min-w-0">

          {/* NAVBAR */}

          <Navbar
            user={
              session?.user?.name ||
              "Employee"
            }
          />

          <div className="mx-auto w-full max-w-[1200px] p-4 sm:p-6 space-y-6">

            {/* =========================
                HEADER
            ========================== */}

            <div className="flex items-center justify-between gap-3 flex-wrap">

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Expense Detail
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  View expense information and receipt
                </p>
              </div>

              <button
                onClick={() =>
                  router.push(
                    "/dashboard/employee/expenses"
                  )
                }
                className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
              >
                Back
              </button>

            </div>

            {/* =========================
                EXPENSE INFORMATION
            ========================== */}

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">

              <h2 className="mb-5 text-lg font-semibold text-slate-900">
                Expense Information
              </h2>

              <div className="grid gap-5 md:grid-cols-2">

                {/* EXPENSE ID */}

                <div>
                  <p className="text-sm text-slate-500">
                    Expense ID
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {item.expenseId || "-"}
                  </p>
                </div>

                {/* EXPENSE TYPE */}

                <div>
                  <p className="text-sm text-slate-500">
                    Expense Type
                  </p>

                  <p className="mt-1 font-semibold capitalize text-slate-900">
                    {item.expenseType ||
                      item.category ||
                      "-"}
                  </p>
                </div>

                {/* CATEGORY */}

                <div>
                  <p className="text-sm text-slate-500">
                    Category
                  </p>

                  <p className="mt-1 font-semibold capitalize text-slate-900">
                    {item.category || "-"}
                  </p>
                </div>

                {/* AMOUNT */}

                <div>
                  <p className="text-sm text-slate-500">
                    Amount
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {Number(
                      item.amount || 0
                    ).toFixed(2)}
                  </p>
                </div>

                {/* EXPENSE DATE */}

                <div>
                  <p className="text-sm text-slate-500">
                    Expense Date
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {formattedExpenseDate}
                  </p>
                </div>

                {/* SUBMITTED AT */}

                <div>
                  <p className="text-sm text-slate-500">
                    Submitted At
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {formattedSubmittedAt}
                  </p>
                </div>

                {/* INCURRED BY */}

                <div>
                  <p className="text-sm text-slate-500">
                    Incurred By
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {item.incurredByName ||
                      "-"}
                  </p>
                </div>

                {/* INCURRED FOR */}

                <div>
                  <p className="text-sm text-slate-500">
                    Incurred For
                  </p>

                  <p className="mt-1 font-medium capitalize text-slate-900">
                    {item.incurredFor ||
                      "-"}
                  </p>
                </div>

                {/* PAID BY */}

                <div>
                  <p className="text-sm text-slate-500">
                    Paid By
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {paidBy}
                  </p>
                </div>

                {/* STATUS */}

                <div>
                  <p className="mb-1 text-sm text-slate-500">
                    Status
                  </p>

                  <ExpenseStatusBadge
                    status={item.status}
                  />
                </div>

                {/* DESCRIPTION */}

                <div className="md:col-span-2">

                  <p className="text-sm text-slate-500">
                    Description
                  </p>

                  <div className="mt-2 rounded-2xl bg-slate-50 p-4">

                    <p className="text-slate-700 whitespace-pre-line">
                      {item.description ||
                        "-"}
                    </p>

                  </div>

                </div>

              </div>
            </div>

            {/* =========================
                ADMIN COMMENT
            ========================== */}

            {item.reviewComment && (

              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">

                <h2 className="mb-3 text-lg font-semibold text-slate-900">
                  Admin Comment
                </h2>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

                  <p className="text-slate-700 whitespace-pre-line">
                    {item.reviewComment}
                  </p>

                </div>

              </div>

            )}

            {/* =========================
                RECEIPT
            ========================== */}

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">

              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Receipt
              </h2>

              {receipt ? (

                <div className="space-y-4">

                  {/* VIEW / DOWNLOAD */}

                  <a
                    href={receipt}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    View / Download Receipt
                  </a>

                  {/* PDF */}

                  {isPdf ? (

                    <iframe
                      src={receipt}
                      title="Expense Receipt"
                      className="h-[600px] w-full rounded-2xl border"
                    />

                  ) : (

                    /* IMAGE */

                    <img
                      src={receipt}
                      alt="Expense Receipt"
                      className="max-h-[700px] w-full rounded-2xl bg-slate-50 object-contain"
                    />

                  )}

                </div>

              ) : (

                <div className="rounded-2xl bg-slate-50 p-6 text-center">

                  <p className="text-slate-500">
                    No receipt available
                  </p>

                </div>

              )}

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}