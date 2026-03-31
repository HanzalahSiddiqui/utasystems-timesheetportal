"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import MonthSelector from "@/components/MonthSelector";
import MonthlyTimesheetTable from "@/components/MonthlyTimesheetTable";

export default function GetTimesheetPage() {
  const { data: session } = useSession();

  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;

  const [month, setMonth] = useState(defaultMonth);
  const [holidays, setHolidays] = useState([]);
  const [existingRecord, setExistingRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadData(selectedMonth) {
    setLoading(true);

    try {
      const [holidayRes, timesheetRes] = await Promise.all([
        fetch(`/api/holidays?month=${selectedMonth}`),
        fetch(`/api/monthly-timesheets?month=${selectedMonth}`),
      ]);

      const holidayText = await holidayRes.text();
      const timesheetText = await timesheetRes.text();

      let holidayData = {};
      let timesheetData = {};

      try {
        holidayData = holidayText ? JSON.parse(holidayText) : {};
      } catch {
        holidayData = { holidays: [] };
      }

      try {
        timesheetData = timesheetText ? JSON.parse(timesheetText) : {};
      } catch {
        timesheetData = { items: [] };
      }

      setHolidays(holidayData.holidays || []);
      setExistingRecord(timesheetData.items?.[0] || null);
    } catch (error) {
      console.error("loadData error:", error);
      setHolidays([]);
      setExistingRecord(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.user) {
      loadData(month);
    }
  }, [month, session]);

  const isLocked =
    existingRecord?.locked === true &&
    existingRecord?.adminOverride !== true;

  const status = existingRecord?.status || "not-submitted";

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar role="employee" />

      <div className="flex-1">
        <Navbar user={session?.user?.name || "Employee"} />

        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Get Timesheet</h2>

          <MonthSelector value={month} onChange={setMonth} />

          <div className="bg-white rounded-2xl shadow p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <p><span className="font-semibold">Month:</span> {month}</p>
              <p><span className="font-semibold">Status:</span> {status}</p>
              <p><span className="font-semibold">Locked:</span> {isLocked ? "Yes" : "No"}</p>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl shadow p-6">Loading...</div>
          ) : (
            <MonthlyTimesheetTable
              month={month}
              holidays={holidays}
              locked={isLocked}
              status={status}
              existingEntries={existingRecord?.entries || []}
            />
          )}
        </div>
      </div>
    </div>
  );
}