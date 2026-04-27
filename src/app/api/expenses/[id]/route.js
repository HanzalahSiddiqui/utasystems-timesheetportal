import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import mongoose from "mongoose";

/* ================================
   🔹 VALIDATION (UPDATED)
================================ */

function isValidReceipt(value) {
  if (!value || typeof value !== "string") return false;

  // ✅ ONLY allow Cloudinary URLs
  return value.startsWith("https://res.cloudinary.com/");
}

/* ================================
   🔹 GET
================================ */

export async function GET(req, context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

   const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid expense ID" }, { status: 400 });
    }

    await connectDB();

    const item = await Expense.findById(id).populate(
      "employeeId",
      "name email employeeId designation department"
    );

    if (!item) {
      return Response.json({ error: "Expense not found" }, { status: 404 });
    }

    if (
      session.user.role === "employee" &&
      String(item.employeeId?._id || item.employeeId) !== String(session.user.id)
    ) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Response.json({ item });

  } catch (error) {
    console.error("GET /api/expenses/[id] error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch expense" },
      { status: 500 }
    );
  }
}

/* ================================
   🔹 PATCH (UPDATED)
================================ */

export async function PATCH(req, context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid expense ID" }, { status: 400 });
    }

    const body = await req.json();

    await connectDB();

    const item = await Expense.findById(id);

    if (!item) {
      return Response.json({ error: "Expense not found" }, { status: 404 });
    }

    const isOwner = String(item.employeeId) === String(session.user.id);
    const isAdmin = session.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ================================
       🔹 EMPLOYEE UPDATE FLOW
    ================================= */

    if (!isAdmin) {
      if (!["draft", "submitted", "rejected"].includes(item.status)) {
        return Response.json(
          { error: "You cannot edit this expense at this stage" },
          { status: 400 }
        );
      }

      const {
        expenseType,
        amount,
        description,
        receiptUrl,
        receiptFileName,
        incurredByName,
        incurredFor,
        paidBy,
        submit,
      } = body;

      if (expenseType !== undefined) item.expenseType = expenseType;

      if (amount !== undefined) {
        const value = Number(amount);
        if (value <= 0) {
          return Response.json({ error: "Amount must be greater than 0" }, { status: 400 });
        }
        item.amount = value;
        item.companyExpenseAmount = value;
      }

      if (description !== undefined) {
        item.description = String(description || "").trim();
      }

      // ✅ RECEIPT FIX
      if (receiptUrl !== undefined) {
        if (!receiptUrl) {
          return Response.json({ error: "Receipt is required" }, { status: 400 });
        }
        if (!isValidReceipt(receiptUrl)) {
          return Response.json({ error: "Only Cloudinary URL allowed" }, { status: 400 });
        }
        item.receiptUrl = receiptUrl;
      }

      if (receiptFileName !== undefined) {
        item.receiptFileName = String(receiptFileName || "").trim();
      }

      if (incurredByName !== undefined) {
        item.incurredByName = String(incurredByName || "").trim();
      }

      if (incurredFor !== undefined) {
        item.incurredFor = incurredFor;
      }

      if (paidBy !== undefined) {
        item.paidBy = paidBy;
      }

      if (submit === true) {
        if (!item.receiptUrl) {
          return Response.json(
            { error: "Receipt required before submission" },
            { status: 400 }
          );
        }
        item.status = "submitted";
        if (!item.submittedAt) item.submittedAt = new Date();
      }

      item.updatedBy = session.user.id;
      await item.save();

      return Response.json({
        message: submit ? "Expense submitted" : "Expense updated",
        item,
      });
    }

    /* ================================
       🔹 ADMIN UPDATE FLOW
    ================================= */

    const {
      expenseType,
      amount,
      description,
      receiptUrl,
      receiptFileName,
      incurredByName,
      incurredFor,
      paidBy,
      status,
      reviewComment,
    } = body;

    if (expenseType !== undefined) item.expenseType = expenseType;

    if (amount !== undefined) {
      const value = Number(amount);
      if (value <= 0) {
        return Response.json({ error: "Amount must be greater than 0" }, { status: 400 });
      }
      item.amount = value;
      item.companyExpenseAmount = value;
    }

    if (description !== undefined) {
      item.description = String(description || "").trim();
    }

    // ✅ RECEIPT FIX
    if (receiptUrl !== undefined) {
      if (!receiptUrl) {
        return Response.json({ error: "Receipt required" }, { status: 400 });
      }
      if (!isValidReceipt(receiptUrl)) {
        return Response.json({ error: "Only Cloudinary URL allowed" }, { status: 400 });
      }
      item.receiptUrl = receiptUrl;
    }

    if (receiptFileName !== undefined) {
      item.receiptFileName = String(receiptFileName || "").trim();
    }

    if (incurredByName !== undefined) {
      item.incurredByName = String(incurredByName || "").trim();
    }

    if (incurredFor !== undefined) {
      item.incurredFor = incurredFor;
    }

    if (paidBy !== undefined) {
      item.paidBy = paidBy;
    }

    if (reviewComment !== undefined) {
      item.reviewComment = String(reviewComment || "").trim();
    }

    if (status !== undefined) {
      if (!["draft", "submitted", "approved", "rejected", "paid"].includes(status)) {
        return Response.json({ error: "Invalid status" }, { status: 400 });
      }

      item.status = status;

      if (status === "submitted" && !item.submittedAt) {
        item.submittedAt = new Date();
      }

      if (status === "approved") {
        item.approvedAt = item.approvedAt || new Date();
        item.rejectedAt = null;
      }

      if (status === "rejected") {
        item.rejectedAt = new Date();
        item.approvedAt = null;
      }

      if (status === "paid") {
        item.paidAt = item.paidAt || new Date();
        if (!item.approvedAt) item.approvedAt = new Date();
      }
    }

    item.updatedBy = session.user.id;
    await item.save();

    return Response.json({
      message: "Expense updated successfully",
      item,
    });

  } catch (error) {
    console.error("PATCH error:", error);
    return Response.json(
      { error: error.message || "Failed to update expense" },
      { status: 500 }
    );
  }
}

/* ================================
   🔹 DELETE (UNCHANGED)
================================ */

export async function DELETE(req, context) {
  try {
    await connectDB();

    const { id } = await context.params;

    console.log("DELETE ID:", id); // 🔍 debug

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid ID" }, { status: 400 });
    }

    const deleted = await Expense.findByIdAndDelete(id);

    if (!deleted) {
      return Response.json({ error: "Expense not found" }, { status: 404 });
    }

    return Response.json({ message: "Deleted successfully" });

  } catch (error) {
    console.error("DELETE ERROR:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}