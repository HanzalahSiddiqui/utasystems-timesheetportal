"use client";

export default function ExpenseStatusBadge({ status }) {
  const styles =
    status === "approved"
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
      : status === "rejected"
      ? "bg-red-100 text-red-700 ring-red-200"
      : status === "paid"
      ? "bg-violet-100 text-violet-700 ring-violet-200"
      : status === "draft"
      ? "bg-slate-100 text-slate-700 ring-slate-200"
      : "bg-sky-100 text-sky-700 ring-sky-200";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${styles}`}
    >
      {status}
    </span>
  );
}