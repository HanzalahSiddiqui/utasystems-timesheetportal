"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

function formatCurrency(num) {
  return Number(num || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
  });
}

const COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
];

export default function ProfitAnalyticsPage() {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;

  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState(null);

  async function loadData() {
    const res = await fetch(`/api/profit-analytics?month=${month}`);
    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    loadData();
  }, [month]);

  // ✅ CLEAN DATA (NO FAKE ENTRIES)
  const categoryData = Object.entries(
    data?.categoryBreakdown || {}
  ).map(([name, value]) => ({
    name,
    value,
  }));

  const employeeData = Object.entries(
    data?.employeeBreakdown || {}
  ).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar role="admin" />

      <div className="flex-1">
        <Navbar user="Admin User" />

        <div className="p-6 space-y-6">
          {/* HEADER */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">
              Profit Analytics
            </h1>

            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border px-3 py-2 rounded"
            />
          </div>

          {!data ? (
            <div>Loading...</div>
          ) : (
            <>
              {/* SUMMARY */}
              <div className="grid grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl shadow">
                  <p className="text-sm text-slate-500">Revenue</p>
                  <h2 className="text-lg font-bold">
                    {formatCurrency(data.summary.totalRevenue)}
                  </h2>
                </div>

                <div className="bg-white p-4 rounded-xl shadow">
                  <p className="text-sm text-slate-500">Payroll</p>
                  <h2 className="text-lg font-bold">
                    {formatCurrency(data.summary.totalPayrollCost)}
                  </h2>
                </div>

                <div className="bg-white p-4 rounded-xl shadow">
                  <p className="text-sm text-slate-500">Employee Expense</p>
                  <h2 className="text-lg font-bold">
                    {formatCurrency(data.summary.totalEmployeeExpense)}
                  </h2>
                </div>

                <div className="bg-white p-4 rounded-xl shadow">
                  <p className="text-sm text-slate-500">Company Expense</p>
                  <h2 className="text-lg font-bold">
                    {formatCurrency(data.summary.totalCompanyExpense)}
                  </h2>
                </div>

                <div className="bg-green-100 p-4 rounded-xl shadow">
                  <p className="text-sm text-slate-600">Net Profit</p>
                  <h2 className="text-lg font-bold text-green-700">
                    {formatCurrency(data.summary.netProfit)}
                  </h2>
                </div>
              </div>

              {/* CHARTS */}
              <div className="grid grid-cols-2 gap-6">
                {/* PIE */}
                <div className="bg-white rounded-2xl shadow p-4">
                  <h2 className="text-lg font-semibold mb-4">
                    Category Distribution
                  </h2>

                  <div style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={100}
                          label
                        >
                          {categoryData.map((_, index) => (
                            <Cell
                              key={`pie-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* BAR */}
                <div className="bg-white rounded-2xl shadow p-4">
                  <h2 className="text-lg font-semibold mb-4">
                    Employee Expense Chart
                  </h2>

                  <div style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={employeeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value">
                          {employeeData.map((_, index) => (
                            <Cell
                              key={`bar-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* CATEGORY TABLE */}
              <div className="bg-white rounded-2xl shadow p-4">
                <h2 className="text-lg font-semibold mb-4">
                  Category Breakdown
                </h2>

                <table className="w-full">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="p-3 text-left">Category</th>
                      <th className="p-3 text-left">Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {categoryData.map((item, index) => (
                      <tr key={`cat-${index}`} className="border-t">
                        <td className="p-3 capitalize">
                          {item.name}
                        </td>
                        <td className="p-3 font-semibold">
                          {formatCurrency(item.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* EMPLOYEE TABLE */}
              <div className="bg-white rounded-2xl shadow p-4">
                <h2 className="text-lg font-semibold mb-4">
                  Employee Expense Breakdown
                </h2>

                <table className="w-full">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="p-3 text-left">Employee</th>
                      <th className="p-3 text-left">Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {employeeData.map((item, index) => (
                      <tr key={`emp-${index}`} className="border-t">
                        <td className="p-3">{item.name}</td>
                        <td className="p-3 font-semibold">
                          {formatCurrency(item.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}