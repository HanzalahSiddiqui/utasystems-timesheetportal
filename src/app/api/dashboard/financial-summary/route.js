import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Payroll from "@/models/Payroll";
import Expense from "@/models/Expense";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    if (!month) {
      return Response.json({ error: "Month is required" }, { status: 400 });
    }

    /* ================================
       🔹 DATE RANGE
    ================================= */

    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    /* ================================
       🔹 PAYROLL DATA
    ================================= */

    const payrollItems = await Payroll.find({ month });

    const totalRevenue = payrollItems.reduce(
      (sum, item) => sum + Number(item.poAmount || 0),
      0
    );

    const totalPayrollCost = payrollItems.reduce(
      (sum, item) => sum + Number(item.grossPay || 0),
      0
    );

    /* ================================
       🔹 EXPENSE DATA
    ================================= */

    const expenses = await Expense.find({
  $or: [
    { expenseDate: { $gte: start, $lt: end } },
    { 
      expenseDate: { $exists: false },
      createdAt: { $gte: start, $lt: end }
    }
  ]
});

    let totalEmployeeExpense = 0;
    let totalCompanyExpense = 0;

    const categoryMap = {};
    const employeeMap = {};

    for (const exp of expenses) {
      const amount = Number(exp.amount || 0);

      /* --- TYPE SPLIT --- */
      if (exp.expenseOwnerType === "company") {
        totalCompanyExpense += amount;
      } else {
        totalEmployeeExpense += amount;
      }

      /* --- CATEGORY BREAKDOWN --- */
      const category = exp.category || "Other";
      categoryMap[category] = (categoryMap[category] || 0) + amount;

      /* --- EMPLOYEE BREAKDOWN --- */
      const employeeName = exp.employeeName || "Company";
      employeeMap[employeeName] =
        (employeeMap[employeeName] || 0) + amount;
    }

    const totalExpense = totalEmployeeExpense + totalCompanyExpense;

    /* ================================
       🔹 FINAL PROFIT
    ================================= */

    const netProfit =
      totalRevenue - totalPayrollCost - totalExpense;

    /* ================================
       🔹 RESPONSE
    ================================= */

    return Response.json({
      summary: {
        totalRevenue,
        totalPayrollCost,
        totalEmployeeExpense,
        totalCompanyExpense,
        totalExpense,
        netProfit,
      },

      categoryBreakdown: categoryMap,
      employeeBreakdown: employeeMap,
    });

  } catch (error) {
    console.error("financial-summary error:", error);

    return Response.json(
      { error: error.message || "Failed to load summary" },
      { status: 500 }
    );
  }
}