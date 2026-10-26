"use client";

import { useEffect, useMemo, useState } from "react";

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthDates(monthValue) {
  if (!monthValue) return [];

  const [year, month] = monthValue.split("-").map(Number);
  const current = new Date(year, month - 1, 1);
  const dates = [];

  while (current.getMonth() === month - 1) {
    const dayName = current.toLocaleDateString("en-US", { weekday: "long" });
    const isWeekend = dayName === "Saturday" || dayName === "Sunday";

    dates.push({
      date: new Date(current),
      iso: formatLocalDate(current),
      dayName,
      isWeekend,
    });

    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export default function MonthlyTimesheetTable({
  month,
  holidays = [],
  locked = false,
  status = "not-submitted",
  existingEntries = [],
  employeeId = "",
}) {
  const monthDates = useMemo(() => getMonthDates(month), [month]);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [rangeLeaveType, setRangeLeaveType] = useState("");
const [rangeStartDate, setRangeStartDate] = useState("");
const [rangeEndDate, setRangeEndDate] = useState("");
  const [hasLocalDraft, setHasLocalDraft] = useState(false);

  const localDraftKey = employeeId && month
    ? `uta-timesheet-unsaved-v1:${employeeId}:${month}`
    : "";

  useEffect(() => {
    const entryMap = new Map(existingEntries.map((e) => [e.date, e]));
    const holidayMap = new Map(holidays.map((h) => [h.date, h.title]));
    let localEntries = new Map();

    if (localDraftKey && !locked) {
      try {
        const savedDraft = JSON.parse(window.localStorage.getItem(localDraftKey) || "null");
        if (Array.isArray(savedDraft?.entries)) {
          localEntries = new Map(savedDraft.entries.map((entry) => [entry.date, entry]));
        }
      } catch {
        window.localStorage.removeItem(localDraftKey);
      }
    } else if (localDraftKey && locked) {
      window.localStorage.removeItem(localDraftKey);
    }

    const generated = monthDates.map((item) => {
      const existing = entryMap.get(item.iso);
      const local = localEntries.get(item.iso);
      const holidayTitle = holidayMap.get(item.iso) || "";
      const isHoliday = !!holidayTitle;

      return {
        date: item.iso,
        dayName: item.dayName,
        regularHours: local ? String(local.regularHours ?? "") : existing ? String(existing.regularHours || "") : "",
        otHours: local ? String(local.otHours ?? "") : existing ? String(existing.otHours || "") : "",
        leaveType: isHoliday ? "" : local?.leaveType || existing?.leaveType || "",
        isHoliday,
        holidayTitle,
        isWeekend: item.isWeekend,
      };
    });

    setRows(generated);
    setHasLocalDraft(localEntries.size > 0);
  }, [monthDates, holidays, existingEntries, localDraftKey, locked]);

  function preserveLocalDraft(nextRows) {
    if (!localDraftKey || locked) return;
    try {
      window.localStorage.setItem(localDraftKey, JSON.stringify({
        savedAt: new Date().toISOString(),
        entries: nextRows.map((row) => ({
          date: row.date,
          regularHours: row.regularHours,
          otHours: row.otHours,
          leaveType: row.leaveType,
        })),
      }));
      setHasLocalDraft(true);
    } catch (error) {
      console.warn("Could not preserve local timesheet draft:", error);
    }
  }

  function handleChange(index, field, value) {
    if (locked) return;

    const updated = [...rows];
    const row = { ...updated[index] };

    if (field === "regularHours") {
      const num = Number(value);
      if (value !== "" && num > 8) return;
      row.regularHours = value;
      if (value !== "") row.leaveType = "";
    }

    if (field === "otHours") {
      row.otHours = value;
      if (value !== "") row.leaveType = "";
    }

    if (field === "leaveType") {
      row.leaveType = value;
      if (value !== "") {
        row.regularHours = "";
        row.otHours = "";
      }
    }

    updated[index] = row;
    preserveLocalDraft(updated);
    setRows(updated);
  }

  function getTotal(row) {
    return Number(row.regularHours || 0) + Number(row.otHours || 0);
  }

  const monthlyRegularTotal = rows.reduce(
    (sum, row) => sum + Number(row.regularHours || 0),
    0
  );

  const monthlyOtTotal = rows.reduce(
    (sum, row) => sum + Number(row.otHours || 0),
    0
  );

  const monthlyGrandTotal = monthlyRegularTotal + monthlyOtTotal;


  function applyLeaveRange() {
    const selectedMonth = month;

  if (
    !rangeStartDate.startsWith(selectedMonth) ||
    !rangeEndDate.startsWith(selectedMonth)
  ) {
    alert("Dates must belong to selected month");
    return;
  }

  if (
    !rangeLeaveType ||
    !rangeStartDate ||
    !rangeEndDate
  ) {
    alert("Please select leave type and date range");
    return;
  }

  const updated = rows.map((row) => {

  // Skip holidays
  if (row.isHoliday) {
    return row;
  }

  // Skip weekends
  if (row.isWeekend) {
    return row;
  }

  if (
    row.date >= rangeStartDate &&
    row.date <= rangeEndDate
  ) {
    return {
      ...row,
      leaveType: rangeLeaveType,
      regularHours: "",
      otHours: "",
    };
  }

  return row;
});

  preserveLocalDraft(updated);
  setRows(updated);
}
  async function saveTimesheet(submit = false) {
    try {
      setSaving(true);
      setMessage("");

      const payload = {
        month,
        submit,
        entries: rows.map((row) => ({
          date: row.date,
          dayName: row.dayName,
          regularHours: Number(row.regularHours || 0),
          otHours: Number(row.otHours || 0),
          leaveType: row.leaveType || "",
        })),
      };

      const res = await fetch("/api/monthly-timesheets", {
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
        data = { error: text || "Invalid server response" };
      }

      if (!res.ok) {
        setMessage(data.error || "Failed to save");
        setSaving(false);
        return;
      }

      setMessage(data.message || "Saved successfully");
      setSaving(false);
      if (localDraftKey) window.localStorage.removeItem(localDraftKey);
      setHasLocalDraft(false);
      if (submit) window.location.reload();
    } catch (error) {
      setMessage("Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow overflow-x-auto">
      <div className="p-4 border-b flex justify-between items-center gap-3 flex-wrap">
        <div className="px-4 py-4 border-b bg-slate-50">
  <h4 className="font-semibold mb-3">
    Apply Leave Range
  </h4>

  <div className="flex flex-wrap gap-3 items-end">

    <select
      value={rangeLeaveType}
      onChange={(e) => setRangeLeaveType(e.target.value)}
      className="border rounded-lg px-3 py-2"
    >
      <option value="">Leave Type</option>
      <option value="CL">CL</option>
      <option value="STUL">STUL</option>
      <option value="LTUL">LTUL</option>
    </select>

    <input
      type="date"
      value={rangeStartDate}
      onChange={(e) => setRangeStartDate(e.target.value)}
      className="border rounded-lg px-3 py-2"
    />

    <input
      type="date"
      value={rangeEndDate}
      onChange={(e) => setRangeEndDate(e.target.value)}
      className="border rounded-lg px-3 py-2"
    />

    <button
      type="button"
      onClick={applyLeaveRange}
      disabled={locked}
      className="bg-slate-800 text-white px-4 py-2 rounded-lg"
    >
      Apply Leave
    </button>

  </div>
</div>
        <h3 className="font-semibold text-lg">Monthly Timesheet</h3>

        <div className="flex gap-3">
          <button
            onClick={() => saveTimesheet(false)}
            disabled={locked || saving}
            className="bg-gray-700 text-white px-5 py-2 rounded-lg disabled:bg-gray-400"
          >
            Save Draft
          </button>

          <button
            onClick={() => saveTimesheet(true)}
            disabled={locked || saving}
            className="bg-black text-white px-5 py-2 rounded-lg disabled:bg-gray-400"
          >
            {locked ? "Already Submitted" : saving ? "Saving..." : "Submit Timesheet"}
          </button>
        </div>
      </div>

      {message && <div className="px-4 py-3 text-sm">{message}</div>}
      {hasLocalDraft && !locked && (
        <div className="px-4 py-3 border-b bg-amber-50 text-sm text-amber-800">
          Your unsaved changes are preserved in this browser. Click Save Draft to save them to your account.
        </div>
      )}
      <div className="px-4 py-3 bg-slate-50 border-b text-sm">
  {/* <div className="font-semibold mb-2">Leave Legend</div> */}

  <div className="flex flex-wrap gap-4">
    <span><strong>CL</strong> = Casual Leave</span>
    <span><strong>STUL</strong> = Short Term Unpaid Leave</span>
    <span><strong>LTUL</strong> = Long Term Unpaid Leave</span>
  </div>
</div>

      <table className="w-full min-w-[1200px]">
        <thead className="bg-slate-700 text-white">
          <tr>
            <th className="p-3 text-left">Day</th>
            <th className="p-3 text-left">Date</th>
            <th className="p-3 text-left">Regular Hours</th>
            <th className="p-3 text-left">OT Hours</th>
            <th className="p-3 text-left">Leave Type</th>
            <th className="p-3 text-left">Holiday</th>
            <th className="p-3 text-left">Total</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => {
            const hasHours = row.regularHours !== "" || row.otHours !== "";
            const hasLeave = row.leaveType !== "";
            const disableInputs = locked;

            return (
              <tr
                key={row.date}
                className={`border-t ${
                  row.isHoliday
                    ? "bg-red-100"
                    : row.isWeekend
                    ? "bg-orange-50"
                    : "bg-white"
                }`}
              >
                <td className="p-3 font-medium">{row.dayName}</td>
                <td className="p-3">{row.date}</td>

                <td className="p-3">
                  <input
                    type="number"
                    min="0"
                    max="8"
                    step="0.5"
                    disabled={disableInputs || hasLeave}
                    value={row.regularHours}
                    onChange={(e) =>
                      handleChange(index, "regularHours", e.target.value)
                    }
                    className="border rounded-lg px-3 py-2 w-28 disabled:bg-gray-200"
                    placeholder={row.isWeekend ? "Weekend" : "0"}
                  />
                </td>

                <td className="p-3">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    disabled={disableInputs || hasLeave}
                    value={row.otHours}
                    onChange={(e) =>
                      handleChange(index, "otHours", e.target.value)
                    }
                    className="border rounded-lg px-3 py-2 w-28 disabled:bg-gray-200"
                    placeholder="0"
                  />
                </td>

                <td className="p-3">
                  <select
                    disabled={disableInputs || row.isHoliday || hasHours}
                    value={row.leaveType}
                    onChange={(e) =>
                      handleChange(index, "leaveType", e.target.value)
                    }
                    className="border rounded-lg px-3 py-2 w-28 disabled:bg-gray-200"
                  >
                   <option value="">Select</option>
<option value="CL">CL - Casual Leave</option>
<option value="STUL">STUL - Short Term Unpaid Leave</option>
<option value="LTUL">LTUL - Long Term Unpaid Leave</option>
                  </select>
                </td>

                <td className="p-3">
                  {row.isHoliday ? (
                    <span
                      title={row.holidayTitle}
                      className="bg-red-600 text-white text-xs px-3 py-1 rounded-full"
                    >
                      {row.holidayTitle || "Holiday"}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>

                <td className="p-3 font-semibold">{getTotal(row)}</td>
              </tr>
            );
          })}

          {rows.length > 0 && (
            <tr className="border-t-2 bg-slate-100 font-semibold">
              <td className="p-4" colSpan="2">
                Monthly Total
              </td>
              <td className="p-4">{monthlyRegularTotal}</td>
              <td className="p-4">{monthlyOtTotal}</td>
              <td className="p-4">-</td>
              <td className="p-4">{status}</td>
              <td className="p-4 text-lg">{monthlyGrandTotal}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
