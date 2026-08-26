import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema(
  {
    // =========================================
    // EXPENSE ID
    // Format:
    // EXP-YYYYMMDD-INITIALS-001
    // Example:
    // EXP-20260825-MA-001
    // =========================================
    expenseId: {
      type: String,
      unique: true,
      sparse: true,
      immutable: true,
      trim: true,
      index: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // allow company expense
    },

    employeeName: {
      type: String,
      default: "",
    },

    employeeCode: {
      type: String,
      default: "",
    },

    expenseOwnerType: {
      type: String,
      enum: ["employee", "company"],
      default: "employee",
    },

    category: {
      type: String,
      default: "Other",
    },

  expenseType: {
  type: String,
  enum: [
    "travel",
    "fuel",
    "meal",
    "hotel",
    "medical",
    "office",
    "internet",
    "insurance",
    "utilities",
    "rent",
    "software",
    "marketing",
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
      default: "",
    },

    receiptFileName: {
      type: String,
      default: "",
      trim: true,
    },

    incurredByName: {
      type: String,
      default: "",
      trim: true,
    },

    incurredFor: {
      type: String,
      enum: ["self", "company", "client", "other"],
      default: "self",
    },

   paidBy: {
  type: String,
  enum: ["company", "employee"],
  required: true,
  default: "company",
},

paidByEmployeeId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
},

paidByName: {
  type: String,
  default: "",
  trim: true,
},

    expenseDate: {
      type: Date,
      required: false,
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

    evidence: [
      {
        url: {
          type: String,
          required: true,
        },

        fileName: {
          type: String,
          default: "",
        },

        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        uploadedByRole: {
          type: String,
          enum: ["admin", "employee"],
        },

        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Expense =
  mongoose.models.Expense ||
  mongoose.model("Expense", ExpenseSchema);

export default Expense;