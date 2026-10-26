import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MonthlyTimesheet from "@/models/MonthlyTimesheet";
import { calculatePayrollFinancials } from "@/lib/payrollCalc";
import Payroll from "@/models/Payroll";
import Expense from "@/models/Expense";
import Holiday from "@/models/Holiday";
import { compensationForMonth } from "@/lib/compensationHistory";

function round2(num) {
  return Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;
}

function summarizeEntries(entries = [], holidayDates = new Set()) {
  let presentDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let regularHours = 0;
  let otHours = 0;

  for (const entry of entries) {
    if (entry.isHoliday || holidayDates.has(entry.date)) continue;

    const regular = Number(entry.regularHours || 0);
    const ot = Number(entry.otHours || 0);
    const leave = entry.leaveType || "";

    if (regular > 0 || ot > 0) {
      presentDays += 1;
    }

    if (
  leave === "CL" ||
  leave === "STUL" ||
  leave === "LTUL"
) {
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

function getCalendarSummary(month, holidays, user) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("Month must use YYYY-MM format");
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const finalDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const holidayDates = new Set(holidays.map((holiday) => holiday.date));
  const joiningDate = user.joiningDate
    ? new Date(user.joiningDate).toISOString().slice(0, 10)
    : "";
  const leavingDate = user.leavingDate
    ? new Date(user.leavingDate).toISOString().slice(0, 10)
    : "";

  let totalWeekdays = 0;
  let workingDays = 0;
  let holidayWeekdays = 0;
  let monthWorkingDays = 0;

  for (let day = 1; day <= finalDay; day += 1) {
    const date = month + "-" + String(day).padStart(2, "0");
    const weekday = new Date(date + "T00:00:00.000Z").getUTCDay();
    if (weekday !== 0 && weekday !== 6 && !holidayDates.has(date)) {
      monthWorkingDays += 1;
    }

    if (joiningDate && date < joiningDate) continue;
    if (leavingDate && date > leavingDate) continue;

    if (weekday === 0 || weekday === 6) continue;

    totalWeekdays += 1;
    if (holidayDates.has(date)) {
      holidayWeekdays += 1;
    } else {
      workingDays += 1;
    }
  }

  return { totalWeekdays, workingDays, holidayWeekdays, monthWorkingDays };
}

function buildPayrollFromTimesheet(user, timesheet, month, calendar, holidayDates, existing = null) {
  const summary = summarizeEntries(timesheet.entries || [], holidayDates);
  const existingPerDiem = Number(existing?.perDiemOtherIncome || 0);
  const compensation = compensationForMonth(user, month, existing);
  const payType = compensation.payType || "daily";

  const monthlyGrossSalary = Number(compensation.monthlyGrossSalary || 0);
  const annualGrossSalary = Number(compensation.annualGrossSalary || 0);
  const monthlySalaryBase = monthlyGrossSalary > 0
    ? monthlyGrossSalary
    : annualGrossSalary > 0
      ? annualGrossSalary / 12
      : 0;
  const perDayRate = payType === "daily" && monthlySalaryBase > 0 && calendar.monthWorkingDays > 0
    ? monthlySalaryBase / calendar.monthWorkingDays
    : Number(compensation.perDayRate || 0);
  const perHourRate = Number(compensation.perHourRate || 0);
  const otRatePerHour = Number(compensation.otRatePerHour || 0);

  const clientPerDayRate = Number(compensation.clientPerDayRate || 0);
  const clientPerHourRate = Number(compensation.clientPerHourRate || 0);
  const clientOtRatePerHour = Number(compensation.clientOtRatePerHour || 0);

  let payableDays = 0;

  let regularPay = 0;
  let poRegularAmountOriginal = 0;

  if (payType === "daily") {
    payableDays = summary.presentDays;

    regularPay = payableDays * perDayRate;
    poRegularAmountOriginal = payableDays * clientPerDayRate;
  } else if (payType === "hourly") {
    regularPay = summary.regularHours * perHourRate;
    poRegularAmountOriginal = summary.regularHours * clientPerHourRate;
  }

  const otPay = summary.otHours * otRatePerHour;
  const poOtAmountOriginal = summary.otHours * clientOtRatePerHour;
  const clientCurrency = compensation.clientCurrency === "CAD" ? "CAD" : "USD";
  const exchangeRateToUSD = clientCurrency === "CAD" ? Number(compensation.cadToUsdRate || 0) : 1;
  const poRegularAmount = round2(poRegularAmountOriginal * exchangeRateToUSD);
  const poOtAmount = round2(poOtAmountOriginal * exchangeRateToUSD);

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
    annualGrossSalary: round2(annualGrossSalary),
    monthlyGrossSalary: round2(monthlySalaryBase),

    payType,

    perDayRate,
    perHourRate,
    otRatePerHour,

    clientPerDayRate,
    clientPerHourRate,
    clientOtRatePerHour,
    clientCurrency,
    exchangeRateToUSD,

    totalWeekdays: calendar.totalWeekdays,
    workingDays: calendar.workingDays,
    holidayWeekdays: calendar.holidayWeekdays,
    numberOfDependents: Number(user.numberOfDependents || existing?.numberOfDependents || 0),

    presentDays: summary.presentDays,
    paidLeaveDays: summary.paidLeaveDays,
    unpaidLeaveDays: summary.unpaidLeaveDays,
    payableDays,

    regularHours: summary.regularHours,
    otHours: summary.otHours,

    regularPay: round2(regularPay),
    otPay: round2(otPay),
    grossPay: round2(grossPay),
    perDiemOtherIncome: round2(existingPerDiem),
    deductions: round2(deductions),
    allowances: round2(allowances),
    netPay: round2(netPay),

    poRegularAmount: round2(poRegularAmount),
    poOtAmount: round2(poOtAmount),
    poAmount: round2(poAmount),
    poRegularAmountOriginal: round2(poRegularAmountOriginal),
    poOtAmountOriginal: round2(poOtAmountOriginal),
    poAmountOriginal: round2(poRegularAmountOriginal + poOtAmountOriginal),

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

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")) {
      return Response.json({ error: "Month must use YYYY-MM format" }, { status: 400 });
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

    const holidays = await Holiday.find({ month }).select("date");
    const results = [];

    for (const timesheet of approvedTimesheets) {
      const user = timesheet.employeeId;

      if (!user) continue;
      if (user.role !== "employee") continue;
      if (user.status !== "active") continue;
      if (user.payrollEnabled === false) continue;

      const calendar = getCalendarSummary(month, holidays, user);
      const existing = await Payroll.findOne({ employeeId: user._id, month });
      const payload = buildPayrollFromTimesheet(
        user,
        timesheet,
        month,
        calendar,
        new Set(holidays.map((holiday) => holiday.date)),
        existing
      );
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
