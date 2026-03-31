import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Payroll from "@/models/Payroll";

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return new Response("Unauthorized", { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const status = searchParams.get("status");
    const payType = searchParams.get("payType");
    const search = searchParams.get("search");

    const query = {};

    if (month) query.month = month;
    if (status) query.status = status;
    if (payType) query.payType = payType;

    if (search) {
      query.$or = [
        { employeeName: { $regex: search, $options: "i" } },
        { employeeCode: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } },
      ];
    }

    const items = await Payroll.find(query).sort({
      employeeName: 1,
      createdAt: -1,
    });

    const headers = [
      "Employee Name",
      "Employee ID",
      "Designation",
      "Department",
      "Month",
      "Pay Type",
      "Present Days",
      "Paid Leave Days",
      "Unpaid Leave Days",
      "Payable Days",
      "Regular Hours",
      "OT Hours",
      "Employee Daily Rate",
      "Employee Hourly Rate",
      "Employee OT Rate",
      "Client Daily Rate",
      "Client Hourly Rate",
      "Client OT Rate",
      "Regular Pay",
      "OT Pay",
      "Gross Pay",
      "Allowances",
      "Deductions",
      "Net Pay",
      "PO Regular Amount",
      "PO OT Amount",
      "PO Amount",
      "Margin",
      "Status",
      "Remarks",
      "Generated At",
      "Finalized At",
      "Paid At",
    ];

    const rows = items.map((item) => [
      item.employeeName,
      item.employeeCode,
      item.designation || "",
      item.department || "",
      item.month,
      item.payType,
      item.presentDays ?? 0,
      item.paidLeaveDays ?? 0,
      item.unpaidLeaveDays ?? 0,
      item.payableDays ?? 0,
      item.regularHours ?? 0,
      item.otHours ?? 0,
      item.perDayRate ?? 0,
      item.perHourRate ?? 0,
      item.otRatePerHour ?? 0,
      item.clientPerDayRate ?? 0,
      item.clientPerHourRate ?? 0,
      item.clientOtRatePerHour ?? 0,
      item.regularPay ?? 0,
      item.otPay ?? 0,
      item.grossPay ?? 0,
      item.allowances ?? 0,
      item.deductions ?? 0,
      item.netPay ?? 0,
      item.poRegularAmount ?? 0,
      item.poOtAmount ?? 0,
      item.poAmount ?? 0,
      item.margin ?? 0,
      item.status || "",
      item.remarks || "",
      item.generatedAt ? new Date(item.generatedAt).toISOString() : "",
      item.finalizedAt ? new Date(item.finalizedAt).toISOString() : "",
      item.paidAt ? new Date(item.paidAt).toISOString() : "",
    ]);

    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const filename = month
      ? `payroll-${month}.csv`
      : "payroll-export.csv";

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/payroll/export error:", error);
    return new Response(error.message || "Failed to export payroll", {
      status: 500,
    });
  }
}