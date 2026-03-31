import mongoose from "mongoose";

const HolidaySchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    month: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Holiday =
  mongoose.models.Holiday || mongoose.model("Holiday", HolidaySchema);

export default Holiday;