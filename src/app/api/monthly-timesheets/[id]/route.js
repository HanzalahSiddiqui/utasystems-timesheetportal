import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MonthlyTimesheet from "@/models/MonthlyTimesheet";

export async function GET(req, context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await connectDB();

    const item = await MonthlyTimesheet.findById(id)
      .populate("employeeId", "name email employeeId designation department")
      .populate("reviewedBy", "name email")
      .populate("reopenedBy", "name email");

    if (!item) {
      return Response.json({ error: "Record not found" }, { status: 404 });
    }

    if (
      session.user.role === "employee" &&
      item.employeeId?._id?.toString() !== session.user.id
    ) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Response.json({ item });
  } catch (error) {
    console.error("GET /api/monthly-timesheets/[id] error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch record" },
      { status: 500 }
    );
  }
}