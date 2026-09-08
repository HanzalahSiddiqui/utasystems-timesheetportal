import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

/* =========================================
   GENERIC EMAIL SENDER
========================================= */

export async function sendEmail({
  to,
  subject,
  html,
  text,
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not configured"
    );
  }

  if (!to) {
    throw new Error(
      "Email recipient is required"
    );
  }

  if (!process.env.EMAIL_FROM) {
    throw new Error(
      "EMAIL_FROM is not configured"
    );
  }

  const response = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });

  if (response.error) {
    throw new Error(
      response.error.message ||
        "Failed to send email"
    );
  }

  return response;
}

/* =========================================
   EXPENSE SUBMITTED EMAIL
========================================= */

export async function sendExpenseSubmittedEmail(
  expense
) {
  const recipient =
    process.env.EXPENSE_EMAIL_TO;

  if (!recipient) {
    throw new Error(
      "EXPENSE_EMAIL_TO is not configured"
    );
  }

  const employeeName =
    expense.employeeName ||
    "Unknown Employee";

  const employeeCode =
    expense.employeeCode || "-";

  const expenseId =
    expense.expenseId || "-";

  /* =========================================
     CATEGORY DISPLAY
  ========================================= */

  const category =
    expense.category === "other"
      ? expense.otherExpenseType
        ? `Other — ${expense.otherExpenseType}`
        : "Other"
      : expense.category || "-";

  const amount = Number(
    expense.amount || 0
  ).toFixed(2);

  const expenseDate = expense.expenseDate
    ? new Date(
        expense.expenseDate
      ).toLocaleDateString()
    : "-";

  const incurredBy =
    expense.incurredByName || "-";

  const incurredFor =
    expense.incurredFor || "-";

  const paidBy =
    expense.paidBy === "company"
      ? "Company"
      : expense.paidByName ||
        expense.employeeName ||
        "Employee";

  const description =
    expense.description || "-";

  const receiptUrl =
    expense.receiptUrl ||
    expense.evidence?.[0]?.url ||
    "";

  const receiptHtml = receiptUrl
    ? `
        <p>
          <strong>Receipt:</strong>
          <a
            href="${receiptUrl}"
            target="_blank"
          >
            View / Download Receipt
          </a>
        </p>
      `
    : `
        <p>
          <strong>Receipt:</strong>
          No receipt attached
        </p>
      `;

  const html = `
    <!DOCTYPE html>
    <html>
      <body
        style="
          margin:0;
          padding:0;
          background:#f1f5f9;
          font-family:Arial,Helvetica,sans-serif;
          color:#0f172a;
        "
      >

        <div
          style="
            max-width:700px;
            margin:30px auto;
            background:#ffffff;
            border-radius:16px;
            overflow:hidden;
            border:1px solid #e2e8f0;
          "
        >

          <div
            style="
              background:#091E3E;
              color:#ffffff;
              padding:24px;
            "
          >
            <h2
              style="
                margin:0;
                font-size:22px;
              "
            >
              New Expense Submitted
            </h2>

            <p
              style="
                margin:8px 0 0;
                opacity:.85;
              "
            >
              UTA Timesheet Portal
            </p>
          </div>

          <div style="padding:24px;">

            <p>
              A new expense has been submitted
              through the UTA Timesheet Portal.
            </p>

            <table
              style="
                width:100%;
                border-collapse:collapse;
                margin-top:20px;
              "
            >

              <tr>
                <td
                  style="
                    padding:10px;
                    border-bottom:1px solid #e2e8f0;
                    font-weight:bold;
                  "
                >
                  Expense ID
                </td>

                <td
                  style="
                    padding:10px;
                    border-bottom:1px solid #e2e8f0;
                  "
                >
                  ${expenseId}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding:10px;
                    border-bottom:1px solid #e2e8f0;
                    font-weight:bold;
                  "
                >
                  Employee
                </td>

                <td
                  style="
                    padding:10px;
                    border-bottom:1px solid #e2e8f0;
                  "
                >
                  ${employeeName}
                  (${employeeCode})
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding:10px;
                    border-bottom:1px solid #e2e8f0;
                    font-weight:bold;
                  "
                >
                  Category
                </td>

                <td
                  style="
                    padding:10px;
                    border-bottom:1px solid #e2e8f0;
                  "
                >
                  ${category}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding:10px;
                    border-bottom:1px solid #e2e8f0;
                    font-weight:bold;
                  "
                >
                  Amount
                </td>

                <td
                  style="
                    padding:10px;
                    border-bottom:1px solid #e2e8f0;
                  "
                >
                  USD ${amount}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding:10px;
                    border-bottom:1px solid #e2e8f0;
                    font-weight:bold;
                  "
                >
                  Expense Date
                </td>

                <td
                  style="
                    padding:10px;
                    border-bottom:1px solid #e2e8f0;
                  "
                >
                  ${expenseDate}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding:10px;
                    border-bottom:1px solid #e2e8f0;
                    font-weight:bold;
                  "
                >
                  Incurred By
                </td>

                <td
                  style="
                    padding:10px;
                    border-bottom:1px solid #e2e8f0;
                  "
                >
                  ${incurredBy}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding:10px;
                    border-bottom:1px solid #e2e8f0;
                    font-weight:bold;
                  "
                >
                  Incurred For
                </td>

                <td
                  style="
                    padding:10px;
                    border-bottom:1px solid #e2e8f0;
                  "
                >
                  ${incurredFor}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding:10px;
                    border-bottom:1px solid #e2e8f0;
                    font-weight:bold;
                  "
                >
                  Paid By
                </td>

                <td
                  style="
                    padding:10px;
                    border-bottom:1px solid #e2e8f0;
                  "
                >
                  ${paidBy}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding:10px;
                    font-weight:bold;
                  "
                >
                  Description
                </td>

                <td
                  style="
                    padding:10px;
                  "
                >
                  ${description}
                </td>
              </tr>

            </table>

            <div
              style="
                margin-top:20px;
                padding-top:10px;
              "
            >
              ${receiptHtml}
            </div>

          </div>

          <div
            style="
              background:#f8fafc;
              padding:16px 24px;
              font-size:12px;
              color:#64748b;
            "
          >
            This is an automated notification
            from the UTA Timesheet Portal.
          </div>

        </div>

      </body>
    </html>
  `;

  const text = `
New Expense Submitted

Expense ID: ${expenseId}
Employee: ${employeeName} (${employeeCode})
Category: ${category}
Amount: USD ${amount}
Expense Date: ${expenseDate}
Incurred By: ${incurredBy}
Incurred For: ${incurredFor}
Paid By: ${paidBy}
Description: ${description}
Receipt: ${
    receiptUrl || "No receipt attached"
  }

UTA Timesheet Portal
  `;

  return sendEmail({
    to: recipient,
    subject: `New Expense Submitted - ${expenseId}`,
    html,
    text,
  });
}