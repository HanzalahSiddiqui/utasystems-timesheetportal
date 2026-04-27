import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import Payroll from "@/models/Payroll";

function round2(num) {
  return Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // e.g. 2026-04

    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    /* ================================
       🔹 DATE RANGE (MONTH FILTER)
    ================================= */

    let startDate = null;
    let endDate = null;

    if (month) {
      const [year, m] = month.split("-").map(Number);

      startDate = new Date(year, m - 1, 1);
      endDate = new Date(year, m, 1);
    }

    /* ================================
       🔹 EXPENSE QUERY
    ================================= */

    const expenseQuery = {
      status: { $in: ["approved", "submitted"] },
    };

    if (startDate && endDate) {
      expenseQuery.createdAt = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    const expenses = await Expense.find(expenseQuery);

    /* ================================
       🔹 PAYROLL QUERY
    ================================= */

    const payrollQuery = {};

    if (month) {
      payrollQuery.month = month;
    }

    const payrolls = await Payroll.find(payrollQuery);

    /* ================================
       🔹 CALCULATIONS
    ================================= */

    let totalEmployeeExpense = 0;
    let totalCompanyExpense = 0;
    let categoryBreakdown = {};
    let employeeBreakdown = {};

    for (const exp of expenses) {
      const amount = Number(exp.companyExpenseAmount || exp.amount || 0);

      // CATEGORY
      const category = (exp.category || "Other").toLowerCase();
      categoryBreakdown[category] =
        (categoryBreakdown[category] || 0) + amount;

      // SPLIT
      if (exp.expenseOwnerType === "company") {
        totalCompanyExpense += amount;
      } else {
        totalEmployeeExpense += amount;

        const emp = exp.employeeName || "Unknown";
        employeeBreakdown[emp] =
          (employeeBreakdown[emp] || 0) + amount;
      }
    }

    let totalPayrollCost = 0;
    let totalRevenue = 0;

    for (const p of payrolls) {
      totalPayrollCost += Number(p.netPay || 0);
      totalRevenue += Number(p.poAmount || 0);
    }

    const totalExpense = totalEmployeeExpense + totalCompanyExpense;

    const netProfit =
      totalRevenue - totalPayrollCost - totalExpense;

    /* ================================
       🔹 RESPONSE
    ================================= */

    return Response.json({
      summary: {
        totalRevenue: round2(totalRevenue),
        totalPayrollCost: round2(totalPayrollCost),
        totalEmployeeExpense: round2(totalEmployeeExpense),
        totalCompanyExpense: round2(totalCompanyExpense),
        totalExpense: round2(totalExpense),
        netProfit: round2(netProfit),
      },
      categoryBreakdown,
      employeeBreakdown,
    });

  } catch (error) {
    console.error("GET /api/profit-analytics error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}