import { connectDB } from "@/lib/mongodb";
import { BUSINESS_TIME_ZONE, getBusinessDate, getBusinessMonth, isPastValidTo } from "@/lib/datePolicy";
import { sendTimesheetReminderEmail, sendTimesheetReviewEmail, sendTimesheetSubmittedEmail } from "@/lib/email";
import MonthlyTimesheet from "@/models/MonthlyTimesheet";
import TimesheetReminderDelivery from "@/models/TimesheetReminderDelivery";
import TimesheetSubmissionNotification from "@/models/TimesheetSubmissionNotification";
import TimesheetReviewNotification from "@/models/TimesheetReviewNotification";
import User from "@/models/User";

function getLocalHourAndMinute(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map(({ type, value }) => [type, value]));
}

function previousMonth(month) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, number - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthsBetween(startMonth, endMonth) {
  const months = [];
  const [startYear, startNumber] = startMonth.split("-").map(Number);
  const [endYear, endNumber] = endMonth.split("-").map(Number);
  let cursor = new Date(Date.UTC(startYear, startNumber - 1, 1));
  const end = new Date(Date.UTC(endYear, endNumber - 1, 1));
  while (cursor <= end && months.length < 2400) {
    months.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

function isLastDayOfMonth(date, month) {
  const [year, number] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Number(date.slice(-2)) === lastDay;
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const { hour } = getLocalHourAndMinute(now);
  if (hour !== "09") {
    return Response.json({ skipped: true, reason: "Outside the 9:00 a.m. Central Time window" });
  }

  try {
    await connectDB();
    let hrNotificationsSent = 0;
    const pendingNotifications = await TimesheetSubmissionNotification.find({ status: "pending" })
      .sort({ createdAt: 1 })
      .limit(100);
    for (const notification of pendingNotifications) {
      try {
        await sendTimesheetSubmittedEmail({
          employee: {
            name: notification.employeeName,
            email: notification.employeeEmail,
            employeeId: notification.employeeCode,
          },
          month: notification.month,
          totalHours: notification.totalHours,
        });
        notification.status = "sent";
        notification.sentAt = new Date();
        notification.lastError = "";
        await notification.save();
        hrNotificationsSent += 1;
      } catch (emailError) {
        notification.attempts += 1;
        notification.lastError = String(emailError.message || "Email delivery failed").slice(0, 500);
        await notification.save();
      }
    }

    let reviewNotificationsSent = 0;
    const pendingReviewNotifications = await TimesheetReviewNotification.find({ status: "pending" })
      .sort({ createdAt: 1 })
      .limit(100);
    for (const notification of pendingReviewNotifications) {
      try {
        await sendTimesheetReviewEmail({
          employee: { name: notification.employeeName, email: notification.employeeEmail },
          month: notification.month,
          action: notification.action,
          reviewComment: notification.reviewComment,
        });
        notification.status = "sent";
        notification.sentAt = new Date();
        notification.lastError = "";
        await notification.save();
        reviewNotificationsSent += 1;
      } catch (emailError) {
        notification.attempts += 1;
        notification.lastError = String(emailError.message || "Email delivery failed").slice(0, 500);
        await notification.save();
      }
    }

    const businessDate = getBusinessDate(now);
    const currentMonth = getBusinessMonth(now);
    const dueThroughMonth = isLastDayOfMonth(businessDate, currentMonth)
      ? currentMonth
      : previousMonth(currentMonth);
    const employees = await User.find({
      role: "employee",
      status: "active",
      timesheetRemindersEnabled: true,
      email: { $type: "string", $ne: "" },
    }).select("name email personalEmail employeeId joiningDate leavingDate createdAt");

    let sent = 0;
    let skipped = 0;
    for (const employee of employees) {
      if (isPastValidTo(employee.leavingDate, now)) continue;
      const startDate = employee.joiningDate || employee.createdAt;
      const startMonth = startDate.toISOString().slice(0, 7);
      const eligibleMonths = monthsBetween(startMonth, dueThroughMonth);
      if (!eligibleMonths.length) continue;

      const completed = await MonthlyTimesheet.find({
        employeeId: employee._id,
        month: { $in: eligibleMonths },
        status: { $in: ["submitted", "approved", "rejected"] },
      }).select("month");
      const completedMonths = new Set(completed.map((item) => item.month));
      const missingMonths = eligibleMonths.filter((month) => !completedMonths.has(month));
      if (!missingMonths.length) continue;

      const delivery = await TimesheetReminderDelivery.findOneAndUpdate(
        { employeeId: employee._id, date: businessDate },
        { $setOnInsert: { employeeId: employee._id, date: businessDate, months: missingMonths } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (delivery.sentAt) {
        skipped += 1;
        continue;
      }

      try {
        await sendTimesheetReminderEmail({
          employee: { ...employee.toObject(), email: employee.personalEmail || employee.email },
          months: missingMonths,
        });
        delivery.sentAt = new Date();
        delivery.lastError = "";
        await delivery.save();
        sent += 1;
      } catch (error) {
        delivery.attempts += 1;
        delivery.lastError = String(error.message || "Email delivery failed").slice(0, 500);
        await delivery.save();
        console.error("Employee timesheet reminder failed:", error);
      }
    }

    return Response.json({ sent, skipped, hrNotificationsSent, reviewNotificationsSent, date: businessDate });
  } catch (error) {
    console.error("Monthly timesheet reminder job failed:", error);
    return Response.json({ error: "Reminder job failed" }, { status: 500 });
  }
}
