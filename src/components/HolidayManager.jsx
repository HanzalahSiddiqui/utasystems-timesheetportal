"use client";

import { useEffect, useMemo, useState } from "react";

export default function HolidayManager() {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [holidayDate, setHolidayDate] = useState("");
  const [title, setTitle] = useState("");
  const [holidayList, setHolidayList] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadHolidays(month = selectedMonth) {
    setLoading(true);
    try {
      const res = await fetch(`/api/holidays?month=${month}`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setHolidayList(data.holidays || []);
    } catch {
      setHolidayList([]);
      setMessage("Failed to load holidays");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHolidays(selectedMonth);
  }, [selectedMonth]);

  async function addHoliday(e) {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date: holidayDate, title }),
      });

      const text = await res.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text || "Invalid server response" };
      }

      if (!res.ok) {
        setMessage(data.error || "Failed to add holiday");
        return;
      }

      setMessage(data.message || "Holiday added successfully");
      setHolidayDate("");
      setTitle("");
      loadHolidays(selectedMonth);
    } catch {
      setMessage("Something went wrong while adding holiday");
    }
  }

  async function removeHoliday(id) {
    const ok = confirm("Delete this holiday?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/holidays/${id}`, {
        method: "DELETE",
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setMessage(data.error || "Failed to delete holiday");
        return;
      }

      setMessage(data.message || "Holiday deleted successfully");
      loadHolidays(selectedMonth);
    } catch {
      setMessage("Something went wrong while deleting holiday");
    }
  }

  const filteredCount = useMemo(() => holidayList.length, [holidayList]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow p-6">
        <label className="block text-sm font-medium mb-2">Filter by Month</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border rounded-lg px-4 py-3 w-full md:w-72"
        />
        <p className="text-sm text-gray-500 mt-2">
          Holidays found: {filteredCount}
        </p>
      </div>

      <form onSubmit={addHoliday} className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Add Holiday</h3>

        <div className="grid md:grid-cols-3 gap-4">
          <input
            type="date"
            value={holidayDate}
            onChange={(e) => setHolidayDate(e.target.value)}
            className="border rounded-lg px-4 py-3"
            required
          />

          <input
            type="text"
            placeholder="Holiday Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border rounded-lg px-4 py-3"
            required
          />

          <button className="bg-black text-white rounded-lg px-5 py-3">
            Add Holiday
          </button>
        </div>

        {message && <p className="mt-4 text-sm">{message}</p>}
      </form>

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-700 text-white">
            <tr>
              <th className="p-4 text-left">Date</th>
              <th className="p-4 text-left">Title</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="3" className="p-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : holidayList.length > 0 ? (
              holidayList.map((item) => (
                <tr key={item._id} className="border-t">
                  <td className="p-4">{item.date}</td>
                  <td className="p-4">{item.title}</td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => removeHoliday(item._id)}
                      className="bg-red-600 text-white px-3 py-2 rounded-lg"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="p-6 text-center text-gray-500">
                  No holidays found for selected month
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}