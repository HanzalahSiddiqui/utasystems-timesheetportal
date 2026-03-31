"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

export default function MonthlySubmissionManager() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [search, setSearch] = useState("");

  async function loadRecords() {
    setLoading(true);
    const res = await fetch("/api/monthly-timesheets");
    const text = await res.text();

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { items: [] };
    }

    setRecords(data.items || []);
    setLoading(false);
  }

  async function reopenRecord(id) {
    const res = await fetch(`/api/monthly-timesheets/${id}/reopen`, {
      method: "PATCH",
    });

    if (res.ok) {
      loadRecords();
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const matchesStatus = statusFilter ? item.status === statusFilter : true;
      const matchesMonth = monthFilter ? item.month === monthFilter : true;

      const employeeName = item.employeeId?.name?.toLowerCase() || "";
      const employeeCode = item.employeeId?.employeeId?.toLowerCase() || "";
      const q = search.toLowerCase();

      const matchesSearch = q
        ? employeeName.includes(q) || employeeCode.includes(q)
        : true;

      return matchesStatus && matchesMonth && matchesSearch;
    });
  }, [records, statusFilter, monthFilter, search]);

  if (loading) {
    return <div className="bg-white rounded-2xl shadow p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow p-4 grid md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Search employee name or ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-4 py-3"
        />

        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="border rounded-lg px-4 py-3"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-4 py-3"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="reopened">Reopened</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-700 text-white">
            <tr>
              <th className="p-4 text-left">Employee</th>
              <th className="p-4 text-left">Employee ID</th>
              <th className="p-4 text-left">Month</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Locked</th>
              <th className="p-4 text-left">View</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((item) => (
              <tr key={item._id} className="border-t">
                <td className="p-4">{item.employeeId?.name}</td>
                <td className="p-4">{item.employeeId?.employeeId}</td>
                <td className="p-4">{item.month}</td>
                <td className="p-4">
                  <StatusBadge status={item.status} />
                </td>
                <td className="p-4">{item.locked ? "Yes" : "No"}</td>
                <td className="p-4">
                  <Link
                    href={`/dashboard/admin/timesheets/${item._id}`}
                    className="bg-slate-800 text-white px-4 py-2 rounded-lg inline-block"
                  >
                    View
                  </Link>
                </td>
                <td className="p-4">
                  {item.locked ? (
                    <button
                      onClick={() => reopenRecord(item._id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                    >
                      Reopen
                    </button>
                  ) : (
                    <span className="text-gray-500">Open</span>
                  )}
                </td>
              </tr>
            ))}

            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan="7" className="p-6 text-center text-gray-500">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}