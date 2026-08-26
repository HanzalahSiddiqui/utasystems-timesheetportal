import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import User from "@/models/User";
import { generateExpenseId } from "@/lib/expenseId";
import mongoose from "mongoose";
import {
  sendExpenseSubmittedEmail,
} from "@/lib/email";

/* ================================
   🔹 VALIDATION
================================ */

function isValidReceipt(value) {
  if (!value || typeof value !== "string") return false;

  return (
    value.startsWith("https://res.cloudinary.com/") ||
    value.startsWith("http://res.cloudinary.com/")
  );
}

/* ================================
   🔹 DATE RANGE
   Used for duplicate checking
================================ */

function getExpenseDateRange(date) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return null;
  }

  const start = new Date(value);
  start.setHours(0, 0, 0, 0);

  const end = new Date(value);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/* ================================
   🔹 GET
================================ */

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    let query = {};

    if (session.user.role === "admin") {
      // Admin can see all expenses
      query = {};
    } else {
      // Employee sees expenses belonging to them
      query = {
        employeeId: session.user.id,
      };
    }

    const items = await Expense.find(query)
      .populate(
        "createdBy",
        "name role email"
      )
      .populate(
        "employeeId",
        "name employeeId email"
      )
      .populate(
        "paidByEmployeeId",
        "name employeeId email"
      )
      .sort({ createdAt: -1 });

    return Response.json({ items });

  } catch (error) {
    console.error(
      "GET /api/expenses error:",
      error
    );

    return Response.json(
      {
        error:
          error.message ||
          "Failed to load expenses",
      },
      { status: 500 }
    );
  }
}

/* ================================
   🔹 POST
================================ */

export async function POST(req) {
  try {
    /* ================================
       🔹 AUTHENTICATION
    ================================= */

    const session =
      await getServerSession(authOptions);

    if (
      !session ||
      !["employee", "admin"].includes(
        session.user.role
      )
    ) {
      return Response.json(
        { error: "Unauthorized" },
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
      paidByEmployeeId,
      employeeId,
    } = body;

    /* ================================
       🔹 BASIC VALIDATION
    ================================= */

    if (
      !category ||
      amount === undefined ||
      amount === null ||
      amount === ""
    ) {
      return Response.json(
        {
          error:
            "Category and amount are required",
        },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < 0
    ) {
      return Response.json(
        {
          error:
            "Amount must be a valid non-negative number",
        },
        { status: 400 }
      );
    }

    /* ================================
       🔹 EXPENSE DATE VALIDATION
    ================================= */

    const finalExpenseDate =
      expenseDate || new Date();

    const expenseDateObject =
      new Date(finalExpenseDate);

    if (
      Number.isNaN(
        expenseDateObject.getTime()
      )
    ) {
      return Response.json(
        {
          error: "Invalid expense date",
        },
        { status: 400 }
      );
    }

    /* ================================
       🔹 RECEIPT VALIDATION
    ================================= */

    if (
      receiptUrl &&
      !isValidReceipt(receiptUrl)
    ) {
      return Response.json(
        {
          error: "Invalid receipt URL",
        },
        { status: 400 }
      );
    }

    /* ================================
       🔹 EMPLOYEE RESOLUTION
    ================================= */

    let empId = null;
    let empName = "Company";
    let empCode = "COMPANY";

    /* --------------------------------
       EMPLOYEE SUBMISSION
    -------------------------------- */

    if (
      session.user.role === "employee"
    ) {
      const employee =
        await User.findById(
          session.user.id
        ).select(
          "_id name employeeId email role"
        );

      if (!employee) {
        return Response.json(
          {
            error:
              "Employee account not found",
          },
          { status: 404 }
        );
      }

      empId = employee._id;
      empName = employee.name;
      empCode = employee.employeeId;
    }

    /* --------------------------------
       ADMIN SUBMISSION
    -------------------------------- */

    if (
      session.user.role === "admin"
    ) {
      if (employeeId) {
        // Admin is creating an expense FOR an employee.

        if (
          !mongoose.Types.ObjectId.isValid(
            employeeId
          )
        ) {
          return Response.json(
            {
              error:
                "Invalid employee ID",
            },
            { status: 400 }
          );
        }

        const employee =
          await User.findById(
            employeeId
          ).select(
            "_id name employeeId email role"
          );

        if (!employee) {
          return Response.json(
            {
              error:
                "Employee not found",
            },
            { status: 404 }
          );
        }

        empId = employee._id;
        empName = employee.name;
        empCode = employee.employeeId;

      } else {
        // No employee selected = company expense.

        empId = null;
        empName = "Company";
        empCode = "COMPANY";
      }
    }

    /* ================================
       🔹 OWNER TYPE
    ================================= */

    const expenseOwnerType = empId
      ? "employee"
      : "company";

    /* ================================
       🔹 FINAL CATEGORY
    ================================= */

    const finalCategory = String(
      category
    )
      .trim()
      .toLowerCase();

    /* ================================
       🔹 DUPLICATE EXPENSE CHECK
    ================================= */

    const dateRange =
      getExpenseDateRange(
        expenseDateObject
      );

    if (!dateRange) {
      return Response.json(
        {
          error:
            "Unable to determine expense date",
        },
        { status: 400 }
      );
    }

    const duplicateQuery = {
      category: finalCategory,

      amount: numericAmount,

      expenseDate: {
        $gte: dateRange.start,
        $lte: dateRange.end,
      },

      expenseOwnerType,
    };

    if (empId) {
      duplicateQuery.employeeId =
        empId;
    } else {
      duplicateQuery.employeeId = null;
    }

    const duplicateExpense =
      await Expense.findOne(
        duplicateQuery
      )
        .sort({
          createdAt: -1,
        })
        .select(
          "expenseId category amount expenseDate employeeName status"
        );

    if (duplicateExpense) {
      return Response.json(
        {
          error:
            "A similar expense already exists for this date.",
          duplicate: {
            expenseId:
              duplicateExpense.expenseId,
            category:
              duplicateExpense.category,
            amount:
              duplicateExpense.amount,
            expenseDate:
              duplicateExpense.expenseDate,
            employeeName:
              duplicateExpense.employeeName,
            status:
              duplicateExpense.status,
          },
        },
        { status: 409 }
      );
    }

    /* ================================
       🔹 EXPENSE ID
    ================================= */

    const { expenseId } =
      await generateExpenseId({
        employeeId: empId,
        employeeName: empName,
        employeeCode: empCode,
        expenseOwnerType,
        expenseDate:
          expenseDateObject,
      });

    /* ================================
       🔹 EVIDENCE
    ================================= */

    const evidence = [];

    if (receiptUrl) {
      evidence.push({
        url: receiptUrl,

        fileName:
          receiptFileName || "",

        uploadedBy:
          new mongoose.Types.ObjectId(
            session.user.id
          ),

        uploadedByRole:
          session.user.role,

        uploadedAt: new Date(),
      });
    }

    /* ================================
       🔹 PAID BY RESOLUTION
    ================================= */

    let finalPaidBy = "company";

    let finalPaidByEmployeeId = null;

    let finalPaidByName = "Company";

    /* --------------------------------
       COMPANY PAID
    -------------------------------- */

    if (
      !paidBy ||
      paidBy === "company"
    ) {
      finalPaidBy = "company";

      finalPaidByEmployeeId = null;

      finalPaidByName = "Company";
    }

    /* --------------------------------
       EMPLOYEE PAID
    -------------------------------- */

    if (paidBy === "employee") {
      if (!paidByEmployeeId) {
        return Response.json(
          {
            error:
              "Please select the employee who paid this expense",
          },
          { status: 400 }
        );
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          paidByEmployeeId
        )
      ) {
        return Response.json(
          {
            error:
              "Invalid paid-by employee ID",
          },
          { status: 400 }
        );
      }

      const paidByEmployee =
        await User.findById(
          paidByEmployeeId
        ).select(
          "_id name employeeId"
        );

      if (!paidByEmployee) {
        return Response.json(
          {
            error:
              "Paid-by employee not found",
          },
          { status: 404 }
        );
      }

      finalPaidBy = "employee";

      finalPaidByEmployeeId =
        paidByEmployee._id;

      finalPaidByName =
        paidByEmployee.name;
    }

    /* ================================
       🔹 INVALID PAID BY
    ================================= */

    if (
      !["company", "employee"].includes(
        finalPaidBy
      )
    ) {
      return Response.json(
        {
          error:
            "Invalid paid by value",
        },
        { status: 400 }
      );
    }

    /* ================================
       🔹 CREATE EXPENSE
    ================================= */

    const item =
      await Expense.create({
        expenseId,

        employeeId: empId,

        employeeName: empName,

        employeeCode: empCode,

        // Owner is determined by employeeId
        // NOT by who created the record.
        expenseOwnerType,

        category: finalCategory,

        expenseType: finalCategory,

        amount: numericAmount,

        companyExpenseAmount:
          numericAmount,

        description:
          description || "",

        incurredByName:
          incurredByName ||
          empName,

        incurredFor:
          incurredFor ||
          (expenseOwnerType ===
          "company"
            ? "company"
            : "self"),

        /* =========================
           PAID BY
        ========================= */

        paidBy:
          finalPaidBy,

        paidByEmployeeId:
          finalPaidByEmployeeId,

        paidByName:
          finalPaidByName,

        /* =========================
           STATUS
        ========================= */

        status: "submitted",

        submittedAt: new Date(),

        /* =========================
           AUDIT
        ========================= */

        createdBy:
          session.user.id,

        updatedBy:
          session.user.id,

        /* =========================
           EVIDENCE
        ========================= */

        evidence,

        receiptUrl:
          receiptUrl ||
          evidence[0]?.url ||
          "",

        receiptFileName:
          receiptFileName ||
          evidence[0]?.fileName ||
          "",

        /* =========================
           DATE
        ========================= */

        expenseDate:
          expenseDateObject,
      });

      /* ================================
   🔹 EMAIL NOTIFICATION
================================ */

try {
  await sendExpenseSubmittedEmail(item);
} catch (emailError) {
  console.error(
    "Expense email notification failed:",
    emailError
  );
}
    /* ================================
       🔹 RESPONSE
    ================================= */

    return Response.json(
      {
        message:
          "Expense submitted successfully",

        expenseId:
          item.expenseId,

        item,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error(
      "POST /api/expenses error:",
      error
    );

    return Response.json(
      {
        error:
          error.message ||
          "Failed to create expense",
      },
      { status: 500 }
    );
  }
}