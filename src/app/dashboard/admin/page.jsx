"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalDraft: 0,
    totalSubmitted: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalReopened: 0,
    pendingAction: 0,
  });

  const [financial, setFinancial] = useState(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState({});
  const [employeeBreakdown, setEmployeeBreakdown] = useState({});

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/dashboard/employee");
    }
  }, [status, session, router]);

  async function loadStats() {
    setLoading(true);

    const month = new Date().toISOString().slice(0, 7);

    const [statsRes, financialRes] = await Promise.all([
      fetch("/api/dashboard/admin-stats"),
      fetch(`/api/dashboard/financial-summary?month=${month}`),
    ]);

    const statsText = await statsRes.text();
    const financialText = await financialRes.text();

    let statsData = {};
    let financialData = {};

    try {
      statsData = statsText ? JSON.parse(statsText) : {};
    } catch {}

    try {
      financialData = financialText ? JSON.parse(financialText) : {};
    } catch {}

    setStats({
      totalEmployees: statsData.totalEmployees || 0,
      totalDraft: statsData.totalDraft || 0,
      totalSubmitted: statsData.totalSubmitted || 0,
      totalApproved: statsData.totalApproved || 0,
      totalRejected: statsData.totalRejected || 0,
      totalReopened: statsData.totalReopened || 0,
      pendingAction: statsData.pendingAction || 0,
    });

    setFinancial(financialData.summary || null);
    setCategoryBreakdown(financialData.categoryBreakdown || {});
    setEmployeeBreakdown(financialData.employeeBreakdown || {});

    setLoading(false);
  }

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      loadStats();
    }
  }, [status, session]);

  if (status === "loading") {
    return <div className="p-6">Loading...</div>;
  }

  if (!session || session.user.role !== "admin") {
    return null;
  }

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

        <div className="max-w-7xl p-6 space-y-8">

          {/* ================= STATS ================= */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>

            {loading ? (
              <div className="bg-white rounded-2xl shadow p-6">
                Loading stats...
              </div>
            ) : (
              <div className="grid md:grid-cols-3 xl:grid-cols-4 gap-4">
                <StatCard title="Total Employees" value={stats.totalEmployees} />
                <StatCard title="Pending Action" value={stats.pendingAction} />
                <StatCard title="Draft" value={stats.totalDraft} />
                <StatCard title="Submitted" value={stats.totalSubmitted} />
                <StatCard title="Approved" value={stats.totalApproved} />
                <StatCard title="Rejected" value={stats.totalRejected} />
                <StatCard title="Reopened" value={stats.totalReopened} />
              </div>
            )}
          </div>

         

  

          {/* ================= QUICK LINKS ================= */}
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Link href="/dashboard/admin/employees" className="bg-white rounded-2xl shadow p-6 hover:shadow-lg">
              <h3 className="font-semibold text-lg">Manage Employees</h3>
              <p className="text-gray-600 mt-2">Create and view employees.</p>
            </Link>

            <Link href="/dashboard/admin/holidays" className="bg-white rounded-2xl shadow p-6 hover:shadow-lg">
              <h3 className="font-semibold text-lg">Manage Holidays</h3>
              <p className="text-gray-600 mt-2">Add and delete month holidays.</p>
            </Link>

            <Link href="/dashboard/admin/timesheets" className="bg-white rounded-2xl shadow p-6 hover:shadow-lg">
              <h3 className="font-semibold text-lg">Review Timesheets</h3>
              <p className="text-gray-600 mt-2">Approve, reject, and reopen.</p>
            </Link>

            <Link href="/dashboard/admin/timesheets" className="bg-white rounded-2xl shadow p-6 hover:shadow-lg">
              <h3 className="font-semibold text-lg">Submission Control</h3>
              <p className="text-gray-600 mt-2">See monthly records by status.</p>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}