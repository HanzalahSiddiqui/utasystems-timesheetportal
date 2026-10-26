import mongoose from "mongoose";
import Expense from "../src/models/Expense.js";
import User from "../src/models/User.js";

const MONGODB_URI =
  process.argv[2] ||
  process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "MongoDB URI missing. Pass Atlas URI as argument or set MONGODB_URI."
  );
}

/* =========================================
   EMPLOYEE INITIALS
========================================= */

function getEmployeeInitials(name = "") {
  const cleaned = String(name).trim();

  if (!cleaned) return "XX";

  const parts = cleaned
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .substring(0, 2)
      .toUpperCase();
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

  const month = String(
    value.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    value.getDate()
  ).padStart(2, "0");

  return `${year}${month}${day}`;
}

/* =========================================
   SORT DATE
========================================= */

function getSortDate(expense) {
  const date =
    expense.expenseDate ||
    expense.submittedAt ||
    expense.createdAt;

  const value = new Date(date);

  return Number.isNaN(value.getTime())
    ? null
    : value;
}

/* =========================================
   MAIN
========================================= */

async function backfillExpenseIds() {
  console.log("=========================================");
  console.log("SAFE EXPENSE ID BACKFILL");
  console.log("=========================================");
  console.log("Database connection supplied.");
  console.log("");

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: "timesheet_portal",
    });

    console.log("Connected to MongoDB.");
    console.log("");

    /* =====================================
       LOAD EXPENSES WITHOUT IDs
    ===================================== */

    const expenses = await Expense.find({
      $or: [
        { expenseId: { $exists: false } },
        { expenseId: null },
        { expenseId: "" },
      ],
    }).lean();

    console.log(
      `Expenses requiring IDs: ${expenses.length}`
    );
    console.log("");

    if (expenses.length === 0) {
      console.log(
        "All expenses already have Expense IDs."
      );
      return;
    }

    /* =====================================
       LOAD USERS
    ===================================== */

    const users = await User.find({})
      .select("_id name employeeId")
      .lean();

    const userMap = new Map();

    for (const user of users) {
      userMap.set(
        user._id.toString(),
        user
      );
    }

    /* =====================================
       GROUP BY OWNER
    ===================================== */

    const groups = new Map();

    for (const expense of expenses) {
      let ownerKey;
      let initials;
      let ownerName;

      /* -----------------------------------
         COMPANY EXPENSE
      ----------------------------------- */

      if (!expense.employeeId) {
        ownerKey = "COMPANY";
        initials = "COMPANY";
        ownerName = "Company";
      }

      /* -----------------------------------
         EMPLOYEE EXPENSE
      ----------------------------------- */

      else {
        const employee =
          userMap.get(
            expense.employeeId.toString()
          );

        if (!employee) {
          throw new Error(
            `Employee not found for expense ${expense._id}`
          );
        }

        ownerKey = String(
          employee.employeeId
        );

        ownerName =
          employee.name ||
          expense.employeeName ||
          "";

        initials =
          getEmployeeInitials(
            ownerName
          );
      }

      /* -----------------------------------
         DATE
      ----------------------------------- */

      const sortDate =
        getSortDate(expense);

      if (!sortDate) {
        throw new Error(
          `Invalid date for expense ${expense._id}`
        );
      }

      const datePart =
        formatExpenseDate(sortDate);

      if (!datePart) {
        throw new Error(
          `Unable to format date for expense ${expense._id}`
        );
      }

      if (!groups.has(ownerKey)) {
        groups.set(ownerKey, {
          ownerKey,
          initials,
          ownerName,
          expenses: [],
        });
      }

      groups
        .get(ownerKey)
        .expenses.push({
          ...expense,
          sortDate,
          datePart,
        });
    }

    /* =====================================
       LOAD EXISTING IDS
    ===================================== */

    const existingIds =
      await Expense.find({
        expenseId: {
          $exists: true,
          $nin: [null, ""],
        },
      })
        .select("expenseId")
        .lean();

    const usedIds = new Set();

    for (const expense of existingIds) {
      usedIds.add(expense.expenseId);
    }

    /* =====================================
       PROCESS EACH OWNER
    ===================================== */

    let updatedCount = 0;

    for (const group of groups.values()) {
      console.log("-----------------------------------------");

      console.log(
        `Owner: ${group.ownerName} (${group.ownerKey})`
      );

      /* -----------------------------------
         SORT RECORDS CHRONOLOGICALLY
      ----------------------------------- */

      group.expenses.sort((a, b) => {
        const dateDifference =
          a.sortDate.getTime() -
          b.sortDate.getTime();

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
          .localeCompare(
            b._id.toString()
          );
      });

      /* -----------------------------------
         GET EXISTING COUNTER
      ----------------------------------- */

      const counter =
        await mongoose.connection
          .collection("expensecounters")
          .findOne({
            ownerKey: group.ownerKey,
          });

      /*
         Since this is a backfill and the records
         being processed have NO IDs, a missing
         counter means we start from 0.
      */

      let currentSequence = counter
        ? Number(counter.lastSequence || 0)
        : 0;

      console.log(
        `Starting sequence: ${currentSequence + 1}`
      );

      /* -----------------------------------
         GENERATE IDS
      ----------------------------------- */

      for (const expense of group.expenses) {
        currentSequence++;

        const sequencePart =
          String(currentSequence).padStart(
            3,
            "0"
          );

        const expenseId =
          `EXP-${expense.datePart}-${group.initials}-${sequencePart}`;

        /* ---------------------------------
           DUPLICATE SAFETY
        --------------------------------- */

        if (usedIds.has(expenseId)) {
          throw new Error(
            `Duplicate Expense ID detected: ${expenseId}`
          );
        }

        /* ---------------------------------
           UPDATE EXPENSE
        --------------------------------- */

        const result =
  await mongoose.connection
    .collection("expenses")
    .updateOne(
      {
        _id: expense._id,

        $or: [
          {
            expenseId: {
              $exists: false,
            },
          },
          {
            expenseId: null,
          },
          {
            expenseId: "",
          },
        ],
      },
      {
        $set: {
          expenseId,
        },
      }
    );

        if (result.modifiedCount !== 1) {
          throw new Error(
            `Failed to update expense ${expense._id}`
          );
        }

        usedIds.add(expenseId);

        updatedCount++;

        console.log(
          `${sequencePart} → ${expenseId}`
        );
      }

      /* -----------------------------------
         SAVE FINAL COUNTER
      ----------------------------------- */

      await mongoose.connection
        .collection("expensecounters")
        .updateOne(
          {
            ownerKey: group.ownerKey,
          },
          {
            $set: {
              lastSequence: currentSequence,
              updatedAt: new Date(),
            },

            $setOnInsert: {
              ownerKey: group.ownerKey,
              createdAt: new Date(),
            },
          },
          {
            upsert: true,
          }
        );

      console.log(
        `Counter saved: ${group.ownerKey} → ${currentSequence}`
      );
    }

    /* =====================================
       FINAL VERIFICATION
    ===================================== */

    const totalExpenses =
      await Expense.countDocuments();

    const expensesWithIds =
      await Expense.countDocuments({
        expenseId: {
          $exists: true,
          $nin: [null, ""],
        },
      });

    const distinctIds =
      await Expense.distinct(
        "expenseId"
      );

    const duplicateIds =
      await Expense.aggregate([
        {
          $match: {
            expenseId: {
              $exists: true,
              $nin: [null, ""],
            },
          },
        },
        {
          $group: {
            _id: "$expenseId",
            count: { $sum: 1 },
          },
        },
        {
          $match: {
            count: { $gt: 1 },
          },
        },
      ]);

    console.log("");
    console.log("=========================================");
    console.log("BACKFILL COMPLETE");
    console.log("=========================================");

    console.log(
      `Total expenses: ${totalExpenses}`
    );

    console.log(
      `Updated this run: ${updatedCount}`
    );

    console.log(
      `Expenses with IDs: ${expensesWithIds}`
    );

    console.log(
      `Distinct IDs: ${distinctIds.length}`
    );

    console.log(
      `Duplicate IDs: ${duplicateIds.length}`
    );

    console.log("");

    if (
      totalExpenses === expensesWithIds &&
      expensesWithIds === distinctIds.length &&
      duplicateIds.length === 0
    ) {
      console.log(
        "SUCCESS: Every expense has a unique Expense ID."
      );
    } else {
      console.log(
        "WARNING: Verification did not pass."
      );
    }

    console.log(
      "========================================="
    );

  } catch (error) {
    console.error("");
    console.error("BACKFILL FAILED");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

backfillExpenseIds();