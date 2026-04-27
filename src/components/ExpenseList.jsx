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

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      alert("Deleted successfully");
      onRefresh(); // 🔥 AUTO REFRESH

    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  }

  return (
    <div className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">
          {admin ? "Expense Records" : "My Expenses"}
        </h2>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-[1400px] w-full">
            <thead className="bg-slate-900 text-white">
              <tr>
                {admin && <th className="px-4 py-3">Employee</th>}
                <th>Added By</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Incurred By</th>
                <th className="px-4 py-3">Incurred For</th>
                <th className="px-4 py-3">Paid By</th>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted At</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50">

                    {admin && (
                      <td className="px-4 py-4">
                        <div className="font-semibold">{item.employeeName}</div>
                        <div className="text-xs text-slate-500">
                          {item.employeeCode}
                        </div>
                      </td>
                    )}
                    <td>
  {item.createdBy?.role === "admin"
    ? "Admin"
    : item.createdBy?.name || "Employee"}
</td>

                    <td className="px-4 py-4 capitalize">
                      {item.category}
                    </td>

                    <td className="px-4 py-4 font-semibold">
                      {Number(item.amount || 0).toFixed(2)}
                    </td>

                    <td className="px-4 py-4">
                      {item.incurredByName}
                    </td>

                    <td className="px-4 py-4 capitalize">
                      {item.incurredFor}
                    </td>

                    <td className="px-4 py-4 capitalize">
                      {item.paidBy}
                    </td>

                <td className="px-4 py-4">
  {(() => {
    const receipt =
      item.receiptUrl || item.evidence?.[0]?.url;

    if (!receipt) {
      return <span className="text-red-500 text-sm">No Receipt</span>;
    }

    const viewUrl = receipt.includes("/image/upload/")
      ? receipt.replace("/image/upload/", "/raw/upload/")
      : receipt;

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

                    <td className="px-4 py-4">
                      <ExpenseStatusBadge status={item.status} />
                    </td>

                    <td className="px-4 py-4">
                      {item.submittedAt
                        ? new Date(item.submittedAt).toLocaleString()
                        : "-"}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex gap-2 flex-wrap">

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

                        {(admin || item.status !== "approved") &&
                          item.status !== "paid" && (
                            <button
                              onClick={() => handleDelete(item._id)}
                              className="bg-red-600 text-white px-3 py-1 rounded"
                            >
                              Delete
                            </button>
                          )}

                        {admin && item.status !== "approved" && (
                          <button
                            onClick={() => onApprove(item._id)}
                            className="bg-green-600 text-white px-3 py-1 rounded"
                          >
                            Approve
                          </button>
                        )}

                        {admin && item.status !== "rejected" && (
                          <button
                            onClick={() => onReject(item)}
                            className="bg-red-700 text-white px-3 py-1 rounded"
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
                  <td colSpan={10} className="text-center py-8 text-gray-500">
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