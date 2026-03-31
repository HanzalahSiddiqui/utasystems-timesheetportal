import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Payroll from "@/models/Payroll";
import mongoose from "mongoose";

function round2(num) {
  return Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;
}

export async function GET(req, context) {
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

    return Response.json({ item });

  } catch (error) {
    console.error("GET payroll error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch payroll record" },
      { status: 500 }
    );
  }
}

export async function PATCH(req, context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid payroll ID" }, { status: 400 });
    }

    const body = await req.json();
    const { allowances, deductions, remarks, status } = body;

    await connectDB();

    const item = await Payroll.findById(id);

    if (!item) {
      return Response.json({ error: "Payroll record not found" }, { status: 404 });
    }

    if (item.status === "paid" && status !== "paid") {
      return Response.json(
        { error: "Paid payroll cannot be reverted" },
        { status: 400 }
      );
    }

    /* ---------- Allowances ---------- */

    if (allowances !== undefined) {
      if (Number(allowances) < 0) {
        return Response.json(
          { error: "Allowances cannot be negative" },
          { status: 400 }
        );
      }

      item.allowances = round2(Number(allowances));
    }

    /* ---------- Deductions ---------- */

    if (deductions !== undefined) {
      if (Number(deductions) < 0) {
        return Response.json(
          { error: "Deductions cannot be negative" },
          { status: 400 }
        );
      }

      item.deductions = round2(Number(deductions));
    }

    /* ---------- Remarks ---------- */

    if (remarks !== undefined) {
      item.remarks = String(remarks || "");
    }

    /* ---------- STATUS LOGIC ---------- */

    if (status !== undefined) {

      if (!["draft", "finalized", "paid"].includes(status)) {
        return Response.json({ error: "Invalid status" }, { status: 400 });
      }

      item.status = status;

      if (status === "draft") {
        item.finalizedAt = null;
        item.paidAt = null;
      }

      if (status === "finalized") {

        if (!item.finalizedAt) {
          item.finalizedAt = new Date();
        }

        item.paidAt = null;
      }

      if (status === "paid") {

        if (!item.finalizedAt) {
          item.finalizedAt = new Date();
        }

        if (!item.paidAt) {
          item.paidAt = new Date();
        }
      }
    }

    /* ---------- Recalculate Payroll ---------- */

    item.grossPay = round2(
      Number(item.regularPay || 0) +
      Number(item.otPay || 0) +
      Number(item.allowances || 0)
    );

    item.netPay = round2(
      Number(item.grossPay || 0) -
      Number(item.deductions || 0)
    );

    item.margin = round2(
      Number(item.poAmount || 0) -
      Number(item.grossPay || 0)
    );

    await item.save();

    return Response.json({
      message: "Payroll updated successfully",
      item,
    });

  } catch (error) {
    console.error("PATCH payroll error:", error);

    return Response.json(
      { error: error.message || "Failed to update payroll record" },
      { status: 500 }
    );
  }
}