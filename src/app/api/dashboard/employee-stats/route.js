import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MonthlyTimesheet from "@/models/MonthlyTimesheet";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "employee") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const employeeId = session.user.id;

    const [
      totalMonths,
      totalDraft,
      totalSubmitted,
      totalApproved,
      totalRejected,
      totalReopened,
    ] = await Promise.all([
      MonthlyTimesheet.countDocuments({ employeeId }),
      MonthlyTimesheet.countDocuments({ employeeId, status: "draft" }),
      MonthlyTimesheet.countDocuments({ employeeId, status: "submitted" }),
      MonthlyTimesheet.countDocuments({ employeeId, status: "approved" }),
      MonthlyTimesheet.countDocuments({ employeeId, status: "rejected" }),
      MonthlyTimesheet.countDocuments({ employeeId, status: "reopened" }),
    ]);

    return Response.json({
      totalMonths,
      totalDraft,
      totalSubmitted,
      totalApproved,
      totalRejected,
      totalReopened,
    });
  } catch (error) {
    console.error("GET /api/dashboard/employee-stats error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch employee stats" },
      { status: 500 }
    );
  }
}