"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
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

export default function MyTimesheetsPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadItems() {
    setLoading(true);

    const res = await fetch("/api/monthly-timesheets");
    const text = await res.text();

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { items: [] };
    }

    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    if (session?.user) {
      loadItems();
    }
  }, [session]);

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar role="employee" />

      <div className="flex-1">
        <Navbar user={session?.user?.name || "Employee"} />

        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">My Timesheets</h2>

          <div className="bg-white rounded-2xl shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700 text-white">
                <tr>
                  <th className="p-4 text-left">Month</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Locked</th>
                  <th className="p-4 text-left">Submitted At</th>
                  <th className="p-4 text-left">View</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : items.length > 0 ? (
                  items.map((item) => (
                    <tr key={item._id} className="border-t">
                      <td className="p-4">{item.month}</td>
                      <td className="p-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="p-4">{item.locked ? "Yes" : "No"}</td>
                      <td className="p-4">
                        {item.submittedAt
                          ? new Date(item.submittedAt).toLocaleString()
                          : "-"}
                      </td>
                      <td className="p-4">
                        <Link
                          href={`/dashboard/employee/my-timesheets/${item._id}`}
                          className="bg-slate-800 text-white px-4 py-2 rounded-lg inline-block"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-gray-500">
                      No timesheets found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}