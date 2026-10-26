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
function escapeEmailHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character]);
}

export function getTimesheetEmailRecipient(recipient) {
  return (
    process.env.TIMESHEET_EMAIL_TEST_RECIPIENT ||
    (process.env.NODE_ENV !== "production"
      ? "hanzalah@utasystems.com"
      : recipient)
  );
}

export async function sendTimesheetReminderEmail({ employee, months, testMode = false }) {
  const safeName = escapeEmailHtml(employee.name || "Employee");
  const monthList = months.map((month) => `<li>${escapeEmailHtml(month)}</li>`).join("");
  const textMonths = months.map((month) => `- ${month}`).join("\n");
  const recipient = getTimesheetEmailRecipient(employee.email);
  const isTest = testMode || recipient !== employee.email;
  const testNoticeHtml = isTest ? "<p><strong>Test delivery.</strong></p>" : "";
  const testNoticeText = isTest ? "TEST DELIVERY\n\n" : "";
  return sendEmail({
    to: recipient,
    subject: `${isTest ? "[TEST] " : ""}Reminder: Submit your monthly timesheet`,
    html: `${testNoticeHtml}<p>Hello ${safeName},</p><p>Please submit your timesheet for the following month(s):</p><ul>${monthList}</ul><p>This reminder will continue daily until submission.</p><p>UTA Systems Timesheet Portal</p>`,
    text: `${testNoticeText}Hello ${employee.name || "Employee"},\n\nPlease submit your timesheet for the following month(s):\n${textMonths}\n\nThis reminder will continue daily until submission.\n\nUTA Systems Timesheet Portal`,
  });
}

export async function sendTimesheetSubmittedEmail({ employee, month, totalHours }) {
  const hrRecipient = process.env.TIMESHEET_HR_EMAIL || "hr@utasystems.com";
  const recipient = getTimesheetEmailRecipient(hrRecipient);
  const isTest = recipient !== hrRecipient;
  const safeName = escapeEmailHtml(employee.name || "Employee");
  const safeEmployeeCode = escapeEmailHtml(employee.employeeId || "-");
  const hours = Number(totalHours || 0).toFixed(2);
  return sendEmail({
    to: recipient,
    subject: `${isTest ? "[TEST] " : ""}Timesheet submitted: ${employee.name || "Employee"} - ${month}`,
    html: `${isTest ? "<p><strong>Test delivery.</strong></p>" : ""}<p>A timesheet was submitted.</p><p><strong>Employee:</strong> ${safeName} (${safeEmployeeCode})<br/><strong>Month:</strong> ${escapeEmailHtml(month)}<br/><strong>Total hours:</strong> ${hours}</p><p>UTA Systems Timesheet Portal</p>`,
    text: `${isTest ? "TEST DELIVERY\n\n" : ""}Timesheet submitted\nEmployee: ${employee.name || "Employee"} (${employee.employeeId || "-"})\nMonth: ${month}\nTotal hours: ${hours}\n\nUTA Systems Timesheet Portal`,
  });
}

export async function sendTimesheetReviewEmail({ employee, month, action, reviewComment }) {
  if (!employee.email) throw new Error("Employee email is not configured");
  const recipient = getTimesheetEmailRecipient(employee.email);
  const isTest = recipient !== employee.email;
  const title = action === "approved" ? "approved" : "needs changes";
  const safeName = escapeEmailHtml(employee.name || "Employee");
  const safeComment = escapeEmailHtml(reviewComment || "No review comment was provided.");
  return sendEmail({
    to: recipient,
    subject: `${isTest ? "[TEST] " : ""}Timesheet ${title}: ${month}`,
    html: `${isTest ? "<p><strong>Test delivery.</strong></p>" : ""}<p>Hello ${safeName},</p><p>Your timesheet for <strong>${escapeEmailHtml(month)}</strong> was ${title}.</p>${action === "rejected" ? `<p><strong>Review comment:</strong> ${safeComment}</p>` : ""}<p>UTA Systems Timesheet Portal</p>`,
    text: `${isTest ? "TEST DELIVERY\n\n" : ""}Hello ${employee.name || "Employee"},\n\nYour timesheet for ${month} was ${title}.${action === "rejected" ? `\nReview comment: ${reviewComment || "No review comment was provided."}` : ""}\n\nUTA Systems Timesheet Portal`,
  });
}
