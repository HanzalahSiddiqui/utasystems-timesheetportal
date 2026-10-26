import mongoose from "mongoose";

const TimesheetSubmissionNotificationSchema = new mongoose.Schema(
  {
    submissionKey: { type: String, required: true, unique: true },
    timesheetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MonthlyTimesheet",
      required: true,
    },
    employeeName: { type: String, required: true },
    employeeEmail: { type: String, required: true },
    employeeCode: { type: String, default: "-" },
    month: { type: String, required: true },
    totalHours: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["pending", "sent"], default: "pending" },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: "" },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const TimesheetSubmissionNotification =
  mongoose.models.TimesheetSubmissionNotification ||
  mongoose.model("TimesheetSubmissionNotification", TimesheetSubmissionNotificationSchema);

export default TimesheetSubmissionNotification;
