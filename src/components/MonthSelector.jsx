"use client";

export default function MonthSelector({ value, onChange }) {
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;

  return (
    <div className="bg-white rounded-2xl shadow p-4 mb-6">
      <label className="block text-sm font-medium mb-2">Select Month</label>
      <input
        type="month"
        value={value}
        max={currentMonth}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded-lg px-4 py-3 w-full md:w-72"
      />
      <p className="text-xs text-gray-500 mt-2">
        Future months are disabled.
      </p>
    </div>
  );
}