import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MonthlyTimesheet from "@/models/MonthlyTimesheet";

function csvEscape(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function safeFilePart(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "");
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || getCurrentMonth();

    await connectDB();

    const items = await MonthlyTimesheet.find({ month })
      .populate("employeeId", "name email employeeId designation department")
      .sort({ createdAt: 1 });

    const rows = [
      [
        "Employee Name",
        "Employee ID",
        "Email",
        "Designation",
        "Department",
        "Month",
        "Status",
        "Regular Total",
        "OT Total",
        "Grand Total",
        "Submitted At",
        "Review Comment",
      ],
    ];

    items.forEach((item) => {
      const regularTotal = item.entries.reduce(
        (sum, entry) => sum + Number(entry.regularHours || 0),
        0
      );

      const otTotal = item.entries.reduce(
        (sum, entry) => sum + Number(entry.otHours || 0),
        0
      );

      const grandTotal = regularTotal + otTotal;

      rows.push([
        item.employeeId?.name || "",
        item.employeeId?.employeeId || "",
        item.employeeId?.email || "",
        item.employeeId?.designation || "",
        item.employeeId?.department || "",
        item.month || "",
        item.status || "",
        regularTotal,
        otTotal,
        grandTotal,
        item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "",
        item.reviewComment || "",
      ]);
    });

    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");

    const fileName = `employees-timesheet-summary-${safeFilePart(month)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/monthly-timesheets/export error:", error);
    return new Response("Failed to export employees summary", {
      status: 500,
    });
  }
}