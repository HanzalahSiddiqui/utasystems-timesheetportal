import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MonthlyTimesheet from "@/models/MonthlyTimesheet";
import { calculatePayrollFinancials } from "@/lib/payrollCalc";
import Payroll from "@/models/Payroll";
import Expense from "@/models/Expense";

function round2(num) {
  return Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;
}

function summarizeEntries(entries = []) {
  let presentDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let regularHours = 0;
  let otHours = 0;

  for (const entry of entries) {
    const regular = Number(entry.regularHours || 0);
    const ot = Number(entry.otHours || 0);
    const leave = entry.leaveType || "";

    if (regular > 0 || ot > 0) {
      presentDays += 1;
    }

    if (leave === "SL" || leave === "VL") {
      paidLeaveDays += 1;
    }

    if (leave === "L") {
      unpaidLeaveDays += 1;
    }

    regularHours += regular;
    otHours += ot;
  }

  return {
    presentDays,
    paidLeaveDays,
    unpaidLeaveDays,
    regularHours: round2(regularHours),
    otHours: round2(otHours),
  };
}

function buildPayrollFromTimesheet(user, timesheet, month) {
  const summary = summarizeEntries(timesheet.entries || []);

  const payType = user.payType || "daily";

  const perDayRate = Number(user.perDayRate || 0);
  const perHourRate = Number(user.perHourRate || 0);
  const otRatePerHour = Number(user.otRatePerHour || 0);

  const clientPerDayRate = Number(user.clientPerDayRate || 0);
  const clientPerHourRate = Number(user.clientPerHourRate || 0);
  const clientOtRatePerHour = Number(user.clientOtRatePerHour || 0);

  let payableDays = 0;

  let regularPay = 0;
  let poRegularAmount = 0;

  if (payType === "daily") {
    payableDays = summary.presentDays + summary.paidLeaveDays;

    regularPay = payableDays * perDayRate;
    poRegularAmount = payableDays * clientPerDayRate;
  } else if (payType === "hourly") {
    regularPay = summary.regularHours * perHourRate;
    poRegularAmount = summary.regularHours * clientPerHourRate;
  }

  const otPay = summary.otHours * otRatePerHour;
  const poOtAmount = summary.otHours * clientOtRatePerHour;

  const allowances = 0;
  const deductions = 0;

  const grossPay = regularPay + otPay + allowances;
  const netPay = grossPay - deductions;

  const poAmount = poRegularAmount + poOtAmount;
  const { employerTax, margin, netProfit } =
  calculatePayrollFinancials({
    grossPay,
    poAmount,
  });

  return {
    employeeId: user._id,
    employeeCode: user.employeeId,
    employeeName: user.name,
    designation: user.designation || "",
    department: user.department || "",
    month,
    timesheetId: timesheet._id,

    payType,

    perDayRate,
    perHourRate,
    otRatePerHour,

    clientPerDayRate,
    clientPerHourRate,
    clientOtRatePerHour,

    presentDays: summary.presentDays,
    paidLeaveDays: summary.paidLeaveDays,
    unpaidLeaveDays: summary.unpaidLeaveDays,
    payableDays,

    regularHours: summary.regularHours,
    otHours: summary.otHours,

    regularPay: round2(regularPay),
    otPay: round2(otPay),
    grossPay: round2(grossPay),
    deductions: round2(deductions),
    allowances: round2(allowances),
    netPay: round2(netPay),

    poRegularAmount: round2(poRegularAmount),
    poOtAmount: round2(poOtAmount),
    poAmount: round2(poAmount),

    employerTax: round2(employerTax),
margin: round2(margin),
netProfit: round2(netProfit), 

    status: "draft",
    generatedAt: new Date(),
  };
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

    const approvedTimesheets = await MonthlyTimesheet.find({
      month,
      status: "approved",
    }).populate("employeeId");

    if (!approvedTimesheets.length) {
      return Response.json({
        message: "No approved timesheets found for this month",
        count: 0,
        items: [],
      });
    }

    const results = [];

    for (const timesheet of approvedTimesheets) {
      const user = timesheet.employeeId;

      if (!user) continue;
      if (user.role !== "employee") continue;
      if (user.status !== "active") continue;
      if (user.payrollEnabled === false) continue;

      const payload = buildPayrollFromTimesheet(user, timesheet, month);
      // ---------- EXPENSE CALCULATION ----------

const start = new Date(`${month}-01`);
const end = new Date(start);
end.setMonth(end.getMonth() + 1);

const expenses = await Expense.find({
  employeeId: user._id,
  status: "approved",
  $or: [
    { expenseDate: { $gte: start, $lt: end } },
    { expenseDate: { $exists: false }, createdAt: { $gte: start, $lt: end } }
  ]
});

const employeeExpense = expenses.reduce(
  (sum, e) => sum + Number(e.amount || 0),
  0
);

// ---------- REAL PROFIT ----------

const realProfit = Number(payload.margin || 0) - employeeExpense;

payload.employeeExpense = Math.round(employeeExpense * 100) / 100;
payload.realProfit = Math.round(realProfit * 100) / 100;

      const existing = await Payroll.findOne({
        employeeId: user._id,
        month,
      });

      if (existing && existing.status === "finalized") {
        results.push(existing);
        continue;
      }

      const saved = await Payroll.findOneAndUpdate(
        { employeeId: user._id, month },
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
      message: "Payroll generated successfully",
      count: results.length,
      items: results,
    });
  } catch (error) {
    console.error("POST /api/payroll/generate error:", error);
    return Response.json(
      { error: error.message || "Failed to generate payroll" },
      { status: 500 }
    );
  }
}