"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [reminderEmployees, setReminderEmployees] = useState([]);
  const [reminderMonth, setReminderMonth] = useState(() => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, "0")}`;
  });
  const [showReminderPanel, setShowReminderPanel] = useState(false);
  const [selectedReminderIds, setSelectedReminderIds] = useState([]);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderMessage, setReminderMessage] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, "0")}`;
  });
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

  const loadReminderEmployees = useCallback(async (month = reminderMonth) => {
    const res = await fetch(`/api/monthly-timesheets/reminders?month=${encodeURIComponent(month)}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) setReminderEmployees(data.items || []);
    else setReminderMessage(data.error || "Could not load reminder options");
    setSelectedReminderIds([]);
  }, [reminderMonth]);

  async function sendSelectedReminders() {
    setReminderBusy(true);
    setReminderMessage("");
    try {
      const res = await fetch("/api/monthly-timesheets/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: reminderMonth, employeeIds: selectedReminderIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Reminder send failed");
      const sent = data.results.filter((item) => item.status === "sent").length;
      const failed = data.results.filter((item) => item.status === "failed").length;
      const skipped = data.results.filter((item) => item.status === "skipped").length;
      setReminderMessage(`Sent: ${sent} · Failed: ${failed} · Skipped: ${skipped}`);
      setSelectedReminderIds([]);
      await loadReminderEmployees(reminderMonth);
    } catch (error) {
      setReminderMessage(error.message || "Reminder send failed");
    } finally {
      setReminderBusy(false);
    }
  }

  async function setAutomaticReminder(employeeId, enabled) {
    setReminderMessage("");
    const res = await fetch("/api/monthly-timesheets/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employees: [{ employeeId, enabled }] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setReminderMessage(data.error || "Could not save reminder preference");
      return;
    }
    setReminderEmployees((current) => current.map((item) =>
      item._id === employeeId ? { ...item, reminderEnabled: enabled } : item
    ));
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

  useEffect(() => {
    if (showReminderPanel) loadReminderEmployees(reminderMonth);
  }, [showReminderPanel, reminderMonth, loadReminderEmployees]);

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

  const visibleReminderEmployees = reminderEmployees.filter((employee) => {
    const query = search.toLowerCase();
    return !query || `${employee.name} ${employee.employeeCode}`.toLowerCase().includes(query);
  });
  const visiblePendingEmployees = visibleReminderEmployees.filter((employee) =>
    !["submitted", "approved", "rejected"].includes(employee.timesheetStatus)
  );

  function toggleReminderSelection(employeeId) {
    setSelectedReminderIds((current) => current.includes(employeeId)
      ? current.filter((id) => id !== employeeId)
      : [...current, employeeId]
    );
  }

  function toggleAllVisibleReminders() {
    const visibleIds = visiblePendingEmployees.map((employee) => employee._id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedReminderIds.includes(id));
    setSelectedReminderIds((current) => allSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])]
    );
  }

  if (loading) {
    return <div className="bg-white rounded-2xl shadow p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowReminderPanel(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-indigo-700"
          aria-haspopup="dialog"
          aria-expanded={showReminderPanel}
        >
          <span aria-hidden="true">✉</span>
          Timesheet Reminders
        </button>
      </div>

      {showReminderPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="timesheet-reminder-title" className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="timesheet-reminder-title" className="text-lg font-semibold">Timesheet Reminders</h3>
            <p className="text-sm text-gray-600">Choose employees for a one-time reminder or enable automatic daily reminders per employee.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowReminderPanel(false)}
              className="rounded-lg border px-3 py-2 text-gray-700 hover:bg-gray-100"
              aria-label="Close timesheet reminders"
            >
              Close
            </button>
            <input
              type="month"
              value={reminderMonth}
              onChange={(event) => setReminderMonth(event.target.value)}
              className="border rounded-lg px-3 py-2"
              aria-label="Reminder month"
            />
            <button
              onClick={toggleAllVisibleReminders}
              className="border rounded-lg px-3 py-2 text-sm"
              disabled={!visibleReminderEmployees.length}
            >
              Select all pending
            </button>
            <button
              onClick={sendSelectedReminders}
              disabled={!selectedReminderIds.length || reminderBusy}
              className="bg-blue-600 disabled:bg-gray-400 text-white rounded-lg px-4 py-2"
            >
              {reminderBusy ? "Sending…" : `Send to selected (${selectedReminderIds.length})`}
            </button>
          </div>
        </div>
        {reminderMessage && <p role="status" className="text-sm text-blue-700">{reminderMessage}</p>}
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-100">
              <tr>
              <th className="p-3 text-left"><input type="checkbox" aria-label="Select visible pending employees" checked={visiblePendingEmployees.length > 0 && visiblePendingEmployees.every((employee) => selectedReminderIds.includes(employee._id))} onChange={toggleAllVisibleReminders} disabled={!visiblePendingEmployees.length} /></th>
                <th className="p-3 text-left">Employee</th>
                <th className="p-3 text-left">Reminder email</th>
                <th className="p-3 text-left">Timesheet</th>
                <th className="p-3 text-left">Automatic daily reminders</th>
                <th className="p-3 text-left">Last reminder</th>
              </tr>
            </thead>
            <tbody>
              {visibleReminderEmployees.map((employee) => (
                <tr key={employee._id} className="border-t">
                  <td className="p-3"><input type="checkbox" checked={selectedReminderIds.includes(employee._id)} onChange={() => toggleReminderSelection(employee._id)} aria-label={`Select ${employee.name}`} disabled={["submitted", "approved", "rejected"].includes(employee.timesheetStatus)} /></td>
                  <td className="p-3">{employee.name} <span className="text-gray-500">({employee.employeeCode})</span></td>
                  <td className="p-3">{employee.reminderEmail}</td>
                  <td className="p-3 capitalize">{employee.timesheetStatus}</td>
                  <td className="p-3"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={employee.reminderEnabled} onChange={(event) => setAutomaticReminder(employee._id, event.target.checked)} />Enabled</label></td>
                  <td className="p-3"><div>{employee.lastReminder ? <span>{employee.lastReminder.status} · {employee.lastReminder.sentAt ? new Date(employee.lastReminder.sentAt).toLocaleString() : "not sent"}</span> : <span className="text-gray-500">Never sent</span>}</div>{employee.lastReminder?.recipient && <div className="text-xs text-gray-500">To: {employee.lastReminder.recipient}</div>}{employee.lastReminder?.sentBy && <div className="text-xs text-gray-500">By: {employee.lastReminder.sentBy}</div>}{employee.lastReminder?.error && <div className="text-xs text-red-600">{employee.lastReminder.error}</div>}</td>
                </tr>
              ))}
              {!visibleReminderEmployees.length && <tr><td colSpan="6" className="p-5 text-center text-gray-500">No active employees found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
        </div>
      )}

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
