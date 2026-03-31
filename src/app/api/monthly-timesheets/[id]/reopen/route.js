import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MonthlyTimesheet from "@/models/MonthlyTimesheet";

export async function PATCH(req, context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await connectDB();

    const item = await MonthlyTimesheet.findById(id);

    if (!item) {
      return Response.json({ error: "Record not found" }, { status: 404 });
    }

    item.locked = false;
    item.adminOverride = true;
    item.status = "reopened";
    item.reopenedAt = new Date();
    item.reopenedBy = session.user.id;

    await item.save();

    return Response.json({
      message: "Timesheet reopened successfully",
      item,
    });
  } catch (error) {
    console.error("PATCH /api/monthly-timesheets/[id]/reopen error:", error);
    return Response.json(
      { error: error.message || "Failed to reopen timesheet" },
      { status: 500 }
    );
  }
}