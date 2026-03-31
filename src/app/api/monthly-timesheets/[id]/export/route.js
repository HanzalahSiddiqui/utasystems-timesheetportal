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

function safeFilePart(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "");
}

export async function GET(req, context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await context.params;

    await connectDB();

    const item = await MonthlyTimesheet.findById(id).populate(
      "employeeId",
      "name email employeeId designation department"
    );

    if (!item) {
      return new Response("Record not found", { status: 404 });
    }

    const employeeName = item.employeeId?.name || "Employee";
    const employeeCode = item.employeeId?.employeeId || "EMP";
    const month = item.month || "month";

    const rows = [];

    // Top info block
    rows.push(["Employee Name", employeeName]);
    rows.push(["Employee ID", employeeCode]);
    rows.push(["Email", item.employeeId?.email || ""]);
    rows.push(["Designation", item.employeeId?.designation || ""]);
    rows.push(["Department", item.employeeId?.department || ""]);
    rows.push(["Month", month]);
    rows.push(["Status", item.status || ""]);
    rows.push(["Submitted At", item.submittedAt ? new Date(item.submittedAt).toLocaleString() : ""]);
    rows.push(["Review Comment", item.reviewComment || ""]);
    rows.push([]);

    // Main detailed table
    rows.push([
      "Day",
      "Date",
      "Regular Hours",
      "OT Hours",
      "Leave Type",
      "Holiday",
      "Holiday Title",
      "Total",
    ]);

    item.entries.forEach((entry) => {
      rows.push([
        entry.dayName || "",
        entry.date || "",
        entry.regularHours ?? 0,
        entry.otHours ?? 0,
        entry.leaveType || "",
        entry.isHoliday ? "Yes" : "No",
        entry.holidayTitle || "",
        entry.total ?? 0,
      ]);
    });

    const regularTotal = item.entries.reduce(
      (sum, entry) => sum + Number(entry.regularHours || 0),
      0
    );

    const otTotal = item.entries.reduce(
      (sum, entry) => sum + Number(entry.otHours || 0),
      0
    );

    const grandTotal = regularTotal + otTotal;

    rows.push([]);
    rows.push(["Monthly Totals"]);
    rows.push(["Regular Total", regularTotal]);
    rows.push(["OT Total", otTotal]);
    rows.push(["Grand Total", grandTotal]);

    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");

    const fileName = `timesheet-${safeFilePart(employeeName)}-${safeFilePart(employeeCode)}-${safeFilePart(month)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/monthly-timesheets/[id]/export error:", error);
    return new Response("Failed to export record", { status: 500 });
  }
}