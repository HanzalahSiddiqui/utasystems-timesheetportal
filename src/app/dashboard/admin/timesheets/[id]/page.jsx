"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useParams, useRouter } from "next/navigation";

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

export default function AdminTimesheetDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewComment, setReviewComment] = useState("");
  const [message, setMessage] = useState("");

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

async function review(action) {
  setMessage("");

  if (action === "rejected" && !reviewComment.trim()) {
    setMessage("Review comment is required for rejection");
    return;
  }

  const res = await fetch(`/api/monthly-timesheets/${params.id}/review`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action,
      reviewComment,
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
    setMessage(data.error || "Review failed");
    return;
  }

  setMessage(data.message || "Updated successfully");
  await loadItem();
}

  if (loading) {
    return (
      <div className="min-h-screen flex bg-gray-100">
        <Sidebar role="admin" />
        <div className="flex-1">
          <Navbar user="Admin User" />
          <div className="p-6">Loading...</div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex bg-gray-100">
        <Sidebar role="admin" />
        <div className="flex-1">
          <Navbar user="Admin User" />
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
      <Sidebar role="admin" />

      <div className="flex-1">
        <Navbar user="Admin User" />

        <div className="p-6 space-y-6">
         <div className="flex items-center justify-between gap-3 flex-wrap">
  <h2 className="text-2xl font-bold">Timesheet Detail</h2>

  <div className="flex gap-3">
    <a
      href={`/api/monthly-timesheets/${params.id}/export`}
      className="bg-emerald-600 text-white px-4 py-2 rounded-lg"
    >
      Export CSV
    </a>

    <button
      onClick={() => router.push("/dashboard/admin/timesheets")}
      className="bg-gray-200 px-4 py-2 rounded-lg"
    >
      Back
    </button>
  </div>
</div>

          <div className="bg-white rounded-2xl shadow p-6 grid md:grid-cols-2 gap-4">
            <p><span className="font-semibold">Employee:</span> {item.employeeId?.name}</p>
            <p><span className="font-semibold">Employee ID:</span> {item.employeeId?.employeeId}</p>
            <p><span className="font-semibold">Email:</span> {item.employeeId?.email}</p>
            <p><span className="font-semibold">Month:</span> {item.month}</p>
            <p>
              <span className="font-semibold">Status:</span>{" "}
              <StatusBadge status={item.status} />
            </p>
            <p><span className="font-semibold">Locked:</span> {item.locked ? "Yes" : "No"}</p>
            {item.reviewComment && (
              <p className="md:col-span-2">
                <span className="font-semibold">Review Comment:</span> {item.reviewComment}
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
                  <tr
                    key={row.date}
                    className={`border-t ${row.isHoliday ? "bg-red-50" : "bg-white"}`}
                  >
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

          <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            <h3 className="text-lg font-semibold">Admin Review</h3>

            <textarea
              rows="4"
              placeholder="Add review comment (required for rejection recommended)"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full border rounded-lg px-4 py-3"
            />

            {message && <p className="text-sm">{message}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => review("approved")}
                className="bg-green-600 text-white px-5 py-3 rounded-lg"
              >
                Approve
              </button>

              <button
                onClick={() => review("rejected")}
                className="bg-red-600 text-white px-5 py-3 rounded-lg"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}