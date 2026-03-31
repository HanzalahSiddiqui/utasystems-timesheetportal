"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";

export default function EmployeeDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState({
    totalMonths: 0,
    totalDraft: 0,
    totalSubmitted: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalReopened: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "employee") {
      router.replace("/dashboard/admin");
    }
  }, [status, session, router]);

  async function loadStats() {
    setLoading(true);

    const res = await fetch("/api/dashboard/employee-stats");
    const text = await res.text();

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    setStats({
      totalMonths: data.totalMonths || 0,
      totalDraft: data.totalDraft || 0,
      totalSubmitted: data.totalSubmitted || 0,
      totalApproved: data.totalApproved || 0,
      totalRejected: data.totalRejected || 0,
      totalReopened: data.totalReopened || 0,
    });

    setLoading(false);
  }

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "employee") {
      loadStats();
    }
  }, [status, session]);

  if (status === "loading") {
    return <div className="p-6">Loading...</div>;
  }

  if (!session || session.user.role !== "employee") {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar role="employee" />

      <div className="flex-1">
        <Navbar user={session?.user?.name || "Employee"} />

        <div className="p-6 max-w-7xl space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-6">Employee Dashboard</h2>

            {loading ? (
              <div className="bg-white rounded-2xl shadow p-6">Loading stats...</div>
            ) : (
              <div className="grid md:grid-cols-3 xl:grid-cols-4 gap-4">
                <StatCard title="Total Months" value={stats.totalMonths} />
                <StatCard title="Draft" value={stats.totalDraft} />
                <StatCard title="Submitted" value={stats.totalSubmitted} />
                <StatCard title="Approved" value={stats.totalApproved} />
                <StatCard title="Rejected" value={stats.totalRejected} />
                <StatCard title="Reopened" value={stats.totalReopened} />
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Link
              href="/dashboard/employee/get-timesheet"
              className="bg-white rounded-2xl shadow p-6 hover:shadow-lg"
            >
              <h3 className="font-semibold text-lg">Get Timesheet</h3>
              <p className="text-gray-600 mt-2">
                Select month and fill regular hours, OT, and leave.
              </p>
            </Link>

            <Link
              href="/dashboard/employee/my-timesheets"
              className="bg-white rounded-2xl shadow p-6 hover:shadow-lg"
            >
              <h3 className="font-semibold text-lg">My Timesheets</h3>
              <p className="text-gray-600 mt-2">
                View submitted, approved, rejected, and reopened records.
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}