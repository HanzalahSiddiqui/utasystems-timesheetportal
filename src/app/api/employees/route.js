import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import Client from "@/models/Client";
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const employees = await User.find({ role: "employee" })
    .populate("clientId", "clientName clientEmail clientAddress status")
    .select("-password")
    .sort({ createdAt: -1 });

  return Response.json({ employees });
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
    } = body;

    if (!name || !email || !password || !employeeId || !payType) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["daily", "hourly"].includes(payType)) {
      return Response.json({ error: "Invalid pay type" }, { status: 400 });
    }

    if (payType === "daily" && Number(perDayRate) <= 0) {
      return Response.json(
        { error: "Per day rate must be greater than 0 for daily employees" },
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

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      employeeId,
      designation,
      department,
      clientId: clientId || null,
      role: "employee",
      status: "active",

      payType,
      perDayRate: payType === "daily" ? Number(perDayRate || 0) : 0,
      perHourRate: payType === "hourly" ? Number(perHourRate || 0) : 0,
      otRatePerHour: Number(otRatePerHour || 0),

      clientPerDayRate: payType === "daily" ? Number(clientPerDayRate || 0) : 0,
      clientPerHourRate: payType === "hourly" ? Number(clientPerHourRate || 0) : 0,
      clientOtRatePerHour: Number(clientOtRatePerHour || 0),

      payrollEnabled: payrollEnabled !== undefined ? !!payrollEnabled : true,
    });

    return Response.json({
      message: "Employee created successfully",
      user,
    });
  } catch (error) {
    console.error("POST /api/employees error:", error);
    return Response.json(
      { error: error.message || "Failed to create employee" },
      { status: 500 }
    );
  }
}