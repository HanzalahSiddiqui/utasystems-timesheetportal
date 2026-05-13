import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Payroll from "@/models/Payroll";
import User from "@/models/User";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
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
        { designation: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
      ];
    }

    const payrollItems = await Payroll.find(query).sort({
  employeeName: 1,
  createdAt: -1,
});

const items = await Promise.all(
  payrollItems.map(async (item) => {

    const employee = await User.findOne({
      employeeId: item.employeeCode,
    });

    return {
      ...item.toObject(),

      annualGrossSalary:
        employee?.annualGrossSalary || 0,

      monthlyGrossSalary:
        employee?.monthlyGrossSalary || 0,
    };
  })
);

    return Response.json({ items });
  } catch (error) {
    console.error("GET /api/payroll error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch payroll" },
      { status: 500 }
    );
  }
}