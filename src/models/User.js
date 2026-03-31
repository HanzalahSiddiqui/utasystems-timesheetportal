import mongoose from "mongoose";

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
    password: {
      type: String,
      required: true,
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

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
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

    payrollEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;