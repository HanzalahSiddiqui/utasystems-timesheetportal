import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getTimesheetEmailRecipient, sendTimesheetReminderEmail } from "@/lib/email";
import { getBusinessMonth, isPastValidTo } from "@/lib/datePolicy";
import ManualTimesheetReminder from "@/models/ManualTimesheetReminder";
import MonthlyTimesheet from "@/models/MonthlyTimesheet";
import TimesheetReminderDelivery from "@/models/TimesheetReminderDelivery";
import User from "@/models/User";

function validMonth(month) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month || "");
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "admin" ? session : null;
}

export async function GET(request) {
  try {
    if (!(await requireAdmin())) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || getBusinessMonth();
    if (!validMonth(month) || month > getBusinessMonth()) {
      return Response.json({ error: "Choose a valid past or current month" }, { status: 400 });
    }

    await connectDB();
    const employees = await User.find({
      role: "employee",
      status: "active",
      email: { $type: "string", $ne: "" },
    })
      .select("name email personalEmail employeeId joiningDate leavingDate createdAt timesheetRemindersEnabled")
      .sort({ name: 1 });
    const eligibleEmployees = employees.filter((employee) => {
      const joinedMonth = (employee.joiningDate || employee.createdAt)?.toISOString().slice(0, 7);
      return !isPastValidTo(employee.leavingDate) && (!joinedMonth || joinedMonth <= month);
    });
    const employeeIds = eligibleEmployees.map((employee) => employee._id);
    const [timesheets, reminders, scheduledReminders] = await Promise.all([
      MonthlyTimesheet.find({ employeeId: { $in: employeeIds }, month }).select("employeeId status"),
      ManualTimesheetReminder.find({ employeeId: { $in: employeeIds }, month })
        .sort({ createdAt: -1 })
        .populate("sentBy", "name email")
        .select("employeeId month recipient status sentAt error createdAt sentBy"),
      TimesheetReminderDelivery.find({ employeeId: { $in: employeeIds }, months: month })
        .sort({ sentAt: -1 })
        .select("employeeId date sentAt lastError"),
    ]);
    const timesheetByEmployee = new Map(timesheets.map((item) => [String(item.employeeId), item.status]));
    const reminderByEmployee = new Map();
    const deliveryHistory = [
      ...reminders.map((reminder) => ({
        employeeId: reminder.employeeId,
        status: reminder.status,
        sentAt: reminder.sentAt,
        recipient: reminder.recipient,
        error: reminder.error,
        createdAt: reminder.createdAt,
        sentBy: reminder.sentBy?.name || "Admin",
      })),
      ...scheduledReminders.map((reminder) => ({
        employeeId: reminder.employeeId,
        status: reminder.sentAt ? "sent" : "failed",
        sentAt: reminder.sentAt,
        recipient: "Scheduled reminder",
        error: reminder.lastError,
        createdAt: reminder.sentAt,
        sentBy: "Automatic",
      })),
    ].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
    for (const reminder of deliveryHistory) {
      const key = String(reminder.employeeId);
      if (!reminderByEmployee.has(key)) reminderByEmployee.set(key, reminder);
    }

    const items = eligibleEmployees.map((employee) => {
      const key = String(employee._id);
      const reminder = reminderByEmployee.get(key);
      return {
        _id: key,
        name: employee.name,
        email: employee.email,
        personalEmail: employee.personalEmail || "",
        reminderEmail: getTimesheetEmailRecipient(employee.personalEmail || employee.email),
        employeeCode: employee.employeeId,
        reminderEnabled: employee.timesheetRemindersEnabled === true,
        timesheetStatus: timesheetByEmployee.get(key) || "missing",
        lastReminder: reminder
          ? {
              recipient: reminder.recipient,
              status: reminder.status,
              sentAt: reminder.sentAt,
              error: reminder.error,
              createdAt: reminder.createdAt,
              sentBy: reminder.sentBy,
            }
          : null,
      };
    });
    return Response.json({ month, items });
  } catch (error) {
    console.error("GET /api/monthly-timesheets/reminders error:", error);
    return Response.json({ error: "Failed to load reminder options" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await requireAdmin();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { employees } = await request.json();
    if (!Array.isArray(employees) || employees.length > 500) {
      return Response.json({ error: "A valid employee selection is required" }, { status: 400 });
    }
    const updates = employees.filter(
      (item) => mongoose.isValidObjectId(item?.employeeId) && typeof item.enabled === "boolean"
    );
    if (updates.length !== employees.length) {
      return Response.json({ error: "Invalid reminder preference" }, { status: 400 });
    }
    await connectDB();
    await Promise.all(
      updates.map(({ employeeId, enabled }) =>
        User.updateOne(
          { _id: employeeId, role: "employee" },
          { $set: { timesheetRemindersEnabled: enabled } }
        )
      )
    );
    return Response.json({ message: "Automatic reminder preferences saved" });
  } catch (error) {
    console.error("PATCH /api/monthly-timesheets/reminders error:", error);
    return Response.json({ error: "Failed to save reminder preferences" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireAdmin();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { month, employeeIds } = await request.json();
    if (!validMonth(month) || month > getBusinessMonth() || !Array.isArray(employeeIds) || !employeeIds.length || employeeIds.length > 200) {
      return Response.json({ error: "Choose a valid month and at least one employee" }, { status: 400 });
    }
    if (employeeIds.some((id) => !mongoose.isValidObjectId(id))) {
      return Response.json({ error: "Invalid employee selection" }, { status: 400 });
    }

    await connectDB();
    const employees = await User.find({
      _id: { $in: [...new Set(employeeIds)] },
      role: "employee",
      status: "active",
    }).select("name email personalEmail employeeId joiningDate createdAt leavingDate");
    const existingTimesheets = await MonthlyTimesheet.find({
      employeeId: { $in: employees.map((employee) => employee._id) },
      month,
      status: { $in: ["submitted", "approved", "rejected"] },
    }).select("employeeId");
    const completed = new Set(existingTimesheets.map((item) => String(item.employeeId)));
    const results = [];

    for (const employee of employees) {
      const employeeId = String(employee._id);
      if (isPastValidTo(employee.leavingDate)) {
        results.push({ employeeId, name: employee.name, status: "skipped", reason: "Employee is past valid-to date" });
        continue;
      }
      const joinedMonth = (employee.joiningDate || employee.createdAt)?.toISOString().slice(0, 7);
      if (joinedMonth && joinedMonth > month) {
        results.push({ employeeId, name: employee.name, status: "skipped", reason: "Employee was not yet active for this month" });
        continue;
      }
      if (completed.has(employeeId)) {
        results.push({ employeeId, name: employee.name, status: "skipped", reason: "Timesheet already submitted" });
        continue;
      }

      const actualRecipient = employee.personalEmail || employee.email;
      const delivery = await ManualTimesheetReminder.create({
        employeeId: employee._id,
        month,
        recipient: getTimesheetEmailRecipient(actualRecipient),
        sentBy: session.user.id,
        status: "pending",
      });
      try {
        await sendTimesheetReminderEmail({
          employee: { name: employee.name, email: actualRecipient },
          months: [month],
        });
        delivery.status = "sent";
        delivery.sentAt = new Date();
        delivery.error = "";
        await delivery.save();
        results.push({ employeeId, name: employee.name, status: "sent", sentAt: delivery.sentAt });
      } catch (error) {
        delivery.status = "failed";
        delivery.error = String(error.message || "Email delivery failed").slice(0, 500);
        await delivery.save();
        results.push({ employeeId, name: employee.name, status: "failed", reason: delivery.error });
      }
    }
    return Response.json({ results });
  } catch (error) {
    console.error("POST /api/monthly-timesheets/reminders error:", error);
    return Response.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}
