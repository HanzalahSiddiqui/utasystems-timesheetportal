import mongoose from "mongoose";

const TimesheetEntrySchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    dayName: { type: String, required: true },
    regularHours: { type: Number, default: 0, min: 0, max: 8 },
    otHours: { type: Number, default: 0, min: 0 },
    leaveType: {
      type: String,
      enum: ["", "L", "SL", "VL"],
      default: "",
    },
    isHoliday: { type: Boolean, default: false },
    holidayTitle: { type: String, default: "" },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const MonthlyTimesheetSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    month: {
      type: String,
      required: true,
      index: true,
    },
    entries: {
      type: [TimesheetEntrySchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected", "reopened"],
      default: "draft",
    },
    locked: {
      type: Boolean,
      default: false,
    },
    adminOverride: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    reopenedAt: {
      type: Date,
      default: null,
    },
    reopenedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewComment: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

MonthlyTimesheetSchema.index({ employeeId: 1, month: 1 }, { unique: true });

const MonthlyTimesheet =
  mongoose.models.MonthlyTimesheet ||
  mongoose.model("MonthlyTimesheet", MonthlyTimesheetSchema);

export default MonthlyTimesheet;