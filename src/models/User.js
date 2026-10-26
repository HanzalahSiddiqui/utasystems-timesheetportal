import mongoose from "mongoose";

const CompensationHistorySchema = new mongoose.Schema(
  {
    effectiveFrom: { type: String, required: true, match: /^\d{4}-\d{2}-01$/ },
    payType: { type: String, enum: ["daily", "hourly"], required: true },
    perDayRate: { type: Number, default: 0, min: 0 },
    perHourRate: { type: Number, default: 0, min: 0 },
    otRatePerHour: { type: Number, default: 0, min: 0 },
    annualGrossSalary: { type: Number, default: 0, min: 0 },
    monthlyGrossSalary: { type: Number, default: 0, min: 0 },
    clientPerDayRate: { type: Number, default: 0, min: 0 },
    clientPerHourRate: { type: Number, default: 0, min: 0 },
    clientOtRatePerHour: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    personalEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
      select: false,
    },

    ssnEncrypted: {
      type: String,
      default: "",
      select: false,
    },

    ssnLast4: {
      type: String,
      default: "",
      match: /^$|^\d{4}$/,
      select: false,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    designation: {
      type: String,
      default: "",
    },

    department: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      enum: ["admin", "employee"],
      default: "employee",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    timesheetRemindersEnabled: {
      type: Boolean,
      default: false,
    },

    // Employee Lifecycle
    joiningDate: {
      type: Date,
      default: null,
    },

    leavingDate: {
      type: Date,
      default: null,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    revocationReason: {
      type: String,
      default: "",
      trim: true,
    },

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },

    numberOfDependents: {
      type: Number,
      default: 0,
      min: 0,
      validate: Number.isInteger,
    },

    payType: {
      type: String,
      enum: ["daily", "hourly"],
      default: "daily",
    },

    perDayRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    perHourRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    otRatePerHour: {
      type: Number,
      default: 0,
      min: 0,
    },

    annualGrossSalary: {
      type: Number,
      default: 0,
    },

    monthlyGrossSalary: {
      type: Number,
      default: 0,
    },

    clientPerDayRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    clientPerHourRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    clientOtRatePerHour: {
      type: Number,
      default: 0,
      min: 0,
    },

    compensationHistory: {
      type: [CompensationHistorySchema],
      default: [],
    },

    payrollEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
