import mongoose from "mongoose";

const TimesheetReviewNotificationSchema = new mongoose.Schema(
  {
    notificationKey: { type: String, required: true, unique: true },
    timesheetId: { type: mongoose.Schema.Types.ObjectId, ref: "MonthlyTimesheet", required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    employeeName: { type: String, required: true },
    employeeEmail: { type: String, required: true },
    month: { type: String, required: true },
    action: { type: String, enum: ["approved", "rejected"], required: true },
    reviewComment: { type: String, default: "" },
    status: { type: String, enum: ["pending", "sent"], default: "pending" },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: "" },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const TimesheetReviewNotification =
  mongoose.models.TimesheetReviewNotification ||
  mongoose.model("TimesheetReviewNotification", TimesheetReviewNotificationSchema);

export default TimesheetReviewNotification;
