import mongoose from "mongoose";
import Expense from "../src/models/Expense.js";
import User from "../src/models/User.js";
import ExpenseCounter from "../src/models/ExpenseCounter.js";

const MONGODB_URI =
  process.argv[2] || "mongodb://127.0.0.1:27017/timesheet_portal";

/* =========================================
   EMPLOYEE INITIALS
========================================= */

function getEmployeeInitials(name = "") {
  const cleaned = String(name).trim();

  if (!cleaned) {
    return "XX";
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

/* =========================================
   DATE FORMAT
========================================= */

function formatExpenseDate(date) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return null;
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

/* =========================================
   VALID DATE FOR SORTING
========================================= */

function getExpenseSortDate(expense) {
  const date =
    expense.expenseDate ||
    expense.createdAt ||
    expense.submittedAt;

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value;
}

/* =========================================
   EXTRACT SEQUENCE FROM EXISTING ID
========================================= */

function getSequenceFromExpenseId(expenseId) {
  if (!expenseId || typeof expenseId !== "string") {
    return null;
  }

  const match = expenseId.match(/-(\d+)$/);

  if (!match) {
    return null;
  }

  const sequence = Number(match[1]);

  return Number.isInteger(sequence) && sequence > 0
    ? sequence
    : null;
}

/* =========================================
   MAIN MIGRATION
========================================= */

async function migrate() {
  console.log("=========================================");
  console.log("EXPENSE ID MIGRATION");
  console.log("=========================================");
  console.log(`Database: ${MONGODB_URI}`);
  console.log("");

  try {
    await mongoose.connect(MONGODB_URI);

    console.log("Connected to MongoDB.");
    console.log("");

    /* =====================================
       LOAD DATA
    ===================================== */

    const expenses = await Expense.find({})
      .sort({
        expenseDate: 1,
        createdAt: 1,
        _id: 1,
      })
      .lean();

    console.log(`Total expenses found: ${expenses.length}`);
    console.log("");

    if (expenses.length === 0) {
      console.log("No expenses found. Nothing to migrate.");
      return;
    }

    /* =====================================
       LOAD USERS
    ===================================== */

    const users = await User.find({})
      .select("_id name employeeId role")
      .lean();

    const userMap = new Map();

    for (const user of users) {
      userMap.set(user._id.toString(), user);
    }

    /* =====================================
       GROUP EXPENSES
    ===================================== */

    const groups = new Map();

    const errors = [];
    const alreadyMigrated = [];

    for (const expense of expenses) {
      /* -----------------------------------
         EXISTING EXPENSE ID
      ----------------------------------- */

      if (expense.expenseId) {
        alreadyMigrated.push(expense);
        continue;
      }

      /* -----------------------------------
         DETERMINE OWNER
      ----------------------------------- */

      let ownerKey;
      let initials;
      let ownerName;

      if (expense.employeeId) {
        const employeeId = expense.employeeId.toString();

        const employee = userMap.get(employeeId);

        if (!employee) {
          errors.push({
            expenseId: expense._id.toString(),
            reason: `Employee not found for employeeId ${employeeId}`,
          });

          continue;
        }

        ownerKey = employee.employeeId;

        ownerName =
          expense.employeeName ||
          employee.name ||
          "";

        initials = getEmployeeInitials(ownerName);

      } else {
        /* ---------------------------------
           ACTUAL COMPANY EXPENSE
        --------------------------------- */

        ownerKey = "COMPANY";
        ownerName = "Company";
        initials = "COMPANY";
      }

      /* -----------------------------------
         DATE
      ----------------------------------- */

      const sortDate = getExpenseSortDate(expense);

      if (!sortDate) {
        errors.push({
          expenseId: expense._id.toString(),
          reason: "No valid expenseDate/createdAt/submittedAt",
        });

        continue;
      }

      const datePart = formatExpenseDate(sortDate);

      if (!datePart) {
        errors.push({
          expenseId: expense._id.toString(),
          reason: "Unable to format expense date",
        });

        continue;
      }

      /* -----------------------------------
         CREATE GROUP
      ----------------------------------- */

      if (!groups.has(ownerKey)) {
        groups.set(ownerKey, {
          ownerKey,
          ownerName,
          initials,
          expenses: [],
        });
      }

      groups.get(ownerKey).expenses.push({
        ...expense,
        migrationDate: sortDate,
        datePart,
      });
    }

    /* =====================================
       EXISTING IDs → DETERMINE MAX SEQUENCE
    ===================================== */

    const existingMaxSequences = new Map();

    for (const expense of alreadyMigrated) {
      let ownerKey;

      if (expense.employeeId) {
        const employee = userMap.get(
          expense.employeeId.toString()
        );

        if (!employee) {
          errors.push({
            expenseId: expense._id.toString(),
            reason:
              "Existing expenseId has employeeId but employee no longer exists",
          });

          continue;
        }

        ownerKey = employee.employeeId;
      } else {
        ownerKey = "COMPANY";
      }

      const sequence = getSequenceFromExpenseId(
        expense.expenseId
      );

      if (!sequence) {
        errors.push({
          expenseId: expense._id.toString(),
          reason: `Existing expenseId "${expense.expenseId}" has invalid sequence`,
        });

        continue;
      }

      const currentMax =
        existingMaxSequences.get(ownerKey) || 0;

      if (sequence > currentMax) {
        existingMaxSequences.set(
          ownerKey,
          sequence
        );
      }
    }

    /* =====================================
       DUPLICATE ID CHECK
    ===================================== */

    const existingExpenseIds = new Set();

    for (const expense of expenses) {
      if (expense.expenseId) {
        if (existingExpenseIds.has(expense.expenseId)) {
          errors.push({
            expenseId: expense._id.toString(),
            reason:
              `Duplicate existing expenseId "${expense.expenseId}"`,
          });
        }

        existingExpenseIds.add(expense.expenseId);
      }
    }

    /* =====================================
       MIGRATE GROUP BY GROUP
    ===================================== */

    let migratedCount = 0;
    let skippedCount = alreadyMigrated.length;

    for (const group of groups.values()) {
      console.log("-----------------------------------------");
      console.log(
        `Owner: ${group.ownerName} (${group.ownerKey})`
      );
      console.log(
        `Expenses to migrate: ${group.expenses.length}`
      );

      /* -----------------------------------
         SORT CHRONOLOGICALLY
      ----------------------------------- */

      group.expenses.sort((a, b) => {
        const dateDifference =
          a.migrationDate.getTime() -
          b.migrationDate.getTime();

        if (dateDifference !== 0) {
          return dateDifference;
        }

        const createdDifference =
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime();

        if (createdDifference !== 0) {
          return createdDifference;
        }

        return a._id
          .toString()
          .localeCompare(b._id.toString());
      });

      /* -----------------------------------
         START AFTER EXISTING MAX
      ----------------------------------- */

      let sequence =
        existingMaxSequences.get(group.ownerKey) || 0;

      /* -----------------------------------
         ASSIGN IDs
      ----------------------------------- */

      for (const expense of group.expenses) {
        sequence += 1;

        const sequencePart = String(sequence).padStart(
          3,
          "0"
        );

        const newExpenseId =
          `EXP-${expense.datePart}-${group.initials}-${sequencePart}`;

        /* -------------------------------
           SAFETY CHECK
        -------------------------------- */

        if (existingExpenseIds.has(newExpenseId)) {
          errors.push({
            expenseId: expense._id.toString(),
            reason:
              `Generated duplicate expenseId "${newExpenseId}"`,
          });

          sequence -= 1;
          continue;
        }

        /* -------------------------------
           UPDATE
        -------------------------------- */

        await Expense.updateOne(
          {
            _id: expense._id,
            expenseId: {
              $exists: false,
            },
          },
          {
            $set: {
              expenseId: newExpenseId,
            },
          }
        );

        existingExpenseIds.add(newExpenseId);

        migratedCount += 1;

        console.log(
          `${sequencePart} → ${newExpenseId}`
        );
      }

      /* -----------------------------------
         SAVE COUNTER
      ----------------------------------- */

      await ExpenseCounter.findOneAndUpdate(
        {
          ownerKey: group.ownerKey,
        },
        {
          $max: {
            lastSequence: sequence,
          },
          $setOnInsert: {
            ownerKey: group.ownerKey,
          },
        },
        {
          upsert: true,
          new: true,
        }
      );

      existingMaxSequences.set(
        group.ownerKey,
        sequence
      );
    }

    /* =====================================
       COUNTERS FOR EXISTING-ONLY OWNERS
    ===================================== */

    for (const [
      ownerKey,
      sequence,
    ] of existingMaxSequences.entries()) {
      await ExpenseCounter.findOneAndUpdate(
        {
          ownerKey,
        },
        {
          $max: {
            lastSequence: sequence,
          },
          $setOnInsert: {
            ownerKey,
          },
        },
        {
          upsert: true,
          new: true,
        }
      );
    }

    /* =====================================
       FINAL REPORT
    ===================================== */

    console.log("");
    console.log("=========================================");
    console.log("MIGRATION COMPLETE");
    console.log("=========================================");
    console.log(`Total expenses: ${expenses.length}`);
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Already had IDs: ${skippedCount}`);
    console.log(`Errors: ${errors.length}`);
    console.log("");

    /* =====================================
       ERRORS
    ===================================== */

    if (errors.length > 0) {
      console.log("ERRORS:");
      console.log("");

      for (const error of errors) {
        console.log(
          `- ${error.expenseId}: ${error.reason}`
        );
      }

      console.log("");
    }

    /* =====================================
       COUNTERS
    ===================================== */

    const counters = await ExpenseCounter.find({})
      .sort({ ownerKey: 1 })
      .lean();

    console.log("COUNTERS:");
    console.log("");

    for (const counter of counters) {
      console.log(
        `${counter.ownerKey} → ${counter.lastSequence}`
      );
    }

    console.log("");
    console.log("=========================================");

  } catch (error) {
    console.error("");
    console.error("MIGRATION FAILED");
    console.error(error);
    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();
  }
}

migrate();