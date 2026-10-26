import mongoose from "mongoose";

const TimesheetReminderDeliverySchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: String, required: true },
    months: { type: [String], default: [] },
    sentAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: "" },
  },
  { timestamps: true }
);

TimesheetReminderDeliverySchema.index(
  { employeeId: 1, date: 1 },
  { unique: true }
);

const TimesheetReminderDelivery =
  mongoose.models.TimesheetReminderDelivery ||
  mongoose.model("TimesheetReminderDelivery", TimesheetReminderDeliverySchema);

export default TimesheetReminderDelivery;
