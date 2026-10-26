import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MonthlyTimesheet from "@/models/MonthlyTimesheet";
import Holiday from "@/models/Holiday";
import User from "@/models/User";
import { sendTimesheetSubmittedEmail } from "@/lib/email";
import TimesheetSubmissionNotification from "@/models/TimesheetSubmissionNotification";
import { getBusinessMonth } from "@/lib/datePolicy";

function getCurrentMonth() {
  return getBusinessMonth();
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    const query = {};

    if (session.user.role === "employee") {
      query.employeeId = session.user.id;
    }

    if (month) {
      query.month = month;
    }

    const items = await MonthlyTimesheet.find(query)
      .populate("employeeId", "name email employeeId")
      .sort({ createdAt: -1 });

    return Response.json({ items });
  } catch (error) {
    console.error("GET /api/monthly-timesheets error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch monthly timesheets" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "employee") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { month, entries, submit } = body;

    if (!month || !Array.isArray(entries) || entries.length === 0) {
      return Response.json(
        { error: "Month and entries are required" },
        { status: 400 }
      );
    }

    const currentMonth = getCurrentMonth();

    if (month > currentMonth) {
      return Response.json(
        { error: "Future months are not allowed" },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await MonthlyTimesheet.findOne({
      employeeId: session.user.id,
      month,
    });
    const shouldNotifyHR =
      !!submit &&
      !["submitted", "approved", "rejected"].includes(existing?.status);

    if (existing && existing.locked && !existing.adminOverride) {
      return Response.json(
        { error: "This month is locked. Admin must reopen it first." },
        { status: 400 }
      );
    }

    const holidays = await Holiday.find({ month });
    const holidayMap = new Map(holidays.map((h) => [h.date, h.title]));

    const sanitizedEntries = entries.map((entry) => {
      const isHoliday = holidayMap.has(entry.date);
      const holidayTitle = holidayMap.get(entry.date) || "";

      const regularHours = Number(entry.regularHours || 0);
      const otHours = Number(entry.otHours || 0);
      const leaveType = entry.leaveType || "";

      if (regularHours > 8) {
        throw new Error(`Regular hours cannot exceed 8 for ${entry.date}`);
      }

      if (leaveType && (regularHours > 0 || otHours > 0)) {
        throw new Error(`Leave and hours cannot coexist for ${entry.date}`);
      }

      return {
        date: entry.date,
        dayName: entry.dayName,
        regularHours: isHoliday ? 0 : regularHours,
        otHours: isHoliday ? 0 : otHours,
        leaveType: isHoliday ? "" : leaveType,
        isHoliday,
        holidayTitle,
        total: isHoliday ? 0 : regularHours + otHours,
      };
    });

    const payload = {
      employeeId: session.user.id,
      month,
      entries: sanitizedEntries,
      status: submit
        ? "submitted"
        : existing?.status === "reopened"
        ? "reopened"
        : "draft",
      locked: !!submit,
      adminOverride: false,
      submittedAt: submit ? new Date() : existing?.submittedAt || null,
    };

    let doc;

    if (existing) {
      existing.entries = payload.entries;
      existing.status = payload.status;
      existing.locked = payload.locked;
      existing.adminOverride = payload.adminOverride;
      existing.submittedAt = payload.submittedAt;
      doc = await existing.save();
    } else {
      doc = await MonthlyTimesheet.create(payload);
    }

    let hrNotificationSent = false;
    if (shouldNotifyHR) {
      try {
        const employee = await User.findById(session.user.id).select("name email employeeId");
        if (employee) {
          const totalHours = sanitizedEntries.reduce(
            (sum, entry) => sum + Number(entry.regularHours || 0) + Number(entry.otHours || 0),
            0
          );
          const submissionKey = `${doc._id}-${new Date(doc.submittedAt).getTime()}`;
          const notification = await TimesheetSubmissionNotification.findOneAndUpdate(
            { submissionKey },
            {
              $setOnInsert: {
                submissionKey,
                timesheetId: doc._id,
                employeeName: employee.name,
                employeeEmail: employee.email,
                employeeCode: employee.employeeId,
                month,
                totalHours,
                status: "pending",
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          if (notification.status !== "sent") {
            try {
              await sendTimesheetSubmittedEmail({ employee, month, totalHours });
              notification.status = "sent";
              notification.sentAt = new Date();
              notification.lastError = "";
              await notification.save();
              hrNotificationSent = true;
            } catch (emailError) {
              notification.attempts += 1;
              notification.lastError = String(emailError.message || "Email delivery failed").slice(0, 500);
              await notification.save();
              console.error("HR timesheet submission notification failed:", emailError);
            }
          } else {
            hrNotificationSent = true;
          }
        }
      } catch (notificationError) {
        console.error("HR timesheet notification could not be queued:", notificationError);
      }
    }

    return Response.json({
      message: submit
        ? "Timesheet submitted successfully"
        : "Draft saved successfully",
      item: doc,
      ...(shouldNotifyHR ? { hrNotificationSent } : {}),
    });
  } catch (error) {
    console.error("POST /api/monthly-timesheets error:", error);
    return Response.json(
      { error: error.message || "Failed to save timesheet" },
      { status: 500 }
    );
  }
}
