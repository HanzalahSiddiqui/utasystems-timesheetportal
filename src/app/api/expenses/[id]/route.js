import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import User from "@/models/User";
import mongoose from "mongoose";

/* ================================
   RECEIPT VALIDATION
================================ */

function isValidReceipt(value) {
  if (!value || typeof value !== "string") {
    return false;
  }

  return value.startsWith(
    "https://res.cloudinary.com/"
  );
}

/* ================================
   GET
================================ */

export async function GET(req, context) {
  try {
    const session =
      await getServerSession(authOptions);

    if (!session) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return Response.json(
        { error: "Invalid expense ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const item = await Expense.findById(id)
      .populate(
        "employeeId",
        "name email employeeId designation department"
      )
      .populate(
        "paidByEmployeeId",
        "name email employeeId"
      )
      .populate(
        "createdBy",
        "name email role"
      );

    if (!item) {
      return Response.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    /* ================================
       EMPLOYEE ACCESS
    ================================= */

    if (
      session.user.role === "employee" &&
      String(
        item.employeeId?._id ||
          item.employeeId
      ) !== String(session.user.id)
    ) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return Response.json({ item });

  } catch (error) {
    console.error(
      "GET /api/expenses/[id] error:",
      error
    );

    return Response.json(
      {
        error:
          error.message ||
          "Failed to fetch expense",
      },
      { status: 500 }
    );
  }
}

/* ================================
   PATCH
================================ */

export async function PATCH(req, context) {
  try {
    const session =
      await getServerSession(authOptions);

    if (!session) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return Response.json(
        { error: "Invalid expense ID" },
        { status: 400 }
      );
    }

    const body = await req.json();

    await connectDB();

    const item = await Expense.findById(id);

    if (!item) {
      return Response.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    const isAdmin =
      session.user.role === "admin";

    const isOwner =
      String(item.employeeId) ===
      String(session.user.id);

    /* ================================
       ACCESS CONTROL
    ================================= */

    if (!isAdmin && !isOwner) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    /* ==================================================
       EMPLOYEE UPDATE FLOW
       Strict permissions
    ================================================== */

    if (!isAdmin) {
      if (
        ![
          "draft",
          "submitted",
          "rejected",
        ].includes(item.status)
      ) {
        return Response.json(
          {
            error:
              "You cannot edit this expense at this stage",
          },
          { status: 400 }
        );
      }

      const {
        expenseType,
        category,
        amount,
        description,
        receiptUrl,
        receiptFileName,
        incurredByName,
        incurredFor,
        paidBy,
        paidByEmployeeId,
        expenseDate,
        submit,
      } = body;

      /* CATEGORY */

      if (category !== undefined) {
        item.category = String(category)
          .trim()
          .toLowerCase();

        item.expenseType =
          item.category;
      }

      /* EXPENSE TYPE */

      if (
        expenseType !== undefined
      ) {
        item.expenseType =
          String(expenseType)
            .trim()
            .toLowerCase();
      }

      /* AMOUNT */

      if (amount !== undefined) {
        const value = Number(amount);

        if (
          !Number.isFinite(value) ||
          value <= 0
        ) {
          return Response.json(
            {
              error:
                "Amount must be greater than 0",
            },
            { status: 400 }
          );
        }

        item.amount = value;
        item.companyExpenseAmount =
          value;
      }

      /* DESCRIPTION */

      if (
        description !== undefined
      ) {
        item.description =
          String(
            description || ""
          ).trim();
      }

      /* EXPENSE DATE */

      if (
        expenseDate !== undefined
      ) {
        const date = new Date(
          expenseDate
        );

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          return Response.json(
            {
              error:
                "Invalid expense date",
            },
            { status: 400 }
          );
        }

        item.expenseDate = date;
      }

      /* INCURRED BY */

      if (
        incurredByName !== undefined
      ) {
        item.incurredByName =
          String(
            incurredByName || ""
          ).trim();
      }

      /* INCURRED FOR */

      if (
        incurredFor !== undefined
      ) {
        if (
          ![
            "self",
            "company",
            "client",
            "other",
          ].includes(incurredFor)
        ) {
          return Response.json(
            {
              error:
                "Invalid incurred for value",
            },
            { status: 400 }
          );
        }

        item.incurredFor =
          incurredFor;
      }

      /* ================================
         PAID BY
      ================================= */

      if (
        paidBy !== undefined
      ) {
        if (
          ![
            "company",
            "employee",
          ].includes(paidBy)
        ) {
          return Response.json(
            {
              error:
                "Invalid paid by value",
            },
            { status: 400 }
          );
        }

        item.paidBy = paidBy;

        if (
          paidBy === "company"
        ) {
          item.paidByEmployeeId =
            null;

          item.paidByName =
            "Company";
        }

        if (
          paidBy === "employee"
        ) {
          const selectedEmployeeId =
            paidByEmployeeId ||
            session.user.id;

          if (
            !selectedEmployeeId
          ) {
            return Response.json(
              {
                error:
                  "Employee information is required",
              },
              { status: 400 }
            );
          }

          const employee =
            await User.findById(
              selectedEmployeeId
            ).select(
              "_id name employeeId"
            );

          if (!employee) {
            return Response.json(
              {
                error:
                  "Paid-by employee not found",
              },
              { status: 404 }
            );
          }

          item.paidByEmployeeId =
            employee._id;

          item.paidByName =
            employee.name;
        }
      }

      /* ================================
         RECEIPT
         Optional while editing
      ================================= */

      if (
        receiptUrl !== undefined
      ) {
        if (receiptUrl) {
          if (
            !isValidReceipt(
              receiptUrl
            )
          ) {
            return Response.json(
              {
                error:
                  "Only Cloudinary URL allowed",
              },
              { status: 400 }
            );
          }

          item.receiptUrl =
            receiptUrl;
        }
      }

      if (
        receiptFileName !==
        undefined
      ) {
        item.receiptFileName =
          String(
            receiptFileName || ""
          ).trim();
      }

      /* ================================
         SUBMIT
      ================================= */

      if (submit === true) {
        if (!item.receiptUrl) {
          return Response.json(
            {
              error:
                "Receipt required before submission",
            },
            { status: 400 }
          );
        }

        item.status = "submitted";

        if (!item.submittedAt) {
          item.submittedAt =
            new Date();
        }
      }

      item.updatedBy =
        session.user.id;

      await item.save();

      return Response.json({
        message:
          submit === true
            ? "Expense submitted"
            : "Expense updated",
        item,
      });
    }

    /* ==================================================
       ADMIN UPDATE FLOW
       Full control
    ================================================== */

    const {
      category,
      expenseType,
      amount,
      description,
      receiptUrl,
      receiptFileName,
      incurredByName,
      incurredFor,
      paidBy,
      paidByEmployeeId,
      expenseDate,
      status,
      reviewComment,
    } = body;

    /* ================================
       CATEGORY
    ================================= */

    if (
      category !== undefined
    ) {
      const finalCategory =
        String(category)
          .trim()
          .toLowerCase();

      item.category =
        finalCategory;

      /*
       * Keep expenseType synchronized
       * unless explicitly supplied.
       */

      if (
        expenseType ===
        undefined
      ) {
        item.expenseType =
          finalCategory;
      }
    }

    /* ================================
       EXPENSE TYPE
    ================================= */

    if (
      expenseType !== undefined
    ) {
      const finalExpenseType =
        String(expenseType)
          .trim()
          .toLowerCase();

      item.expenseType =
        finalExpenseType;
    }

    /* ================================
       AMOUNT
    ================================= */

    if (
      amount !== undefined
    ) {
      const value =
        Number(amount);

      if (
        !Number.isFinite(value) ||
        value <= 0
      ) {
        return Response.json(
          {
            error:
              "Amount must be greater than 0",
          },
          { status: 400 }
        );
      }

      item.amount = value;

      item.companyExpenseAmount =
        value;
    }

    /* ================================
       DESCRIPTION
    ================================= */

    if (
      description !== undefined
    ) {
      item.description =
        String(
          description || ""
        ).trim();
    }

    /* ================================
       EXPENSE DATE
    ================================= */

    if (
      expenseDate !== undefined
    ) {
      const date =
        new Date(expenseDate);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return Response.json(
          {
            error:
              "Invalid expense date",
          },
          { status: 400 }
        );
      }

      item.expenseDate =
        date;
    }

    /* ================================
       INCURRED BY
    ================================= */

    if (
      incurredByName !==
      undefined
    ) {
      item.incurredByName =
        String(
          incurredByName || ""
        ).trim();
    }

    /* ================================
       INCURRED FOR
    ================================= */

    if (
      incurredFor !==
      undefined
    ) {
      if (
        ![
          "self",
          "company",
          "client",
          "other",
        ].includes(incurredFor)
      ) {
        return Response.json(
          {
            error:
              "Invalid incurred for value",
          },
          { status: 400 }
        );
      }

      item.incurredFor =
        incurredFor;
    }

    /* ================================
       PAID BY
    ================================= */

    if (
      paidBy !== undefined
    ) {
      if (
        ![
          "company",
          "employee",
        ].includes(paidBy)
      ) {
        return Response.json(
          {
            error:
              "Invalid paid by value",
          },
          { status: 400 }
        );
      }

      item.paidBy = paidBy;

      /* COMPANY */

      if (
        paidBy === "company"
      ) {
        item.paidByEmployeeId =
          null;

        item.paidByName =
          "Company";
      }

      /* EMPLOYEE */

      if (
        paidBy === "employee"
      ) {
        if (
          !paidByEmployeeId
        ) {
          return Response.json(
            {
              error:
                "Please select the employee who paid this expense",
            },
            { status: 400 }
          );
        }

        const employee =
          await User.findById(
            paidByEmployeeId
          ).select(
            "_id name employeeId"
          );

        if (!employee) {
          return Response.json(
            {
              error:
                "Paid-by employee not found",
            },
            { status: 404 }
          );
        }

        item.paidByEmployeeId =
          employee._id;

        item.paidByName =
          employee.name;
      }
    }

    /* ================================
       RECEIPT
       OPTIONAL FOR ADMIN SAVE
    ================================= */

    if (
      receiptUrl !== undefined
    ) {
      if (receiptUrl) {
        if (
          !isValidReceipt(
            receiptUrl
          )
        ) {
          return Response.json(
            {
              error:
                "Only Cloudinary URL allowed",
            },
            { status: 400 }
          );
        }

        item.receiptUrl =
          receiptUrl;
      }
    }

    if (
      receiptFileName !==
      undefined
    ) {
      item.receiptFileName =
        String(
          receiptFileName || ""
        ).trim();
    }

    /* ================================
       REVIEW COMMENT
    ================================= */

    if (
      reviewComment !==
      undefined
    ) {
      item.reviewComment =
        String(
          reviewComment || ""
        ).trim();
    }

    /* ================================
       STATUS
    ================================= */

    if (
      status !== undefined
    ) {
      const allowedStatuses = [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "paid",
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return Response.json(
          {
            error:
              "Invalid status",
          },
          { status: 400 }
        );
      }

      /* --------------------------------
         REJECTED
      -------------------------------- */

      if (
        status === "rejected"
      ) {
        if (
          !String(
            reviewComment ||
              item.reviewComment ||
              ""
          ).trim()
        ) {
          return Response.json(
            {
              error:
                "Rejection comment is required",
            },
            { status: 400 }
          );
        }

        item.status =
          "rejected";

        item.rejectedAt =
          new Date();

        item.approvedAt =
          null;

        item.paidAt =
          null;
      }

      /* --------------------------------
         APPROVED
      -------------------------------- */

      else if (
        status === "approved"
      ) {
        item.status =
          "approved";

        item.approvedAt =
          item.approvedAt ||
          new Date();

        item.rejectedAt =
          null;

        item.paidAt =
          null;
      }

      /* --------------------------------
         PAID
      -------------------------------- */

      else if (
        status === "paid"
      ) {
        item.status =
          "paid";

        /*
         * Paid expense must have
         * approval timestamp.
         */

        item.approvedAt =
          item.approvedAt ||
          new Date();

        item.paidAt =
          item.paidAt ||
          new Date();

        item.rejectedAt =
          null;
      }

      /* --------------------------------
         SUBMITTED
      -------------------------------- */

      else if (
        status === "submitted"
      ) {
        item.status =
          "submitted";

        if (
          !item.submittedAt
        ) {
          item.submittedAt =
            new Date();
        }

        item.approvedAt =
          null;

        item.rejectedAt =
          null;

        item.paidAt =
          null;
      }

      /* --------------------------------
         DRAFT
      -------------------------------- */

      else if (
        status === "draft"
      ) {
        item.status =
          "draft";

        item.approvedAt =
          null;

        item.rejectedAt =
          null;

        item.paidAt =
          null;
      }
    }

    /* ================================
       UPDATED BY
    ================================= */

    item.updatedBy =
      session.user.id;

    await item.save();

    return Response.json({
      message:
        "Expense updated successfully",
      item,
    });

  } catch (error) {
    console.error(
      "PATCH /api/expenses/[id] error:",
      error
    );

    return Response.json(
      {
        error:
          error.message ||
          "Failed to update expense",
      },
      { status: 500 }
    );
  }
}

/* ================================
   🔹 DELETE
================================ */

export async function DELETE(req, context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json(
        { error: "Invalid expense ID" },
        { status: 400 }
      );
    }

    const item = await Expense.findById(id);

    if (!item) {
      return Response.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    const isAdmin =
      session.user.role === "admin";

    const isOwner =
      String(item.employeeId) ===
      String(session.user.id);

    /* ================================
       🔹 ADMIN
       Admin has full delete control
    ================================= */

    if (isAdmin) {
      await Expense.findByIdAndDelete(id);

      return Response.json({
        message: "Deleted successfully",
      });
    }

    /* ================================
       🔹 EMPLOYEE OWNERSHIP
    ================================= */

    if (!isOwner) {
      return Response.json(
        {
          error:
            "You can only delete your own expenses",
        },
        { status: 403 }
      );
    }

    /* ================================
       🔹 EMPLOYEE STATUS CONTROL
       Employee can delete ONLY:
       - draft
       - submitted

       Employee CANNOT delete:
       - approved
       - rejected
       - paid
    ================================= */

    if (
      !["draft", "submitted"].includes(
        item.status
      )
    ) {
      return Response.json(
        {
          error:
            "This expense can no longer be deleted because it has already been reviewed by Admin.",
        },
        { status: 403 }
      );
    }

    /* ================================
       🔹 DELETE
    ================================= */

    await Expense.findByIdAndDelete(id);

    return Response.json({
      message: "Deleted successfully",
    });

  } catch (error) {
    console.error(
      "DELETE /api/expenses/[id] error:",
      error
    );

    return Response.json(
      {
        error:
          error.message ||
          "Failed to delete expense",
      },
      { status: 500 }
    );
  }
}