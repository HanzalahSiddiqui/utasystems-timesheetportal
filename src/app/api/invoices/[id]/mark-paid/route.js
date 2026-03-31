import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import mongoose from "mongoose";

export async function PATCH(req, context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid invoice ID" }, { status: 400 });
    }

    await connectDB();

    const item = await Invoice.findById(id);

    if (!item) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }

    item.status = "paid";

    if (!item.finalizedAt) {
      item.finalizedAt = new Date();
    }

    if (!item.sentAt) {
      item.sentAt = new Date();
    }

    if (!item.paidAt) {
      item.paidAt = new Date();
    }

    await item.save();

    return Response.json({
      message: "Invoice marked as paid successfully",
      item,
    });
  } catch (error) {
    console.error("PATCH /api/invoices/[id]/mark-paid error:", error);
    return Response.json(
      { error: error.message || "Failed to mark invoice as paid" },
      { status: 500 }
    );
  }
}