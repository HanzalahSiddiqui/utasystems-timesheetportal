import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import MonthlyTimesheet from "@/models/MonthlyTimesheet";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const [
      totalEmployees,
      totalDraft,
      totalSubmitted,
      totalApproved,
      totalRejected,
      totalReopened,
    ] = await Promise.all([
      User.countDocuments({ role: "employee", status: "active" }),
      MonthlyTimesheet.countDocuments({ status: "draft" }),
      MonthlyTimesheet.countDocuments({ status: "submitted" }),
      MonthlyTimesheet.countDocuments({ status: "approved" }),
      MonthlyTimesheet.countDocuments({ status: "rejected" }),
      MonthlyTimesheet.countDocuments({ status: "reopened" }),
    ]);

    return Response.json({
      totalEmployees,
      totalDraft,
      totalSubmitted,
      totalApproved,
      totalRejected,
      totalReopened,
      pendingAction: totalSubmitted,
    });
  } catch (error) {
    console.error("GET /api/dashboard/admin-stats error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}