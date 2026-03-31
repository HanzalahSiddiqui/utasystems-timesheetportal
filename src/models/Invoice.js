import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payroll",
      required: true,
      unique: true,
    },

    employeeName: {
      type: String,
      required: true,
      trim: true,
    },

    jobTitle: {
      type: String,
      default: "",
      trim: true,
    },

    clientName: {
      type: String,
      required: true,
      trim: true,
    },

    clientEmail: {
      type: String,
      required: true,
      trim: true,
    },

    clientAddress: {
      type: String,
      default: "",
      trim: true,
    },

    month: {
      type: String,
      required: true,
      index: true,
    },

    issueDate: {
      type: Date,
      default: Date.now,
    },

    billingDateFrom: {
      type: String,
      required: true,
    },

    billingDateTo: {
      type: String,
      required: true,
    },

    professionalServiceCharges: {
      type: Number,
      required: true,
      min: 0,
    },

    totalDue: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["draft", "finalized", "sent", "paid"],
      default: "draft",
    },

    notes: {
      type: String,
      default: "",
    },

    finalizedAt: {
      type: Date,
      default: null,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

InvoiceSchema.index({ employeeId: 1, month: 1 }, { unique: true });

const Invoice =
  mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);

export default Invoice;