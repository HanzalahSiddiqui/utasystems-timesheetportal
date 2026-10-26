import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getTimesheetEmailRecipient, sendTimesheetReviewEmail } from "@/lib/email";
import MonthlyTimesheet from "@/models/MonthlyTimesheet";
import TimesheetReviewNotification from "@/models/TimesheetReviewNotification";
import User from "@/models/User";

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

    const statusChanged = item.status !== action;
    item.status = action;
    item.locked = true;
    item.adminOverride = false;
    item.reviewedBy = session.user.id;
    item.reviewComment = reviewComment.trim();

    await item.save();

    let employeeNotification = "not-needed";
    if (statusChanged) {
      const employee = await User.findById(item.employeeId).select("name email personalEmail employeeId");
      if (employee) {
        const actualRecipient = employee.personalEmail || employee.email;
        const notification = await TimesheetReviewNotification.create({
          notificationKey: `${item._id}:${action}:${item.updatedAt.getTime()}`,
          timesheetId: item._id,
          employeeId: employee._id,
          employeeName: employee.name,
          employeeEmail: actualRecipient,
          month: item.month,
          action,
          reviewComment: item.reviewComment,
          status: "pending",
        });
        try {
          await sendTimesheetReviewEmail({
            employee: { ...employee.toObject(), email: actualRecipient },
            month: item.month,
            action,
            reviewComment: item.reviewComment,
          });
          notification.status = "sent";
          notification.sentAt = new Date();
          notification.lastError = "";
          await notification.save();
          employeeNotification = "sent";
        } catch (emailError) {
          notification.attempts += 1;
          notification.lastError = String(emailError.message || "Email delivery failed").slice(0, 500);
          await notification.save();
          console.error("Timesheet review email failed:", emailError);
          employeeNotification = "pending-retry";
        }
      }
    }

    return Response.json({
      message:
        action === "approved"
          ? "Timesheet approved successfully"
          : "Timesheet rejected successfully",
      item,
      employeeNotification,
    });
  } catch (error) {
    console.error("PATCH /api/monthly-timesheets/[id]/review error:", error);
    return Response.json(
      { error: error.message || "Failed to review timesheet" },
      { status: 500 }
    );
  }
}
