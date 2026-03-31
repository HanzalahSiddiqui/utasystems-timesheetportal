import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    employeeName: {
      type: String,
      default: "",
    },

    employeeCode: {
      type: String,
      default: "",
    },

    expenseType: {
      type: String,
      enum: [
        "travel",
        "meal",
        "fuel",
        "hotel",
        "medical",
        "office",
        "internet",
        "transport",
        "other",
      ],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    companyExpenseAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    receiptUrl: {
      type: String,
      required: true,
    },

    receiptFileName: {
      type: String,
      default: "",
      trim: true,
    },

    incurredByName: {
      type: String,
      required: true,
      trim: true,
    },

    incurredFor: {
      type: String,
      enum: ["self", "company", "client", "other"],
      default: "self",
    },

    paidBy: {
      type: String,
      enum: ["employee", "company"],
      required: true,
      default: "employee",
    },

    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected", "paid"],
      default: "submitted",
    },

    reviewComment: {
      type: String,
      default: "",
      trim: true,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

const Expense =
  mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);

export default Expense;