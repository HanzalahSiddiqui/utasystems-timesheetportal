import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import User from "@/models/User";

function isValidReceipt(value) {
  if (!value || typeof value !== "string") return false;
  return (
    value.startsWith("data:image/") ||
    value.startsWith("https://") ||
    value.startsWith("http://")
  );
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const expenseType = searchParams.get("expenseType");
    const search = searchParams.get("search");

    const query = {};

    if (session.user.role === "employee") {
      query.employeeId = session.user.id;
    }

    if (status) query.status = status;
    if (expenseType) query.expenseType = expenseType;

    if (search) {
      query.$or = [
        { employeeName: { $regex: search, $options: "i" } },
        { employeeCode: { $regex: search, $options: "i" } },
        { incurredByName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const items = await Expense.find(query)
      .populate("employeeId", "name email employeeId")
      .sort({ createdAt: -1 });

    return Response.json({ items });
  } catch (error) {
    console.error("GET /api/expenses error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "employee") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

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

    if (!expenseType || Number(amount) <= 0 || !paidBy || !incurredByName) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (submit !== false && !receiptUrl) {
      return Response.json(
        { error: "Receipt is required before submitting expense claim" },
        { status: 400 }
      );
    }

    if (receiptUrl && !isValidReceipt(receiptUrl)) {
      return Response.json({ error: "Invalid receipt format" }, { status: 400 });
    }

    await connectDB();

    const employee = await User.findById(session.user.id).select(
      "name employeeId"
    );

    if (!employee) {
      return Response.json({ error: "Employee not found" }, { status: 404 });
    }

    const item = await Expense.create({
      employeeId: session.user.id,
      employeeName: employee.name || "",
      employeeCode: employee.employeeId || "",
      expenseType,
      amount: Number(amount),
      companyExpenseAmount: Number(amount),
      description: String(description || "").trim(),
      receiptUrl: String(receiptUrl || ""),
      receiptFileName: String(receiptFileName || "").trim(),
      incurredByName: String(incurredByName || "").trim(),
      incurredFor: incurredFor || "self",
      paidBy,
      status: submit === false ? "draft" : "submitted",
      submittedAt: submit === false ? null : new Date(),
      createdBy: session.user.id,
      updatedBy: session.user.id,
    });

    return Response.json({
      message:
        submit === false
          ? "Expense draft saved successfully"
          : "Expense submitted successfully",
      item,
    });
  } catch (error) {
    console.error("POST /api/expenses error:", error);
    return Response.json(
      { error: error.message || "Failed to create expense" },
      { status: 500 }
    );
  }
}