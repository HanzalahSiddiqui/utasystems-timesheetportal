import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Payroll from "@/models/Payroll";
import mongoose from "mongoose";

export async function PATCH(req, context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid payroll ID" }, { status: 400 });
    }

    await connectDB();

    const item = await Payroll.findById(id);

    if (!item) {
      return Response.json({ error: "Payroll record not found" }, { status: 404 });
    }

    item.status = "paid";
    item.paidAt = new Date();

    if (!item.finalizedAt) {
      item.finalizedAt = new Date();
    }

    await item.save();

    return Response.json({
      message: "Payroll marked as paid successfully",
      item,
    });
  } catch (error) {
    console.error("PATCH /api/payroll/[id]/mark-paid error:", error);
    return Response.json(
      { error: error.message || "Failed to mark payroll as paid" },
      { status: 500 }
    );
  }
}