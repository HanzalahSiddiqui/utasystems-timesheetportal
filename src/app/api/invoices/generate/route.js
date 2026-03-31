import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Payroll from "@/models/Payroll";
import Invoice from "@/models/Invoice";
import User from "@/models/User";
import Client from "@/models/Client";

function getMonthDateRange(month) {
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 0);

  const pad = (num) => String(num).padStart(2, "0");

  return {
    billingDateFrom: `${pad(start.getMonth() + 1)}/${pad(start.getDate())}/${start.getFullYear()}`,
    billingDateTo: `${pad(end.getMonth() + 1)}/${pad(end.getDate())}/${end.getFullYear()}`,
  };
}

function buildTempInvoiceNumber(employeeCode, month) {
  return `TEMP-${employeeCode}-${month}`;
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { month } = body;

    if (!month) {
      return Response.json({ error: "Month is required" }, { status: 400 });
    }

    await connectDB();

    const payrollItems = await Payroll.find({
      month,
      status: { $in: ["finalized", "paid"] },
    });

    if (!payrollItems.length) {
      return Response.json({
        message: "No finalized payroll records found for this month",
        count: 0,
        items: [],
      });
    }

    const results = [];
    const { billingDateFrom, billingDateTo } = getMonthDateRange(month);

    for (const payroll of payrollItems) {
      const employee = await User.findById(payroll.employeeId);
      if (!employee) continue;
      if (!employee.clientId) continue;

      const client = await Client.findById(employee.clientId);
      if (!client) continue;
      if (client.status !== "active") continue;

      const invoiceNumber = buildTempInvoiceNumber(
        payroll.employeeCode,
        payroll.month
      );

      const payload = {
        invoiceNumber,
        employeeId: employee._id,
        clientId: client._id,
        payrollId: payroll._id,
        employeeName: employee.name,
        jobTitle: employee.designation || "",
        clientName: client.clientName,
        clientEmail: client.clientEmail,
        clientAddress: client.clientAddress || "",
        month: payroll.month,
        issueDate: new Date(),
        billingDateFrom,
        billingDateTo,
        professionalServiceCharges: Number(payroll.poAmount || 0),
        totalDue: Number(payroll.poAmount || 0),
        status: "draft",
      };

      const existing = await Invoice.findOne({
        payrollId: payroll._id,
      });

      const saved = await Invoice.findOneAndUpdate(
        { payrollId: payroll._id },
        payload,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      results.push(saved);
    }

    return Response.json({
      message: "Invoices generated successfully",
      count: results.length,
      items: results,
    });
  } catch (error) {
    console.error("POST /api/invoices/generate error:", error);
    return Response.json(
      { error: error.message || "Failed to generate invoices" },
      { status: 500 }
    );
  }
}