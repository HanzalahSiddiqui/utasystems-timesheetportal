import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Payroll from "@/models/Payroll";
import User from "@/models/User";
import { sendEmail } from "@/lib/email";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

const money = (value) => `$${Number(value || 0).toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { month, recipient, note = "" } = await req.json();
    const email = String(recipient || "").trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")) {
      return Response.json({ error: "Select a valid payroll month" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Enter a valid accountant email address" }, { status: 400 });
    }
    if (String(note).length > 4000) {
      return Response.json({ error: "Email note must be 4,000 characters or less" }, { status: 400 });
    }

    await connectDB();
    const payrollItems = await Payroll.find({ month }).sort({ employeeName: 1 });
    if (!payrollItems.length) {
      return Response.json({ error: "Generate payroll for this month before emailing the accountant" }, { status: 400 });
    }

    const employeeCodes = payrollItems.map((item) => item.employeeCode);
    const employees = await User.find({ employeeId: { $in: employeeCodes } })
      .select("employeeId annualGrossSalary monthlyGrossSalary numberOfDependents")
      .lean();
    const employeesByCode = new Map(employees.map((employee) => [String(employee.employeeId), employee]));
    const monthLabel = new Intl.DateTimeFormat("en-US", {
      month: "long", year: "numeric", timeZone: "UTC",
    }).format(new Date(`${month}-01T00:00:00.000Z`));

    const rows = payrollItems.map((item) => {
      const employee = employeesByCode.get(String(item.employeeCode));
      const monthlySalary = Number(item.monthlyGrossSalary || 0)
        || Number(employee?.monthlyGrossSalary || 0)
        || Number(employee?.annualGrossSalary || 0) / 12;
      return {
        item,
        salary: monthlySalary > 0 ? monthlySalary : Number(item.grossPay || 0),
        daysWorked: Number(item.presentDays ?? item.payableDays ?? 0),
        regularEarning: Number(item.regularPay ?? 0),
        perDiem: Number(item.perDiemOtherIncome || 0),
        dependents: Number(item.numberOfDependents || employee?.numberOfDependents || 0),
      };
    });

    const tableRows = rows.map(({ item, salary, daysWorked, regularEarning, perDiem, dependents }) => `
      <tr><td style="padding:9px;border:1px solid #cbd5e1">${escapeHtml(item.employeeName)}</td>
      <td style="padding:9px;border:1px solid #cbd5e1">${escapeHtml(monthLabel)}</td>
      <td style="padding:9px;border:1px solid #cbd5e1;text-align:right">${money(salary)}</td>
      <td style="padding:9px;border:1px solid #cbd5e1;text-align:right">${daysWorked}</td>
      <td style="padding:9px;border:1px solid #cbd5e1;text-align:right">${money(regularEarning)}</td>
      <td style="padding:9px;border:1px solid #cbd5e1;text-align:right">${money(perDiem)}</td>
      <td style="padding:9px;border:1px solid #cbd5e1;text-align:right">${dependents}</td></tr>`).join("");
    const noteText = String(note).trim();
    const noteHtml = noteText ? `<p style="white-space:pre-wrap">${escapeHtml(noteText)}</p>` : "";
    const textRows = rows.map(({ item, salary, daysWorked, regularEarning, perDiem, dependents }) =>
      [item.employeeName, monthLabel, money(salary), daysWorked, money(regularEarning), money(perDiem), dependents].join(" | ")
    );

    await sendEmail({
      to: email,
      subject: `Payroll summary — ${monthLabel}`,
      html: `<div style="font-family:Arial,sans-serif;color:#172033"><p>Hello,</p><p>Here is the payroll summary for ${escapeHtml(monthLabel)}.</p><p style="color:#64748b;font-size:12px">Gross Salary shows monthly contract gross when configured; otherwise it shows this period’s gross earnings. Pro Rate Salary is straight-time pay; per diem/other income is separate.</p>${noteHtml}<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;font-size:13px"><thead><tr style="background:#fff200;color:#111"><th style="padding:9px;border:1px solid #cbd5e1;text-align:left">Name</th><th style="padding:9px;border:1px solid #cbd5e1;text-align:left">Month</th><th style="padding:9px;border:1px solid #cbd5e1;text-align:right">Gross Salary</th><th style="padding:9px;border:1px solid #cbd5e1;text-align:right">Number of Days Worked</th><th style="padding:9px;border:1px solid #cbd5e1;text-align:right">Pro Rate Salary</th><th style="padding:9px;border:1px solid #cbd5e1;text-align:right">Per Diem/Other income</th><th style="padding:9px;border:1px solid #cbd5e1;text-align:right">Number of Dependent</th></tr></thead><tbody>${tableRows}</tbody></table></div><p>Regards,<br>UTA Systems Timesheet Portal</p></div>`,
      text: `Hello,\n\nHere is the payroll summary for ${monthLabel}.\nGross Salary shows monthly contract gross when configured; otherwise it shows this period’s gross earnings. Pro Rate Salary is straight-time pay; per diem/other income is separate.\n${noteText}\n\nName | Month | Gross Salary | Number of Days Worked | Pro Rate Salary | Per Diem/Other income | Number of Dependent\n${textRows.join("\n")}\n\nRegards,\nUTA Systems Timesheet Portal`,
    });

    return Response.json({ message: `Accountant payroll email sent to ${email}`, count: rows.length });
  } catch (error) {
    console.error("POST /api/payroll accountant email error:", error);
    return Response.json({ error: error.message || "Failed to email accountant" }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);

    const month = searchParams.get("month");
    const status = searchParams.get("status");
    const payType = searchParams.get("payType");
    const search = searchParams.get("search");

    const query = {};

    if (month) query.month = month;
    if (status) query.status = status;
    if (payType) query.payType = payType;

    if (search) {
      query.$or = [
        { employeeName: { $regex: search, $options: "i" } },
        { employeeCode: { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
      ];
    }

    const payrollItems = await Payroll.find(query).sort({
  employeeName: 1,
  createdAt: -1,
});

const items = await Promise.all(
  payrollItems.map(async (item) => {

    const employee = await User.findOne({
      employeeId: item.employeeCode,
    });

    return {
      ...item.toObject(),

      annualGrossSalary:
        Number(item.annualGrossSalary || 0) || Number(employee?.annualGrossSalary || 0),

      monthlyGrossSalary:
        Number(item.monthlyGrossSalary || 0)
          || Number(employee?.monthlyGrossSalary || 0)
          || Number(employee?.annualGrossSalary || 0) / 12,
    };
  })
);

    return Response.json({ items });
  } catch (error) {
    console.error("GET /api/payroll error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch payroll" },
      { status: 500 }
    );
  }
}
