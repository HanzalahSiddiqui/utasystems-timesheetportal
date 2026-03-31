"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

function StatusBadge({ status }) {
  const classes =
    status === "approved"
      ? "bg-green-100 text-green-700"
      : status === "rejected"
      ? "bg-red-100 text-red-700"
      : status === "submitted"
      ? "bg-blue-100 text-blue-700"
      : status === "reopened"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-gray-100 text-gray-700";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${classes}`}>
      {status}
    </span>
  );
}

export default function EmployeeTimesheetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadItem() {
    setLoading(true);

    const res = await fetch(`/api/monthly-timesheets/${params.id}`);
    const text = await res.text();

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    setItem(data.item || null);
    setLoading(false);
  }

  useEffect(() => {
    if (params?.id) {
      loadItem();
    }
  }, [params?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex bg-gray-100">
        <Sidebar role="employee" />
        <div className="flex-1">
          <Navbar user={session?.user?.name || "Employee"} />
          <div className="p-6">Loading...</div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex bg-gray-100">
        <Sidebar role="employee" />
        <div className="flex-1">
          <Navbar user={session?.user?.name || "Employee"} />
          <div className="p-6">Record not found</div>
        </div>
      </div>
    );
  }

  const regularTotal = item.entries.reduce(
    (sum, row) => sum + Number(row.regularHours || 0),
    0
  );

  const otTotal = item.entries.reduce(
    (sum, row) => sum + Number(row.otHours || 0),
    0
  );

  const grandTotal = regularTotal + otTotal;

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar role="employee" />

      <div className="flex-1">
        <Navbar user={session?.user?.name || "Employee"} />

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">My Timesheet Detail</h2>
            <button
              onClick={() => router.push("/dashboard/employee/my-timesheets")}
              className="bg-gray-200 px-4 py-2 rounded-lg"
            >
              Back
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow p-6 grid md:grid-cols-2 gap-4">
            <p><span className="font-semibold">Month:</span> {item.month}</p>
            <p><span className="font-semibold">Status:</span> <StatusBadge status={item.status} /></p>
            <p><span className="font-semibold">Locked:</span> {item.locked ? "Yes" : "No"}</p>
            <p>
              <span className="font-semibold">Submitted At:</span>{" "}
              {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "-"}
            </p>
            {item.reviewComment && (
              <p className="md:col-span-2">
                <span className="font-semibold">Admin Comment:</span> {item.reviewComment}
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-slate-700 text-white">
                <tr>
                  <th className="p-3 text-left">Day</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Regular Hours</th>
                  <th className="p-3 text-left">OT Hours</th>
                  <th className="p-3 text-left">Leave</th>
                  <th className="p-3 text-left">Holiday</th>
                  <th className="p-3 text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                {item.entries.map((row) => (
                  <tr key={row.date} className={`border-t ${row.isHoliday ? "bg-red-50" : "bg-white"}`}>
                    <td className="p-3">{row.dayName}</td>
                    <td className="p-3">{row.date}</td>
                    <td className="p-3">{row.regularHours}</td>
                    <td className="p-3">{row.otHours}</td>
                    <td className="p-3">{row.leaveType || "-"}</td>
                    <td className="p-3">{row.isHoliday ? row.holidayTitle || "Holiday" : "-"}</td>
                    <td className="p-3 font-semibold">{row.total}</td>
                  </tr>
                ))}
                <tr className="border-t-2 bg-slate-100 font-semibold">
                  <td className="p-4" colSpan="2">Monthly Total</td>
                  <td className="p-4">{regularTotal}</td>
                  <td className="p-4">{otTotal}</td>
                  <td className="p-4">-</td>
                  <td className="p-4">-</td>
                  <td className="p-4 text-lg">{grandTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}