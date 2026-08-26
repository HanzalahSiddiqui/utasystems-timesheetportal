import mongoose from "mongoose";

const ExpenseCounterSchema = new mongoose.Schema(
  {
    ownerKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    lastSequence: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const ExpenseCounter =
  mongoose.models.ExpenseCounter ||
  mongoose.model("ExpenseCounter", ExpenseCounterSchema);

export default ExpenseCounter;