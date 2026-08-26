import ExpenseCounter from "@/models/ExpenseCounter";

/* =========================================
   EMPLOYEE INITIALS
========================================= */

export function getEmployeeInitials(name = "") {
  const cleaned = String(name).trim();

  if (!cleaned) {
    return "XX";
  }

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
   DATE → YYYYMMDD
========================================= */

export function formatExpenseDate(date) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    throw new Error("Invalid expense date");
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
   NEXT SEQUENCE
========================================= */

export async function getNextExpenseSequence(
  ownerKey
) {
  const counter =
    await ExpenseCounter.findOneAndUpdate(
      { ownerKey: String(ownerKey) },
      {
        $inc: {
          lastSequence: 1,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

  return counter.lastSequence;
}

/* =========================================
   EXPENSE ID
========================================= */

export async function generateExpenseId({
  employeeId,
  employeeName,
  employeeCode,
  expenseOwnerType,
  expenseDate,
}) {
  /* -----------------------------------------
     COMPANY EXPENSE
  ----------------------------------------- */

  if (expenseOwnerType === "company") {
    const ownerKey = "COMPANY";

    const datePart = formatExpenseDate(expenseDate);

    const sequence = await getNextExpenseSequence(ownerKey);

    const sequencePart = String(sequence).padStart(3, "0");

    return {
      expenseId: `EXP-${datePart}-COMPANY-${sequencePart}`,
      ownerKey,
      sequence,
    };
  }

  /* -----------------------------------------
     EMPLOYEE EXPENSE
  ----------------------------------------- */

  if (!employeeId) {
    throw new Error("Employee ID is required for employee expense");
  }

  if (!employeeCode) {
    throw new Error("Employee code is required for employee expense");
  }

  const ownerKey = String(employeeCode);
  const initials = getEmployeeInitials(employeeName);
  const datePart = formatExpenseDate(expenseDate);

  const sequence = await getNextExpenseSequence(ownerKey);

  const sequencePart = String(sequence).padStart(3, "0");

  return {
    expenseId: `EXP-${datePart}-${initials}-${sequencePart}`,
    ownerKey,
    sequence,
  };
}