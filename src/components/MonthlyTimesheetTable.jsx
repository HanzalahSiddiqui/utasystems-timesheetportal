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
}) {
  const monthDates = useMemo(() => getMonthDates(month), [month]);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const entryMap = new Map(existingEntries.map((e) => [e.date, e]));
    const holidayMap = new Map(holidays.map((h) => [h.date, h.title]));

    const generated = monthDates.map((item) => {
      const existing = entryMap.get(item.iso);
      const holidayTitle = holidayMap.get(item.iso) || "";
      const isHoliday = !!holidayTitle;

      return {
        date: item.iso,
        dayName: item.dayName,
        regularHours: existing ? String(existing.regularHours || "") : "",
        otHours: existing ? String(existing.otHours || "") : "",
        leaveType: existing?.leaveType || "",
        isHoliday,
        holidayTitle,
        isWeekend: item.isWeekend,
      };
    });

    setRows(generated);
  }, [monthDates, holidays, existingEntries]);

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
      window.location.reload();
    } catch (error) {
      setMessage("Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow overflow-x-auto">
      <div className="p-4 border-b flex justify-between items-center gap-3 flex-wrap">
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
            const disableInputs = locked || row.isHoliday;

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
                    disabled={disableInputs || hasHours}
                    value={row.leaveType}
                    onChange={(e) =>
                      handleChange(index, "leaveType", e.target.value)
                    }
                    className="border rounded-lg px-3 py-2 w-28 disabled:bg-gray-200"
                  >
                    <option value="">Select</option>
                    <option value="L">L</option>
                    <option value="SL">SL</option>
                    <option value="VL">VL</option>
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