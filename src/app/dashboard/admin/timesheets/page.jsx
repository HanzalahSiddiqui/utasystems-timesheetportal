"use client";

import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import MonthlySubmissionManager from "@/components/MonthlySubmissionManager";

export default function AdminTimesheetsPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;

  const [exportMonth, setExportMonth] = useState(defaultMonth);

  const exportHref = useMemo(() => {
    return `/api/monthly-timesheets/export?month=${encodeURIComponent(
      exportMonth || defaultMonth
    )}`;
  }, [exportMonth, defaultMonth]);

  return (
    <div className="min-h-screen flex bg-gray-100">
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

        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-2xl font-bold">Monthly Submission Control</h2>

            <div className="flex gap-3 items-center">
              <input
                type="month"
                value={exportMonth}
                onChange={(e) => setExportMonth(e.target.value)}
                className="border rounded-lg px-4 py-2"
              />

              <a
                href={exportHref}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg"
              >
                Export Employees Summary
              </a>
            </div>
          </div>

          <MonthlySubmissionManager />
        </div>
      </div>
    </div>
  );
}