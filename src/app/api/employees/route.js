import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import Client from "@/models/Client";
import { getBusinessDate, isValidDateOnly } from "@/lib/datePolicy";
import { encryptSsn, normalizeSsn } from "@/lib/employeeSensitiveData";
import { compensationSnapshot } from "@/lib/compensationHistory";
export async function GET() {
  try {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const employees = await User.find({ role: "employee" })
    .populate("clientId", "clientName clientEmail clientAddress status")
    .select("+address +ssnLast4")
    .sort({ createdAt: -1 });

  return Response.json({ employees });
  } catch (error) {
    console.error("GET /api/employees error:", error);
    const message = process.env.NODE_ENV === "development"
      ? error.message
      : "Failed to load employees";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const {
      name,
      email,
      personalEmail,
      address,
      ssn,
      password,
      employeeId,
      designation,
      department,
      clientId,
      payType,
      perDayRate,
      perHourRate,
      otRatePerHour,
      clientPerDayRate,
      clientPerHourRate,
      clientOtRatePerHour,
      payrollEnabled,
      annualGrossSalary,
      numberOfDependents,
      joiningDate,
      leavingDate,
    } = body;

    if (!name || !email || !password || !employeeId || !payType) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const normalizedPersonalEmail = personalEmail ? String(personalEmail).trim().toLowerCase() : "";
    if (normalizedPersonalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedPersonalEmail)) {
      return Response.json({ error: "Invalid personal email address" }, { status: 400 });
    }
    if (!isValidDateOnly(joiningDate) || !isValidDateOnly(leavingDate)) {
      return Response.json({ error: "Dates must use YYYY-MM-DD format" }, { status: 400 });
    }

    const normalizedAddress = String(address || "").trim();
    if (normalizedAddress.length > 500) {
      return Response.json({ error: "Employee address must be 500 characters or fewer" }, { status: 400 });
    }
    let normalizedSsn;
    let encryptedSsn;
    try {
      normalizedSsn = normalizeSsn(ssn);
      encryptedSsn = encryptSsn(normalizedSsn);
    } catch (error) {
      const status = error.code === "SSN_ENCRYPTION_KEY_MISSING" ? 503 : 400;
      return Response.json({ error: error.message }, { status });
    }

    if (joiningDate && leavingDate && joiningDate > leavingDate) {
      return Response.json({ error: "Leaving date cannot be before joining date" }, { status: 400 });
    }

    const dependents = Number(numberOfDependents ?? 0);
    if (!Number.isInteger(dependents) || dependents < 0) {
      return Response.json({ error: "Number of dependents must be a non-negative whole number" }, { status: 400 });
    }
    if (!Number.isFinite(Number(perDayRate ?? 0)) || Number(perDayRate ?? 0) < 0 || !Number.isFinite(Number(perHourRate ?? 0)) || Number(perHourRate ?? 0) < 0) {
      return Response.json({ error: "Employee rates must be valid non-negative amounts" }, { status: 400 });
    }

    const annualSalary = Number(annualGrossSalary ?? 0);
    if (!Number.isFinite(annualSalary) || annualSalary < 0) {
      return Response.json({ error: "Annual gross salary must be a valid non-negative amount" }, { status: 400 });
    }

    if (!["daily", "hourly"].includes(payType)) {
      return Response.json({ error: "Invalid pay type" }, { status: 400 });
    }

    if (payType === "daily" && annualSalary <= 0 && Number(perDayRate) <= 0) {
      return Response.json(
        { error: "Enter an annual gross salary or a manual per day rate for daily employees" },
        { status: 400 }
      );
    }

    if (payType === "hourly" && Number(perHourRate) <= 0) {
      return Response.json(
        { error: "Per hour rate must be greater than 0 for hourly employees" },
        { status: 400 }
      );
    }

    if (payType === "daily" && Number(clientPerDayRate) < 0) {
      return Response.json(
        { error: "Client per day rate cannot be negative" },
        { status: 400 }
      );
    }

    if (payType === "hourly" && Number(clientPerHourRate) < 0) {
      return Response.json(
        { error: "Client per hour rate cannot be negative" },
        { status: 400 }
      );
    }

    if (Number(otRatePerHour || 0) < 0) {
      return Response.json(
        { error: "OT rate per hour cannot be negative" },
        { status: 400 }
      );
    }

    if (Number(clientOtRatePerHour || 0) < 0) {
      return Response.json(
        { error: "Client OT rate per hour cannot be negative" },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await User.findOne({
      $or: [{ email }, { employeeId }],
    });

    if (existing) {
      return Response.json(
        { error: "Employee already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
const monthlySalary =
  annualSalary > 0
    ? Number((annualSalary / 12).toFixed(2))
    : 0;
    const initialCompensation = compensationSnapshot({
      payType,
      perDayRate: payType === "daily" && annualSalary === 0 ? perDayRate : 0,
      perHourRate: payType === "hourly" ? perHourRate : 0,
      otRatePerHour,
      annualGrossSalary: annualSalary,
      monthlyGrossSalary: monthlySalary,
      clientPerDayRate: payType === "daily" ? clientPerDayRate : 0,
      clientPerHourRate: payType === "hourly" ? clientPerHourRate : 0,
      clientOtRatePerHour,
    }, `${(joiningDate || getBusinessDate()).slice(0, 7)}-01`);

    const user = await User.create({
      name,
      email,
      personalEmail: normalizedPersonalEmail,
      address: normalizedAddress,
      ssnEncrypted: encryptedSsn,
      ssnLast4: normalizedSsn.slice(-4),
      password: hashedPassword,
      employeeId,
      designation,
      department,
      clientId: clientId || null,
      role: "employee",
      status: "active",
      joiningDate: joiningDate ? new Date(`${joiningDate}T00:00:00.000Z`) : null,
      leavingDate: leavingDate ? new Date(`${leavingDate}T00:00:00.000Z`) : null,

      payType,
      numberOfDependents: dependents,
      perDayRate: payType === "daily" && annualSalary === 0 ? Number(perDayRate || 0) : 0,
      perHourRate: payType === "hourly" ? Number(perHourRate || 0) : 0,
      otRatePerHour: Number(otRatePerHour || 0),

      clientPerDayRate: payType === "daily" ? Number(clientPerDayRate || 0) : 0,
      clientPerHourRate: payType === "hourly" ? Number(clientPerHourRate || 0) : 0,
      clientOtRatePerHour: Number(clientOtRatePerHour || 0),
      compensationHistory: [initialCompensation],

      payrollEnabled: payrollEnabled !== undefined ? !!payrollEnabled : true,
      annualGrossSalary: annualSalary,
monthlyGrossSalary: monthlySalary,
    });

    const safeUser = await User.findById(user._id).select("+address +ssnLast4");
    return Response.json({
      message: "Employee created successfully",
      user: safeUser,
    });
  } catch (error) {
    console.error("POST /api/employees error:", error);
    return Response.json(
      { error: error.message || "Failed to create employee" },
      { status: 500 }
    );
  }
}
