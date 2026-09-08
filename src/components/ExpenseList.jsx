"use client";

import Link from "next/link";
import ExpenseStatusBadge from "@/components/ExpenseStatusBadge";

export default function ExpenseList({
  items = [],
  admin = false,
  onApprove = () => {},
  onReject = () => {},
  onRefresh = () => {},
}) {
  /* ================================
     DELETE
  ================================= */

  async function handleDelete(item) {
    let message =
      "Are you sure you want to delete this expense?";

    if (item.status === "approved") {
      message =
        "WARNING: This expense is already APPROVED.\n\nAre you sure you want to delete it?";
    }

    if (item.status === "paid") {
      message =
        "WARNING: This expense is already PAID.\n\nDeleting a paid expense may affect financial records.\n\nAre you absolutely sure you want to continue?";
    }

    if (!confirm(message)) return;

    try {
      const res = await fetch(
        `/api/expenses/${item._id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(
          data.error ||
            "Delete failed"
        );
        return;
      }

      alert(
        "Expense deleted successfully"
      );

      onRefresh();

    } catch (error) {
      console.error(
        "Delete expense error:",
        error
      );

      alert("Delete failed");
    }
  }

  /* ================================
     APPROVE
  ================================= */

  function handleApprove(item) {
    if (item.status === "paid") {
      alert(
        "This expense is already paid."
      );
      return;
    }

    if (item.status === "approved") {
      alert(
        "This expense is already approved."
      );
      return;
    }

    const confirmed = confirm(
      `Approve expense ${item.expenseId || ""}?\n\n` +
      `Amount: ${Number(
        item.amount || 0
      ).toFixed(2)}`
    );

    if (!confirmed) return;

    onApprove(item._id);
  }

  /* ================================
     REJECT
  ================================= */

  function handleReject(item) {
    if (item.status === "paid") {
      alert(
        "A paid expense cannot be rejected."
      );
      return;
    }

    const confirmed = confirm(
      `Reject expense ${item.expenseId || ""}?`
    );

    if (!confirmed) return;

    onReject(item);
  }

  /* ================================
     PAID BY DISPLAY
  ================================= */

  function getPaidBy(item) {
    if (item.paidBy === "company") {
      return "Company";
    }

    return (
      item.paidByName ||
      item.paidByEmployeeId?.name ||
      item.employeeName ||
      "Employee"
    );
  }

  /* ================================
     CATEGORY DISPLAY
  ================================= */

  function getCategoryDisplay(item) {
    if (item.category === "other") {
      if (item.otherExpenseType) {
        return `Other — ${item.otherExpenseType}`;
      }

      return "Other";
    }

    return item.category || "-";
  }

  /* ================================
     DELETE PERMISSION
  ================================= */

  function canDelete(item) {
    /*
      ADMIN:
      Full control.
      Warning is shown inside handleDelete().
    */

    if (admin) {
      return true;
    }

    /*
      EMPLOYEE:
      Strict permissions.
      Cannot delete approved or paid.
    */

    return [
      "draft",
      "submitted",
    ].includes(item.status);
  }

  /* ================================
     APPROVE PERMISSION
  ================================= */

  function canApprove(item) {
    return (
      admin &&
      item.status !== "approved" &&
      item.status !== "paid"
    );
  }

  /* ================================
     REJECT PERMISSION
  ================================= */

  function canReject(item) {
    return (
      admin &&
      item.status !== "rejected" &&
      item.status !== "paid"
    );
  }

  return (
    <div className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">

      {/* ================================
          HEADER
      ================================= */}

      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">
          {admin
            ? "Expense Records"
            : "My Expenses"}
        </h2>
      </div>

      {/* ================================
          TABLE
      ================================= */}

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">

          <table className="min-w-[1500px] w-full">

            {/* ================================
                TABLE HEADER
            ================================= */}

            <thead className="bg-slate-900 text-white">

              <tr>

                {/* EXPENSE ID */}

                <th className="px-4 py-3 text-left whitespace-nowrap">
                  Expense ID
                </th>

                {/* EMPLOYEE - ADMIN ONLY */}

                {admin && (
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Employee
                  </th>
                )}

                {/* ADDED BY */}

                <th className="px-4 py-3 text-left whitespace-nowrap">
                  Added By
                </th>

                {/* CATEGORY */}

                <th className="px-4 py-3 text-left whitespace-nowrap">
                  Category
                </th>

                {/* AMOUNT */}

                <th className="px-4 py-3 text-left whitespace-nowrap">
                  Amount
                </th>

                {/* INCURRED BY */}

                <th className="px-4 py-3 text-left whitespace-nowrap">
                  Incurred By
                </th>

                {/* INCURRED FOR */}

                <th className="px-4 py-3 text-left whitespace-nowrap">
                  Incurred For
                </th>

                {/* PAID BY */}

                <th className="px-4 py-3 text-left whitespace-nowrap">
                  Paid By
                </th>

                {/* RECEIPT */}

                <th className="px-4 py-3 text-left whitespace-nowrap">
                  Receipt
                </th>

                {/* STATUS */}

                <th className="px-4 py-3 text-left whitespace-nowrap">
                  Status
                </th>

                {/* SUBMITTED AT */}

                <th className="px-4 py-3 text-left whitespace-nowrap">
                  Submitted At
                </th>

                {/* ACTIONS */}

                <th className="px-4 py-3 text-left whitespace-nowrap">
                  Actions
                </th>

              </tr>

            </thead>

            {/* ================================
                TABLE BODY
            ================================= */}

            <tbody>

              {items.length > 0 ? (

                items.map((item) => (

                  <tr
                    key={item._id}
                    className="hover:bg-slate-50"
                  >

                    {/* =========================
                        EXPENSE ID
                    ========================== */}

                    <td className="px-4 py-4 whitespace-nowrap">

                      {item.expenseId ? (

                        <span className="font-semibold text-slate-900">
                          {item.expenseId}
                        </span>

                      ) : (

                        <span className="text-slate-400">
                          —
                        </span>

                      )}

                    </td>

                    {/* =========================
                        EMPLOYEE - ADMIN ONLY
                    ========================== */}

                    {admin && (

                      <td className="px-4 py-4">

                        <div className="font-semibold">
                          {item.employeeName}
                        </div>

                        <div className="text-xs text-slate-500">
                          {item.employeeCode}
                        </div>

                      </td>

                    )}

                    {/* =========================
                        ADDED BY
                    ========================== */}

                    <td className="px-4 py-4">

                      {item.createdBy?.role ===
                      "admin"
                        ? "Admin"
                        : item.createdBy?.name ||
                          "Employee"}

                    </td>

                    {/* =========================
                        CATEGORY
                    ========================== */}

                    <td className="px-4 py-4">
                      {getCategoryDisplay(item)}
                    </td>

                    {/* =========================
                        AMOUNT
                    ========================== */}

                    <td className="px-4 py-4 font-semibold">

                      {Number(
                        item.amount || 0
                      ).toFixed(2)}

                    </td>

                    {/* =========================
                        INCURRED BY
                    ========================== */}

                    <td className="px-4 py-4">
                      {item.incurredByName}
                    </td>

                    {/* =========================
                        INCURRED FOR
                    ========================== */}

                    <td className="px-4 py-4 capitalize">
                      {item.incurredFor}
                    </td>

                    {/* =========================
                        PAID BY
                    ========================== */}

                    <td className="px-4 py-4">
                      {getPaidBy(item)}
                    </td>

                    {/* =========================
                        RECEIPT
                    ========================== */}

                    <td className="px-4 py-4">

                      {(() => {

                        const receipt =
                          item.receiptUrl ||
                          item.evidence?.[0]?.url;

                        if (!receipt) {

                          return (
                            <span className="text-red-500 text-sm">
                              No Receipt
                            </span>
                          );

                        }

                        return (

                          <div>

                            <a
                              href={receipt}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-blue-600 text-white px-2 py-1 rounded text-xs text-center inline-block"
                            >
                              View / Download Receipt
                            </a>

                          </div>

                        );

                      })()}

                    </td>

                    {/* =========================
                        STATUS
                    ========================== */}

                    <td className="px-4 py-4">

                      <ExpenseStatusBadge
                        status={item.status}
                      />

                    </td>

                    {/* =========================
                        SUBMITTED AT
                    ========================== */}

                    <td className="px-4 py-4 whitespace-nowrap">

                      {item.submittedAt
                        ? new Date(
                            item.submittedAt
                          ).toLocaleString()
                        : "-"}

                    </td>

                    {/* =========================
                        ACTIONS
                    ========================== */}

                    <td className="px-4 py-4">

                      <div className="flex gap-2 flex-wrap">

                        {/* VIEW */}

                        <Link
                          href={
                            admin
                              ? `/dashboard/admin/expenses/${item._id}`
                              : `/dashboard/employee/expenses/${item._id}`
                          }
                          className="bg-sky-600 text-white px-3 py-1 rounded"
                        >
                          View
                        </Link>

                        {/* DELETE */}

                        {canDelete(item) && (

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(item)
                            }
                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                          >
                            Delete
                          </button>

                        )}

                        {/* APPROVE */}

                        {canApprove(item) && (

                          <button
                            type="button"
                            onClick={() =>
                              handleApprove(item)
                            }
                            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                          >
                            Approve
                          </button>

                        )}

                        {/* REJECT */}

                        {canReject(item) && (

                          <button
                            type="button"
                            onClick={() =>
                              handleReject(item)
                            }
                            className="bg-red-700 text-white px-3 py-1 rounded hover:bg-red-800"
                          >
                            Reject
                          </button>

                        )}

                      </div>

                    </td>

                  </tr>

                ))

              ) : (

                <tr>

                  <td
                    colSpan={
                      admin ? 12 : 11
                    }
                    className="text-center py-8 text-gray-500"
                  >
                    No expenses found
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>
      </div>

    </div>
  );
}