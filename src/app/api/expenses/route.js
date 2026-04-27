import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import User from "@/models/User";
import mongoose from "mongoose";

/* ================================
   🔹 VALIDATION (UPDATED)
================================ */

function isValidReceipt(value) {
  if (!value || typeof value !== "string") return false;

  // ✅ ONLY allow Cloudinary URLs
  return (
    value.startsWith("https://res.cloudinary.com/") ||
    value.startsWith("http://res.cloudinary.com/")
  );
}

/* ================================
   🔹 GET
================================ */

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    let query = {};

    if (session.user.role === "admin") {
      // ✅ admin → sab dekh sakta hai
      query = {};
    } else {
      // ✅ employee → sirf apne expenses
      query = {
        createdBy: session.user.id,
      };
    }

    const items = await Expense.find(query)
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 });

    return Response.json({ items });

  } catch (error) {
    console.error("GET /api/expenses error:", error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/* ================================
   🔹 POST (UPDATED)
================================ */

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["employee", "admin"].includes(session.user.role)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    await connectDB();

    const body = await req.json();

    const {
      category,
      amount,
      description,
      expenseDate,
      receiptUrl,
      receiptFileName,
      incurredByName,
      incurredFor,
      paidBy,
      employeeId,
    } = body;

    /* ================================
       🔹 VALIDATION
    ================================= */

    if (!category || !amount) {
      return new Response(
        JSON.stringify({ error: "Category and amount are required" }),
        { status: 400 }
      );
    }

   
 // Optional validation (lenient)
if (receiptUrl && !receiptUrl.startsWith("http")) {
  return Response.json(
    { error: "Invalid receipt URL" },
    { status: 400 }
  );
}

    /* ================================
       🔹 EMPLOYEE RESOLUTION
    ================================= */

    let empId, empName, empCode;

    if (session.user.role === "admin") {
      if (employeeId) {
        const emp = await User.findById(employeeId);

        if (!emp) {
          return new Response(
            JSON.stringify({ error: "Employee not found" }),
            { status: 404 }
          );
        }

        empId = emp._id;
        empName = emp.name;
        empCode = emp.employeeId;
      } else {
        // Company expense
        empId = null;
        empName = "Company";
        empCode = "COMPANY";
      }
    } else {
      const emp = await User.findById(session.user.id);

      empId = emp._id;
      empName = emp.name;
      empCode = emp.employeeId;
    }

    /* ================================
       🔹 EVIDENCE (UPDATED)
    ================================= */

    const evidence = [];

    if (receiptUrl) {
      evidence.push({
        url: receiptUrl,
        fileName: receiptFileName || "",
        uploadedBy: new mongoose.Types.ObjectId(session.user.id),
        uploadedByRole: session.user.role,
        uploadedAt: new Date(),
      });
    }

    /* ================================
       🔹 CREATE
    ================================= */

    const finalCategory = category.toLowerCase();

    const item = await Expense.create({
  employeeId: empId,
  employeeName: empName,
  employeeCode: empCode,

  expenseOwnerType:
    session.user.role === "admin" ? "company" : "employee",

  category: finalCategory,
  expenseType: finalCategory,

  amount: Number(amount),
  companyExpenseAmount: Number(amount),

  description: description || "",

  incurredByName: incurredByName || empName,
  incurredFor: incurredFor || "self",

  paidBy: paidBy || "company",

  status: "submitted",
  submittedAt: new Date(),

  createdBy: session.user.id,
  updatedBy: session.user.id,

  evidence,

  // 🔥 FINAL FIX
  receiptUrl: receiptUrl || (evidence[0]?.url || ""),
  receiptFileName: receiptFileName || (evidence[0]?.fileName || ""),

  expenseDate,
});

    return new Response(
      JSON.stringify({
        message: "Expense submitted successfully",
        item,
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error("POST /api/expenses error:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create expense",
      }),
      { status: 500 }
    );
  }
}