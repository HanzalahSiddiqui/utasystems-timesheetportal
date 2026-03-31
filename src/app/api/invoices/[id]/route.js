import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import mongoose from "mongoose";

export async function GET(req, context) {
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

    return Response.json({ item });
  } catch (error) {
    console.error("GET /api/invoices/[id] error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch invoice" },
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

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid invoice ID" }, { status: 400 });
    }

    const body = await req.json();
    const {
      invoiceNumber,
      issueDate,
      billingDateFrom,
      billingDateTo,
      professionalServiceCharges,
      totalDue,
      status,
      notes,
    } = body;

    await connectDB();

    const item = await Invoice.findById(id);

    if (!item) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoiceNumber !== undefined) {
      item.invoiceNumber = String(invoiceNumber || "").trim();
    }

    if (issueDate !== undefined) {
      item.issueDate = issueDate ? new Date(issueDate) : item.issueDate;
    }

    if (billingDateFrom !== undefined) {
      item.billingDateFrom = String(billingDateFrom || "");
    }

    if (billingDateTo !== undefined) {
      item.billingDateTo = String(billingDateTo || "");
    }

    if (professionalServiceCharges !== undefined) {
      const value = Number(professionalServiceCharges || 0);
      if (value < 0) {
        return Response.json(
          { error: "Professional service charges cannot be negative" },
          { status: 400 }
        );
      }
      item.professionalServiceCharges = value;
    }

    if (totalDue !== undefined) {
      const value = Number(totalDue || 0);
      if (value < 0) {
        return Response.json(
          { error: "Total due cannot be negative" },
          { status: 400 }
        );
      }
      item.totalDue = value;
    } else if (professionalServiceCharges !== undefined) {
      item.totalDue = Number(item.professionalServiceCharges || 0);
    }

    if (notes !== undefined) {
      item.notes = String(notes || "");
    }

    if (status !== undefined) {
      if (!["draft", "finalized", "sent", "paid"].includes(status)) {
        return Response.json({ error: "Invalid invoice status" }, { status: 400 });
      }

      item.status = status;

      if (status === "draft") {
        item.finalizedAt = null;
        item.sentAt = null;
        item.paidAt = null;
      }

      if (status === "finalized") {
        if (!item.finalizedAt) item.finalizedAt = new Date();
        item.sentAt = null;
        item.paidAt = null;
      }

      if (status === "sent") {
        if (!item.finalizedAt) item.finalizedAt = new Date();
        if (!item.sentAt) item.sentAt = new Date();
        item.paidAt = null;
      }

      if (status === "paid") {
        if (!item.finalizedAt) item.finalizedAt = new Date();
        if (!item.sentAt) item.sentAt = new Date();
        if (!item.paidAt) item.paidAt = new Date();
      }
    }

    await item.save();

    return Response.json({
      message: "Invoice updated successfully",
      item,
    });
  } catch (error) {
    console.error("PATCH /api/invoices/[id] error:", error);
    return Response.json(
      { error: error.message || "Failed to update invoice" },
      { status: 500 }
    );
  }
}