import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import mongoose from "mongoose";

export async function PATCH(req, context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid expense ID" }, { status: 400 });
    }

    const body = await req.json();
    const { reviewComment = "" } = body;

    if (!reviewComment.trim()) {
      return Response.json(
        { error: "Review comment is required for rejection" },
        { status: 400 }
      );
    }

    await connectDB();

    const item = await Expense.findById(id);

    if (!item) {
      return Response.json({ error: "Expense not found" }, { status: 404 });
    }

    item.status = "rejected";
    item.reviewComment = reviewComment.trim();
    item.rejectedAt = new Date();
    item.approvedAt = null;
    item.updatedBy = session.user.id;

    await item.save();

    return Response.json({
      message: "Expense rejected successfully",
      item,
    });
  } catch (error) {
    console.error("PATCH /api/expenses/[id]/reject error:", error);
    return Response.json(
      { error: error.message || "Failed to reject expense" },
      { status: 500 }
    );
  }
}