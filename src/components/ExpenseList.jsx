"use client";

import Link from "next/link";
import ExpenseStatusBadge from "@/components/ExpenseStatusBadge";

export default function ExpenseList({
  items = [],
  admin = false,
  onApprove = () => {},
  onReject = () => {},
}) {
  return (
    <div className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">
          {admin ? "Expense Records" : "My Expenses"}
        </h2>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full">
            <thead className="bg-slate-900 text-white">
              <tr>
                {admin ? (
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Employee
                  </th>
                ) : null}
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Incurred By
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Paid By
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Submitted At
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50 transition">
                    {admin ? (
                      <td className="px-4 py-4 text-sm text-slate-700">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {item.employeeName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.employeeCode}
                          </p>
                        </div>
                      </td>
                    ) : null}

                    <td className="px-4 py-4 text-sm capitalize text-slate-700">
                      {item.expenseType}
                    </td>

                    <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                      {Number(item.amount || 0).toFixed(2)}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700">
                      {item.incurredByName}
                    </td>

                    <td className="px-4 py-4 text-sm capitalize text-slate-700">
                      {item.paidBy}
                    </td>

                    <td className="px-4 py-4">
                      <ExpenseStatusBadge status={item.status} />
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700">
                      {item.submittedAt
                        ? new Date(item.submittedAt).toLocaleString()
                        : "-"}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={
                            admin
                              ? `/dashboard/admin/expenses/${item._id}`
                              : `/dashboard/employee/expenses/${item._id}`
                          }
                          className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white"
                        >
                          View
                        </Link>

                        {admin && item.status !== "approved" && item.status !== "paid" ? (
                          <button
                            onClick={() => onApprove(item._id)}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                          >
                            Approve
                          </button>
                        ) : null}

                        {admin && item.status !== "rejected" && item.status !== "paid" ? (
                          <button
                            onClick={() => onReject(item)}
                            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white"
                          >
                            Reject
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={admin ? 8 : 7}
                    className="px-4 py-10 text-center text-slate-500"
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