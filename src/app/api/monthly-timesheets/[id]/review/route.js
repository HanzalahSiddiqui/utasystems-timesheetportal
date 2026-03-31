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
    const body = await req.json();
    const { action, reviewComment = "" } = body;

    if (!["approved", "rejected"].includes(action)) {
      return Response.json(
        { error: "Invalid review action" },
        { status: 400 }
      );
    }

    if (action === "rejected" && !reviewComment.trim()) {
      return Response.json(
        { error: "Review comment is required for rejection" },
        { status: 400 }
      );
    }

    await connectDB();

    const item = await MonthlyTimesheet.findById(id);

    if (!item) {
      return Response.json({ error: "Record not found" }, { status: 404 });
    }

    item.status = action;
    item.locked = true;
    item.adminOverride = false;
    item.reviewedBy = session.user.id;
    item.reviewComment = reviewComment.trim();

    await item.save();

    return Response.json({
      message:
        action === "approved"
          ? "Timesheet approved successfully"
          : "Timesheet rejected successfully",
      item,
    });
  } catch (error) {
    console.error("PATCH /api/monthly-timesheets/[id]/review error:", error);
    return Response.json(
      { error: error.message || "Failed to review timesheet" },
      { status: 500 }
    );
  }
}