"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
function StatCard({ title, value }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="mt-2 text-3xl font-bold text-slate-900">{value}</h3>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles =
    status === "active"
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
      : "bg-red-100 text-red-700 ring-red-200";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${styles}`}
    >
      {status}
    </span>
  );
}

function PayTypeBadge({ payType }) {
  const normalized = payType || "daily";

  const styles =
    normalized === "hourly"
      ? "bg-violet-100 text-violet-700 ring-violet-200"
      : "bg-sky-100 text-sky-700 ring-sky-200";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${styles}`}
    >
      {normalized}
    </span>
  );
}

function PayrollBadge({ enabled }) {
  const styles = enabled
    ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
    : "bg-red-100 text-red-700 ring-red-200";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${styles}`}
    >
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 ${
        props.className || ""
      }`}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 ${
        props.className || ""
      }`}
    />
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function InfoPair({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-800">{value || "-"}</p>
    </div>
  );
}

function EditEmployeeModal({ employee, clients=[], onClose, onSaved }) {
const [form, setForm] = useState({
  name: employee.name || "",
  email: employee.email || "",
  designation: employee.designation || "",
  department: employee.department || "",
  status: employee.status || "active",
  password: "",
  clientId: employee.clientId?._id || employee.clientId || "",
  payType: employee.payType || "daily",
  perDayRate: employee.perDayRate ?? "",
  perHourRate: employee.perHourRate ?? "",
  otRatePerHour: employee.otRatePerHour ?? "",
  clientPerDayRate: employee.clientPerDayRate ?? "",
  clientPerHourRate: employee.clientPerHourRate ?? "",
  clientOtRatePerHour: employee.clientOtRatePerHour ?? "",
  payrollEnabled: employee.payrollEnabled ?? true,
});

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const payload = {
        ...form,
        perDayRate:
          form.payType === "daily" && form.perDayRate !== ""
            ? Number(form.perDayRate)
            : 0,
        perHourRate:
          form.payType === "hourly" && form.perHourRate !== ""
            ? Number(form.perHourRate)
            : 0,
        otRatePerHour:
          form.otRatePerHour !== "" ? Number(form.otRatePerHour) : 0,
        clientPerDayRate:
          form.payType === "daily" && form.clientPerDayRate !== ""
            ? Number(form.clientPerDayRate)
            : 0,
        clientPerHourRate:
          form.payType === "hourly" && form.clientPerHourRate !== ""
            ? Number(form.clientPerHourRate)
            : 0,
        clientOtRatePerHour:
          form.clientOtRatePerHour !== ""
            ? Number(form.clientOtRatePerHour)
            : 0,
      };

      const res = await fetch(`/api/employees/${employee._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        setMessage(data.error || "Failed to update employee");
        setLoading(false);
        return;
      }

      onSaved();
      onClose();
    } catch {
      setMessage("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-4 sm:p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">
            Edit Employee
          </h3>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Field label="Full Name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>

          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </Field>

          <Field label="Designation">
            <Input
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
            />
          </Field>

          <Field label="Department">
            <Input
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </Field>
          <Field label="Client">
  <Select
    value={form.clientId}
    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
  >
    <option value="">Select Client</option>
    {clients
      .filter((client) => client.status === "active")
      .map((client) => (
        <option key={client._id} value={client._id}>
          {client.clientName}
        </option>
      ))}
  </Select>
</Field>

          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </Select>
          </Field>

          <Field label="Reset Password">
            <Input
              type="text"
              placeholder="Leave blank to keep same"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>

          <div className="md:col-span-2">
            <SectionCard
              title="Employee Payroll Configuration"
              subtitle="Update payout rates used for employee salary calculation."
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Field label="Pay Type">
                  <Select
                    value={form.payType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        payType: e.target.value,
                        perDayRate: e.target.value === "daily" ? form.perDayRate : "",
                        perHourRate:
                          e.target.value === "hourly" ? form.perHourRate : "",
                        clientPerDayRate:
                          e.target.value === "daily" ? form.clientPerDayRate : "",
                        clientPerHourRate:
                          e.target.value === "hourly"
                            ? form.clientPerHourRate
                            : "",
                      })
                    }
                  >
                    <option value="daily">daily</option>
                    <option value="hourly">hourly</option>
                  </Select>
                </Field>

                {form.payType === "daily" ? (
                  <Field label="Employee Per Day Rate">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.perDayRate}
                      onChange={(e) =>
                        setForm({ ...form, perDayRate: e.target.value })
                      }
                    />
                  </Field>
                ) : (
                  <Field label="Employee Per Hour Rate">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.perHourRate}
                      onChange={(e) =>
                        setForm({ ...form, perHourRate: e.target.value })
                      }
                    />
                  </Field>
                )}

                <Field label="Employee OT Rate">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.otRatePerHour}
                    onChange={(e) =>
                      setForm({ ...form, otRatePerHour: e.target.value })
                    }
                  />
                </Field>

                <Field label="Payroll Status">
                  <label className="flex h-[46px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4">
                    <input
                      type="checkbox"
                      checked={form.payrollEnabled}
                      onChange={(e) =>
                        setForm({ ...form, payrollEnabled: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-slate-700">Enable payroll</span>
                  </label>
                </Field>
              </div>
            </SectionCard>
          </div>

          <div className="md:col-span-2">
            <SectionCard
              title="PO / Client Billing Configuration"
              subtitle="Update billing rates used for PO amount and invoice calculations."
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {form.payType === "daily" ? (
                  <Field label="Client / PO Per Day Rate">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.clientPerDayRate}
                      onChange={(e) =>
                        setForm({ ...form, clientPerDayRate: e.target.value })
                      }
                    />
                  </Field>
                ) : (
                  <Field label="Client / PO Per Hour Rate">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.clientPerHourRate}
                      onChange={(e) =>
                        setForm({ ...form, clientPerHourRate: e.target.value })
                      }
                    />
                  </Field>
                )}

                <Field label="Client / PO OT Rate">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.clientOtRatePerHour}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        clientOtRatePerHour: e.target.value,
                      })
                    }
                  />
                </Field>
              </div>
            </SectionCard>
          </div>

          {message && (
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          )}

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmployeeMobileCard({ emp, onEdit, onToggleStatus, onDelete }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-900">
            {emp.name}
          </p>
          <p className="mt-1 break-all text-sm text-slate-500">{emp.email}</p>
        </div>
        <PayTypeBadge payType={emp.payType} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <InfoPair label="Employee ID" value={emp.employeeId} />
        <InfoPair label="Department" value={emp.department || "-"} />
        <InfoPair label="Designation" value={emp.designation || "-"} />
        <InfoPair
          label="Employee Rate"
          value={
            emp.payType === "hourly"
              ? `Hourly: ${emp.perHourRate ?? 0}`
              : `Daily: ${emp.perDayRate ?? 0}`
          }
        />
        <InfoPair label="Emp. OT" value={emp.otRatePerHour ?? 0} />
        <InfoPair
          label="PO Rate"
          value={
            emp.payType === "hourly"
              ? `Hourly: ${emp.clientPerHourRate ?? 0}`
              : `Daily: ${emp.clientPerDayRate ?? 0}`
          }
        />
        <InfoPair label="PO OT" value={emp.clientOtRatePerHour ?? 0} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PayrollBadge enabled={emp.payrollEnabled !== false} />
        <StatusBadge status={emp.status || "active"} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => onEdit(emp)}
          className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white"
        >
          Edit
        </button>

        <button
          onClick={() => onToggleStatus(emp)}
          className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white"
        >
          {emp.status === "active" ? "Deactivate" : "Activate"}
        </button>

        <button
          onClick={() => onDelete(emp._id)}
          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function EmployeeDesktopRow({ emp, onEdit, onToggleStatus, onDelete }) {
  return (
    <tr className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50">
      <td className="px-4 py-4 align-top">
        <div className="min-w-[220px]">
          <p className="font-semibold text-slate-900">{emp.name}</p>
          <p className="mt-0.5 text-sm text-slate-500 break-all">{emp.email}</p>
        </div>
      </td>

      <td className="px-4 py-4 align-top text-sm font-medium text-slate-700 whitespace-nowrap">
        {emp.employeeId}
      </td>

      <td className="px-4 py-4 align-top text-sm text-slate-700">
        <div className="min-w-[130px]">{emp.designation || "-"}</div>
      </td>

      <td className="px-4 py-4 align-top text-sm text-slate-700">
        <div className="min-w-[120px]">{emp.department || "-"}</div>
      </td>
      <td className="px-4 py-4 text-sm text-slate-700">
  {emp.clientId?.clientName || "-"}
</td>

      <td className="px-4 py-4 align-top whitespace-nowrap">
        <PayTypeBadge payType={emp.payType} />
      </td>

      <td className="px-4 py-4 align-top text-sm text-slate-700">
        <div className="min-w-[120px]">
          <p className="font-medium text-slate-900">
            {emp.payType === "hourly" ? emp.perHourRate ?? 0 : emp.perDayRate ?? 0}
          </p>
          <p className="text-xs text-slate-500">
            {emp.payType === "hourly" ? "Employee / Hr" : "Employee / Day"}
          </p>
        </div>
      </td>

      <td className="px-4 py-4 align-top text-sm text-slate-700">
        <div className="min-w-[110px]">
          <p className="font-medium text-slate-900">{emp.otRatePerHour ?? 0}</p>
          <p className="text-xs text-slate-500">Emp. OT</p>
        </div>
      </td>

      <td className="px-4 py-4 align-top text-sm text-slate-700">
        <div className="min-w-[120px]">
          <p className="font-medium text-slate-900">
            {emp.payType === "hourly"
              ? emp.clientPerHourRate ?? 0
              : emp.clientPerDayRate ?? 0}
          </p>
          <p className="text-xs text-slate-500">
            {emp.payType === "hourly" ? "PO / Hr" : "PO / Day"}
          </p>
        </div>
      </td>

      <td className="px-4 py-4 align-top text-sm text-slate-700">
        <div className="min-w-[100px]">
          <p className="font-medium text-slate-900">
            {emp.clientOtRatePerHour ?? 0}
          </p>
          <p className="text-xs text-slate-500">PO OT</p>
        </div>
      </td>

      <td className="px-4 py-4 align-top whitespace-nowrap">
        <PayrollBadge enabled={emp.payrollEnabled !== false} />
      </td>

      <td className="px-4 py-4 align-top whitespace-nowrap">
        <StatusBadge status={emp.status || "active"} />
      </td>

      <td className="px-4 py-4 align-top">
        <div className="flex min-w-[200px] flex-wrap gap-2">
          <button
            onClick={() => onEdit(emp)}
            className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white"
          >
            Edit
          </button>

          <button
            onClick={() => onToggleStatus(emp)}
            className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white"
          >
            {emp.status === "active" ? "Deactivate" : "Activate"}
          </button>

          <button
            onClick={() => onDelete(emp._id)}
            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function EmployeesPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [clients, setClients] = useState([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    employeeId: "",
    designation: "",
    department: "",
    clientId: "",
    payType: "daily",
    perDayRate: "",
    perHourRate: "",
    otRatePerHour: "",
    clientPerDayRate: "",
    clientPerHourRate: "",
    clientOtRatePerHour: "",
    payrollEnabled: true,
    clientId: "",
  });

  async function loadEmployees() {
    try {
      setPageLoading(true);
      const res = await fetch("/api/employees", { cache: "no-store" });
      const text = await res.text();

      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      setEmployees(data.employees || []);
    } catch (error) {
      console.error("Load employees error:", error);
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
    loadClients();
  }, []);

  async function loadClients() {
  try {
    const res = await fetch("/api/clients", { cache: "no-store" });
    const text = await res.text();

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    setClients(data.clients || []);
  } catch (error) {
    console.error("Load clients error:", error);
  }
}

  async function createEmployee(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const payload = {
        ...form,
        perDayRate:
          form.payType === "daily" && form.perDayRate !== ""
            ? Number(form.perDayRate)
            : 0,
        perHourRate:
          form.payType === "hourly" && form.perHourRate !== ""
            ? Number(form.perHourRate)
            : 0,
        otRatePerHour:
          form.otRatePerHour !== "" ? Number(form.otRatePerHour) : 0,
        clientPerDayRate:
          form.payType === "daily" && form.clientPerDayRate !== ""
            ? Number(form.clientPerDayRate)
            : 0,
        clientPerHourRate:
          form.payType === "hourly" && form.clientPerHourRate !== ""
            ? Number(form.clientPerHourRate)
            : 0,
        clientOtRatePerHour:
          form.clientOtRatePerHour !== ""
            ? Number(form.clientOtRatePerHour)
            : 0,
      };

      const res = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        setMessage(data.error || "Failed to create employee");
        setLoading(false);
        return;
      }

      setMessage(data.message || "Employee created successfully");
      setForm({
        name: "",
        email: "",
        password: "",
        employeeId: "",
        designation: "",
        department: "",
        clientId: "",
        payType: "daily",
        perDayRate: "",
        perHourRate: "",
        otRatePerHour: "",
        clientPerDayRate: "",
        clientPerHourRate: "",
        clientOtRatePerHour: "",
        payrollEnabled: true,
      });

      await loadEmployees();
    } catch {
      setMessage("Something went wrong while creating employee");
    } finally {
      setLoading(false);
    }
  }

  async function deleteEmployee(id) {
    const ok = confirm("Are you sure you want to delete this employee?");
    if (!ok) return;

    const res = await fetch(`/api/employees/${id}`, {
      method: "DELETE",
    });

    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (!res.ok) {
      setMessage(data.error || "Failed to delete employee");
      return;
    }

    setMessage(data.message || "Employee deleted successfully");
    loadEmployees();
  }

  async function toggleStatus(emp) {
    const nextStatus = emp.status === "active" ? "inactive" : "active";

    const res = await fetch(`/api/employees/${emp._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (!res.ok) {
      setMessage(data.error || "Failed to update status");
      return;
    }

    setMessage(`Employee marked as ${nextStatus}`);
    loadEmployees();
  }

  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return employees;

    return employees.filter((emp) => {
      const name = emp.name?.toLowerCase() || "";
      const email = emp.email?.toLowerCase() || "";
      const employeeId = emp.employeeId?.toLowerCase() || "";
      const department = emp.department?.toLowerCase() || "";
      const designation = emp.designation?.toLowerCase() || "";
      const clientName = emp.clientId?.clientName?.toLowerCase() || "";
      const payType = emp.payType?.toLowerCase() || "";
      const perDayRate = String(emp.perDayRate ?? "");
      const perHourRate = String(emp.perHourRate ?? "");
      const clientPerDayRate = String(emp.clientPerDayRate ?? "");
      const clientPerHourRate = String(emp.clientPerHourRate ?? "");

      return (
        name.includes(q) ||
        email.includes(q) ||
        employeeId.includes(q) ||
        department.includes(q) ||
        designation.includes(q) ||
        clientName.includes(q) ||
        payType.includes(q) ||
        perDayRate.includes(q) ||
        perHourRate.includes(q) ||
        clientPerDayRate.includes(q) ||
        clientPerHourRate.includes(q)
      );
    });
  }, [employees, search]);

  const activeEmployees = employees.filter((e) => e.status === "active").length;
  const inactiveEmployees = employees.filter((e) => e.status === "inactive").length;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
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

          <div className="mx-auto w-full max-w-[1700px] p-4 sm:p-6 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Employee Management
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Create, edit, activate, deactivate, and manage employee access.
                </p>
              </div>

              <div className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200 w-full sm:w-auto sm:min-w-[140px]">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Total Records
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {employees.length}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard title="Total Employees" value={employees.length} />
              <StatCard title="Active Employees" value={activeEmployees} />
              <StatCard title="Inactive Employees" value={inactiveEmployees} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)] 2xl:grid-cols-[500px_minmax(0,1fr)]">
              <div className="self-start rounded-3xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200 xl:sticky xl:top-6">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Add New Employee
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Create a new employee account with payroll and PO rate setup.
                  </p>
                </div>

                <form onSubmit={createEmployee} className="space-y-4">
                  <Field label="Full Name">
                    <Input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </Field>

                  <Field label="Email Address">
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Password">
                      <Input
                        type="text"
                        value={form.password}
                        onChange={(e) =>
                          setForm({ ...form, password: e.target.value })
                        }
                        required
                      />
                    </Field>

                    <Field label="Employee ID">
                      <Input
                        type="text"
                        value={form.employeeId}
                        onChange={(e) =>
                          setForm({ ...form, employeeId: e.target.value })
                        }
                        required
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Designation">
                      <Input
                        type="text"
                        value={form.designation}
                        onChange={(e) =>
                          setForm({ ...form, designation: e.target.value })
                        }
                      />
                    </Field>

                    <Field label="Department">
                      <Input
                        type="text"
                        value={form.department}
                        onChange={(e) =>
                          setForm({ ...form, department: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Client">
  <Select
    value={form.clientId}
    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
  >
    <option value="">Select Client</option>
    {clients
      .filter((client) => client.status === "active")
      .map((client) => (
        <option key={client._id} value={client._id}>
          {client.clientName}
        </option>
      ))}
  </Select>
</Field>
                  </div>

                  <SectionCard
                    title="Employee Payroll Configuration"
                    subtitle="Define employee payout rates used for salary calculation."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Pay Type">
                        <Select
                          value={form.payType}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              payType: e.target.value,
                              perDayRate:
                                e.target.value === "daily" ? form.perDayRate : "",
                              perHourRate:
                                e.target.value === "hourly"
                                  ? form.perHourRate
                                  : "",
                              clientPerDayRate:
                                e.target.value === "daily"
                                  ? form.clientPerDayRate
                                  : "",
                              clientPerHourRate:
                                e.target.value === "hourly"
                                  ? form.clientPerHourRate
                                  : "",
                            })
                          }
                        >
                          <option value="daily">Daily</option>
                          <option value="hourly">Hourly</option>
                        </Select>
                      </Field>

                      <Field label="OT Rate Per Hour">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.otRatePerHour}
                          onChange={(e) =>
                            setForm({ ...form, otRatePerHour: e.target.value })
                          }
                        />
                      </Field>

                      {form.payType === "daily" && (
                        <Field label="Employee Per Day Rate">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.perDayRate}
                            onChange={(e) =>
                              setForm({ ...form, perDayRate: e.target.value })
                            }
                            required
                          />
                        </Field>
                      )}

                      {form.payType === "hourly" && (
                        <Field label="Employee Per Hour Rate">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.perHourRate}
                            onChange={(e) =>
                              setForm({ ...form, perHourRate: e.target.value })
                            }
                            required
                          />
                        </Field>
                      )}
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="PO / Client Billing Configuration"
                    subtitle="Define client billing rates used for PO amount and invoices."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      {form.payType === "daily" && (
                        <Field label="Client / PO Per Day Rate">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.clientPerDayRate}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                clientPerDayRate: e.target.value,
                              })
                            }
                          />
                        </Field>
                      )}

                      {form.payType === "hourly" && (
                        <Field label="Client / PO Per Hour Rate">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.clientPerHourRate}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                clientPerHourRate: e.target.value,
                              })
                            }
                          />
                        </Field>
                      )}

                      <Field label="Client / PO OT Rate">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.clientOtRatePerHour}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              clientOtRatePerHour: e.target.value,
                            })
                          }
                        />
                      </Field>

                      <Field label="Payroll Status">
                        <label className="flex h-[46px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4">
                          <input
                            type="checkbox"
                            checked={form.payrollEnabled}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                payrollEnabled: e.target.checked,
                              })
                            }
                            className="h-4 w-4"
                          />
                          <span className="text-sm text-slate-700">
                            Enable payroll
                          </span>
                        </label>
                      </Field>
                    </div>
                  </SectionCard>

                  {message && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
                  >
                    {loading ? "Creating Employee..." : "Create Employee"}
                  </button>
                </form>
              </div>

              <div className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200 min-w-0">
                <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Employees Directory
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Search and manage all registered employees.
                    </p>
                  </div>

                  <div className="w-full xl:w-[340px]">
                    <Input
                      type="text"
                      placeholder="Search by name, email, ID, department..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="block lg:hidden space-y-4">
                  {pageLoading ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-slate-500">
                      Loading employees...
                    </div>
                  ) : filteredEmployees.length > 0 ? (
                    filteredEmployees.map((emp) => (
                      <EmployeeMobileCard
                        key={emp._id}
                        emp={emp}
                        onEdit={setEditingEmployee}
                        onToggleStatus={toggleStatus}
                        onDelete={deleteEmployee}
                      />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-slate-500">
                      No employees found
                    </div>
                  )}
                </div>

                <div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-[1500px] w-full">
                      <thead className="bg-slate-900 text-white">
                        <tr>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            Employee
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            Employee ID
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            Designation
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            Department
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-semibold">Client</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            Pay Type
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            Employee Rate
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            Emp. OT
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            PO Rate
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            PO OT
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            Payroll
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            Status
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody className="bg-white">
                        {pageLoading ? (
                          <tr>
                            <td
                              colSpan="12"
                              className="px-4 py-10 text-center text-slate-500"
                            >
                              Loading employees...
                            </td>
                          </tr>
                        ) : filteredEmployees.length > 0 ? (
                          filteredEmployees.map((emp) => (
                            <EmployeeDesktopRow
                              key={emp._id}
                              emp={emp}
                              onEdit={setEditingEmployee}
                              onToggleStatus={toggleStatus}
                              onDelete={deleteEmployee}
                            />
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="12"
                              className="px-4 py-10 text-center text-slate-500"
                            >
                              No employees found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="mt-3 hidden lg:block text-xs text-slate-400">
                  Scroll horizontally to view all payroll and PO-related columns.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          clients={clients}
          onClose={() => setEditingEmployee(null)}
          onSaved={loadEmployees}
        />
      )}
    </div>
  );
}