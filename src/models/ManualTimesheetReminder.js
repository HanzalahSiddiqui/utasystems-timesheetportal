import mongoose from "mongoose";

const ManualTimesheetReminderSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    month: { type: String, required: true },
    recipient: { type: String, required: true },
    status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sentAt: { type: Date, default: null },
    error: { type: String, default: "" },
  },
  { timestamps: true }
);

const ManualTimesheetReminder =
  mongoose.models.ManualTimesheetReminder ||
  mongoose.model("ManualTimesheetReminder", ManualTimesheetReminderSchema);

export default ManualTimesheetReminder;
