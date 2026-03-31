import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export async function PATCH(req, context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid employee ID" }, { status: 400 });
    }

    const body = await req.json();

    const {
      name,
      email,
      designation,
      department,
      status,
      password,
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

    await connectDB();

    const employee = await User.findById(id);
    if (!employee) {
      return Response.json({ error: "Employee not found" }, { status: 404 });
    }

    if (email && email !== employee.email) {
      const existingEmail = await User.findOne({ email, _id: { $ne: id } });
      if (existingEmail) {
        return Response.json(
          { error: "Email already in use" },
          { status: 400 }
        );
      }
      employee.email = email;
    }

    if (payType !== undefined && !["daily", "hourly"].includes(payType)) {
      return Response.json({ error: "Invalid pay type" }, { status: 400 });
    }

    const nextPayType = payType ?? employee.payType;

    if (nextPayType === "daily") {
      const nextPerDayRate =
        perDayRate !== undefined ? Number(perDayRate) : Number(employee.perDayRate || 0);

      if (nextPerDayRate <= 0) {
        return Response.json(
          { error: "Per day rate must be greater than 0 for daily employees" },
          { status: 400 }
        );
      }
    }

    if (nextPayType === "hourly") {
      const nextPerHourRate =
        perHourRate !== undefined ? Number(perHourRate) : Number(employee.perHourRate || 0);

      if (nextPerHourRate <= 0) {
        return Response.json(
          { error: "Per hour rate must be greater than 0 for hourly employees" },
          { status: 400 }
        );
      }
    }

    if (otRatePerHour !== undefined && Number(otRatePerHour) < 0) {
      return Response.json(
        { error: "OT rate per hour cannot be negative" },
        { status: 400 }
      );
    }

    if (clientOtRatePerHour !== undefined && Number(clientOtRatePerHour) < 0) {
      return Response.json(
        { error: "Client OT rate per hour cannot be negative" },
        { status: 400 }
      );
    }

    if (clientPerDayRate !== undefined && Number(clientPerDayRate) < 0) {
      return Response.json(
        { error: "Client per day rate cannot be negative" },
        { status: 400 }
      );
    }

    if (clientPerHourRate !== undefined && Number(clientPerHourRate) < 0) {
      return Response.json(
        { error: "Client per hour rate cannot be negative" },
        { status: 400 }
      );
    }

    if (name !== undefined) employee.name = name;
    if (designation !== undefined) employee.designation = designation;
    if (department !== undefined) employee.department = department;
    if (status !== undefined) employee.status = status;
    if (clientId !== undefined) employee.clientId = clientId || null;

    if (payType !== undefined) employee.payType = payType;
    if (perDayRate !== undefined) employee.perDayRate = Number(perDayRate);
    if (perHourRate !== undefined) employee.perHourRate = Number(perHourRate);
    if (otRatePerHour !== undefined) employee.otRatePerHour = Number(otRatePerHour);

    if (clientPerDayRate !== undefined) employee.clientPerDayRate = Number(clientPerDayRate);
    if (clientPerHourRate !== undefined) employee.clientPerHourRate = Number(clientPerHourRate);
    if (clientOtRatePerHour !== undefined) {
      employee.clientOtRatePerHour = Number(clientOtRatePerHour);
    }

    if (payrollEnabled !== undefined) {
      employee.payrollEnabled = !!payrollEnabled;
    }

    if (password && password.trim()) {
      employee.password = await bcrypt.hash(password.trim(), 10);
    }

    await employee.save();

    return Response.json({
      message: "Employee updated successfully",
      employee,
    });
  } catch (error) {
    console.error("PATCH /api/employees/[id] error:", error);
    return Response.json(
      { error: error.message || "Failed to update employee" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid employee ID" }, { status: 400 });
    }

    await connectDB();

    const employee = await User.findById(id);
    if (!employee) {
      return Response.json({ error: "Employee not found" }, { status: 404 });
    }

    if (employee.role === "admin") {
      return Response.json(
        { error: "Admin cannot be deleted here" },
        { status: 400 }
      );
    }

    await User.findByIdAndDelete(id);

    return Response.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/employees/[id] error:", error);
    return Response.json(
      { error: error.message || "Failed to delete employee" },
      { status: 500 }
    );
  }
}