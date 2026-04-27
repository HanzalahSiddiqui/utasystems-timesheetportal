import mongoose from "mongoose";

const PayrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    employeeCode: {
      type: String,
      required: true,
      trim: true,
    },
    employeeName: {
      type: String,
      required: true,
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
    month: {
      type: String,
      required: true,
      index: true,
    },
    timesheetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MonthlyTimesheet",
      required: true,
    },

    payType: {
      type: String,
      enum: ["daily", "hourly"],
      required: true,
    },

    // employee payout rates
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

    // client / PO rates
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

    presentDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidLeaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    unpaidLeaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    payableDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    regularHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    otHours: {
      type: Number,
      default: 0,
      min: 0,
    },

    // employee payout
    regularPay: {
      type: Number,
      default: 0,
      min: 0,
    },
    otPay: {
      type: Number,
      default: 0,
      min: 0,
    },
    grossPay: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    deductions: {
      type: Number,
      default: 0,
      min: 0,
    },
    allowances: {
      type: Number,
      default: 0,
      min: 0,
    },
    netPay: {
      type: Number,
      default: 0,
      min: 0,
    },

    // client / PO / billing
    poRegularAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    poOtAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    poAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    margin: {
      type: Number,
      default: 0,
    },
employerTax: {
  type: Number,
  default: 0,
},

netProfit: {
  type: Number,
  default: 0,
},
    status: {
      type: String,
      enum: ["draft", "finalized", "paid"],
      default: "draft",
    },
    
    remarks: {
      type: String,
      default: "",
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    employeeExpense: { type: Number, default: 0 },
realProfit: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PayrollSchema.index({ employeeId: 1, month: 1 }, { unique: true });

const Payroll = mongoose.models.Payroll || mongoose.model("Payroll", PayrollSchema);

export default Payroll;