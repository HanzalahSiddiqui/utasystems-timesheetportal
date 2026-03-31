import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-10 rounded-2xl shadow-md text-center max-w-xl w-full">
        <h1 className="text-3xl font-bold mb-4">UTA Systems Timesheet Portal</h1>
        <p className="text-gray-600 mb-6">
          Manage employee timesheets, approvals, and reports.
        </p>

        <div className="flex justify-center gap-4">
          <Link
            href="/login"
            className="bg-black text-white px-5 py-3 rounded-lg"
          >
            Login
          </Link>

          <Link
            href="/dashboard/admin"
            className="bg-gray-200 text-black px-5 py-3 rounded-lg"
          >
            Admin Demo
          </Link>
        </div>
      </div>
    </main>
  );
}