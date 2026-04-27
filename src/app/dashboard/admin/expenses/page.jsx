"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ExpenseList from "@/components/ExpenseList";
import ExpenseFormAdmin from "@/components/ExpenseFormAdmin";

export default function AdminExpensesPage() {
  const [items, setItems] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔥 FILTER STATES
  const [filterType, setFilterType] = useState("all"); // all | company | employee
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employees, setEmployees] = useState([]);

  /* ================================
     🔹 LOAD EXPENSES
  ================================= */
  async function loadItems() {
    try {
      setLoading(true);

      const res = await fetch("/api/expenses", { cache: "no-store" });
      const data = await res.json();

      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  /* ================================
     🔹 LOAD EMPLOYEES (for filter)
  ================================= */
  async function loadEmployees() {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setEmployees(data.items || data.employees || []);
    } catch {
      setEmployees([]);
    }
  }

  useEffect(() => {
    loadItems();
    loadEmployees();
  }, []);

  /* ================================
     🔹 APPROVE
  ================================= */
  async function approveExpense(id) {
    try {
      const res = await fetch(`/api/expenses/${id}/approve`, {
        method: "PATCH",
      });

      const data = await res.json();

      if (data.error) {
        setMessage(data.error);
        return;
      }

      setMessage("Expense approved successfully");
      loadItems();
    } catch {
      setMessage("Something went wrong while approving expense");
    }
  }

  /* ================================
     🔹 REJECT
  ================================= */
  async function rejectExpense(item) {
    const reason = prompt("Enter rejection comment");
    if (!reason) return;

    try {
      const res = await fetch(`/api/expenses/${item._id}/reject`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewComment: reason }),
      });

      const data = await res.json();

      if (data.error) {
        setMessage(data.error);
        return;
      }

      setMessage("Expense rejected successfully");
      loadItems();
    } catch {
      setMessage("Something went wrong while rejecting expense");
    }
  }

  /* ================================
     🔹 FILTER LOGIC
  ================================= */
  const filteredItems = items.filter((item) => {

    // company vs employee
    if (filterType === "company" && item.expenseOwnerType !== "company") {
      return false;
    }

    if (filterType === "employee" && item.expenseOwnerType !== "employee") {
      return false;
    }

    // specific employee
    if (selectedEmployee && item.employeeId !== selectedEmployee) {
      return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar
          role="admin"
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="min-w-0 flex-1">
          <Navbar user="Admin User" onMenuClick={() => setSidebarOpen(true)} />

          <div className="mx-auto w-full max-w-[1700px] p-4 sm:p-6 space-y-6">

            <h1 className="text-2xl font-bold">Expenses Management</h1>

            {/* 🔥 FORM */}
            <ExpenseFormAdmin onSuccess={loadItems} />

            {/* 🔥 FILTER BAR */}
            <div className="flex gap-4 flex-wrap bg-white p-4 rounded-xl shadow">

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border px-3 py-2 rounded"
              >
                <option value="all">All</option>
                <option value="company">Company Expenses</option>
                <option value="employee">Employee Expenses</option>
              </select>

              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="border px-3 py-2 rounded"
              >
                <option value="">All Employees</option>

                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setFilterType("all");
                  setSelectedEmployee("");
                }}
                className="bg-gray-200 px-3 py-2 rounded"
              >
                Reset
              </button>
            </div>

            {/* 🔥 RECORD COUNT */}
            <p className="text-sm text-gray-600">
              Showing {filteredItems.length} of {items.length} records
            </p>

            {message && <div>{message}</div>}

            {loading ? (
              <div>Loading expenses...</div>
            ) : (
              <ExpenseList
                items={filteredItems} // 🔥 IMPORTANT
                admin
                onApprove={approveExpense}
                onReject={rejectExpense}
                onRefresh={loadItems}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}