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

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/dashboard/employee");
    }
  }, [status, session, router]);

  async function loadStats() {
    setLoading(true);

    const res = await fetch("/api/dashboard/admin-stats");
    const text = await res.text();

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    setStats({
      totalEmployees: data.totalEmployees || 0,
      totalDraft: data.totalDraft || 0,
      totalSubmitted: data.totalSubmitted || 0,
      totalApproved: data.totalApproved || 0,
      totalRejected: data.totalRejected || 0,
      totalReopened: data.totalReopened || 0,
      pendingAction: data.pendingAction || 0,
    });

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
          <div>
            <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>

            {loading ? (
              <div className="bg-white rounded-2xl shadow p-6">Loading stats...</div>
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

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Link
              href="/dashboard/admin/employees"
              className="bg-white rounded-2xl shadow p-6 hover:shadow-lg"
            >
              <h3 className="font-semibold text-lg">Manage Employees</h3>
              <p className="text-gray-600 mt-2">Create and view employees.</p>
            </Link>

            <Link
              href="/dashboard/admin/holidays"
              className="bg-white rounded-2xl shadow p-6 hover:shadow-lg"
            >
              <h3 className="font-semibold text-lg">Manage Holidays</h3>
              <p className="text-gray-600 mt-2">Add and delete month holidays.</p>
            </Link>

            <Link
              href="/dashboard/admin/timesheets"
              className="bg-white rounded-2xl shadow p-6 hover:shadow-lg"
            >
              <h3 className="font-semibold text-lg">Review Timesheets</h3>
              <p className="text-gray-600 mt-2">Approve, reject, and reopen.</p>
            </Link>

            <Link
              href="/dashboard/admin/timesheets"
              className="bg-white rounded-2xl shadow p-6 hover:shadow-lg"
            >
              <h3 className="font-semibold text-lg">Submission Control</h3>
              <p className="text-gray-600 mt-2">See monthly records by status.</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}