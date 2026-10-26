import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Payroll from "@/models/Payroll";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { getBusinessDate, isValidDateOnly } from "@/lib/datePolicy";
import { encryptSsn, normalizeSsn } from "@/lib/employeeSensitiveData";
import {
  compensationSnapshot,
  hasCompensationChanged,
  payrollSnapshotAsCompensation,
} from "@/lib/compensationHistory";

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
      personalEmail,
      address,
      ssn,
      designation,
      department,
      status,
      password,
      clientId,
      payType,
      numberOfDependents,
      perDayRate,
      perHourRate,
      otRatePerHour,
      annualGrossSalary,
      clientPerDayRate,
      clientPerHourRate,
      clientOtRatePerHour,
      payrollEnabled,
      joiningDate,
      leavingDate,
      revocationReason,
      rateEffectiveFrom,
    } = body;

    if (joiningDate !== undefined && !isValidDateOnly(joiningDate)) {
      return Response.json({ error: "Joining date must use YYYY-MM-DD format" }, { status: 400 });
    }
    if (leavingDate !== undefined && !isValidDateOnly(leavingDate)) {
      return Response.json({ error: "Leaving date must use YYYY-MM-DD format" }, { status: 400 });
    }
    if (rateEffectiveFrom !== undefined && !isValidDateOnly(rateEffectiveFrom)) {
      return Response.json({ error: "Rate effective date must use YYYY-MM-DD format" }, { status: 400 });
    }
    const normalizedAddress = address === undefined ? undefined : String(address || "").trim();
    if (normalizedAddress !== undefined && normalizedAddress.length > 500) {
      return Response.json({ error: "Employee address must be 500 characters or fewer" }, { status: 400 });
    }
    let normalizedSsn;
    let encryptedSsn;
    if (ssn !== undefined && String(ssn).trim()) {
      try {
        normalizedSsn = normalizeSsn(ssn);
        encryptedSsn = encryptSsn(normalizedSsn);
      } catch (error) {
        const status = error.code === "SSN_ENCRYPTION_KEY_MISSING" ? 503 : 400;
        return Response.json({ error: error.message }, { status });
      }
    }
    await connectDB();

    const employee = await User.findById(id);
    if (!employee) {
      return Response.json({ error: "Employee not found" }, { status: 404 });
    }

    const nextJoiningDate = joiningDate === undefined
      ? (employee.joiningDate ? new Date(employee.joiningDate).toISOString().slice(0, 10) : "")
      : joiningDate;
    const nextLeavingDate = leavingDate === undefined
      ? (employee.leavingDate ? new Date(employee.leavingDate).toISOString().slice(0, 10) : "")
      : leavingDate;
    if (nextJoiningDate && nextLeavingDate && nextJoiningDate > nextLeavingDate) {
      return Response.json({ error: "Leaving date cannot be before joining date" }, { status: 400 });
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

    if (personalEmail !== undefined) {
      const normalizedPersonalEmail = String(personalEmail || "").trim().toLowerCase();
      if (normalizedPersonalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedPersonalEmail)) {
        return Response.json({ error: "Invalid personal email address" }, { status: 400 });
      }
      employee.personalEmail = normalizedPersonalEmail;
    }
    if (normalizedAddress !== undefined) employee.address = normalizedAddress;
    if (encryptedSsn) {
      employee.ssnEncrypted = encryptedSsn;
      employee.ssnLast4 = normalizedSsn.slice(-4);
    }
    if (numberOfDependents !== undefined && (!Number.isInteger(Number(numberOfDependents)) || Number(numberOfDependents) < 0)) {
      return Response.json({ error: "Number of dependents must be a non-negative whole number" }, { status: 400 });
    }
    for (const [label, value] of [["Daily rate", perDayRate], ["Hourly rate", perHourRate]]) {
      if (value !== undefined && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
        return Response.json({ error: label + " must be a valid non-negative amount" }, { status: 400 });
      }
    }
    if (payType !== undefined && !["daily", "hourly"].includes(payType)) {
      return Response.json({ error: "Invalid pay type" }, { status: 400 });
    }

    const nextPayType = payType ?? employee.payType;
    const nextAnnualSalary = annualGrossSalary === undefined
      ? Number(employee.annualGrossSalary || 0)
      : Number(annualGrossSalary);
    if (!Number.isFinite(nextAnnualSalary) || nextAnnualSalary < 0) {
      return Response.json({ error: "Annual gross salary must be a valid non-negative amount" }, { status: 400 });
    }

    if (nextPayType === "daily") {
      const nextPerDayRate =
        perDayRate !== undefined ? Number(perDayRate) : Number(employee.perDayRate || 0);

      if (nextAnnualSalary <= 0 && nextPerDayRate <= 0) {
        return Response.json(
          { error: "Enter an annual gross salary or a manual per day rate for daily employees" },
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

    const nextCompensation = compensationSnapshot({
      payType: nextPayType,
      perDayRate: nextPayType === "daily"
        ? (nextAnnualSalary > 0 ? 0 : (perDayRate !== undefined ? Number(perDayRate) : Number(employee.perDayRate || 0)))
        : 0,
      perHourRate: nextPayType === "hourly"
        ? (perHourRate !== undefined ? Number(perHourRate) : Number(employee.perHourRate || 0))
        : 0,
      otRatePerHour: otRatePerHour !== undefined ? Number(otRatePerHour) : Number(employee.otRatePerHour || 0),
      annualGrossSalary: nextAnnualSalary,
      clientPerDayRate: clientPerDayRate !== undefined ? Number(clientPerDayRate) : Number(employee.clientPerDayRate || 0),
      clientPerHourRate: clientPerHourRate !== undefined ? Number(clientPerHourRate) : Number(employee.clientPerHourRate || 0),
      clientOtRatePerHour: clientOtRatePerHour !== undefined ? Number(clientOtRatePerHour) : Number(employee.clientOtRatePerHour || 0),
    }, rateEffectiveFrom || "0001-01-01");
    const compensationChanged = hasCompensationChanged(
      compensationSnapshot(employee, "0001-01-01"),
      nextCompensation
    );
    if (compensationChanged) {
      if (!rateEffectiveFrom) {
        return Response.json({ error: "Choose the first day of the month when the new rates take effect" }, { status: 400 });
      }
      if (!rateEffectiveFrom.endsWith("-01")) {
        return Response.json({ error: "Rate changes must take effect on the first day of a month" }, { status: 400 });
      }
      const currentMonthStart = `${getBusinessDate().slice(0, 7)}-01`;
      if (rateEffectiveFrom > currentMonthStart) {
        return Response.json({ error: "Rate changes can be recorded for the current or a past payroll month" }, { status: 400 });
      }
    }

    let compensationHistory = Array.isArray(employee.compensationHistory)
      ? employee.compensationHistory.map((entry) => entry.toObject ? entry.toObject() : { ...entry })
      : [];
    let compensationToApply = nextCompensation;
    if (compensationChanged) {
      if (!compensationHistory.length) {
        const historicalPayroll = await Payroll.find({
          employeeId: employee._id,
          month: { $lt: rateEffectiveFrom.slice(0, 7) },
        }).sort({ month: 1 });
        compensationHistory = historicalPayroll.map(payrollSnapshotAsCompensation);

        const effectiveMonthDate = new Date(`${rateEffectiveFrom}T00:00:00.000Z`);
        effectiveMonthDate.setUTCMonth(effectiveMonthDate.getUTCMonth() - 1);
        const monthBeforeChange = `${effectiveMonthDate.toISOString().slice(0, 7)}-01`;
        const baselineMonth = employee.joiningDate
          ? `${employee.joiningDate.toISOString().slice(0, 7)}-01`
          : historicalPayroll[0]?.month
            ? `${historicalPayroll[0].month}-01`
            : monthBeforeChange;
        if (!compensationHistory.some((entry) => entry.effectiveFrom === baselineMonth)) {
          compensationHistory.push(compensationSnapshot(employee, baselineMonth));
        }
      }

      const nextVersion = compensationSnapshot(nextCompensation, rateEffectiveFrom);
      compensationHistory = [
        ...compensationHistory.filter((entry) => entry.effectiveFrom !== rateEffectiveFrom),
        nextVersion,
      ].sort((left, right) => left.effectiveFrom.localeCompare(right.effectiveFrom));

      const currentMonthStart = `${getBusinessDate().slice(0, 7)}-01`;
      const activeVersion = compensationHistory
        .filter((entry) => entry.effectiveFrom <= currentMonthStart)
        .at(-1);
      if (activeVersion) compensationToApply = activeVersion;
      employee.compensationHistory = compensationHistory;
    }

    if (name !== undefined) employee.name = name;
    if (designation !== undefined) employee.designation = designation;
    if (department !== undefined) employee.department = department;
    if (status !== undefined && !["active", "inactive"].includes(status)) {
      return Response.json({ error: "Invalid employee status" }, { status: 400 });
    }
    if (status !== undefined) {
      employee.status = status;
      if (status === "inactive") {
        employee.revokedAt = new Date();
        employee.revokedBy = session.user.id;
        employee.revocationReason = String(
          revocationReason || employee.revocationReason || "Access revoked by administrator"
        ).trim();
      } else {
      }
    }
    if (joiningDate !== undefined) {
      employee.joiningDate = joiningDate ? new Date(`${joiningDate}T00:00:00.000Z`) : null;
    }
    if (leavingDate !== undefined) {
      employee.leavingDate = leavingDate ? new Date(`${leavingDate}T00:00:00.000Z`) : null;
    }
    if (revocationReason !== undefined && employee.status !== "active") {
      employee.revocationReason = String(revocationReason).trim();
    }
    if (clientId !== undefined) employee.clientId = clientId || null;

    if (numberOfDependents !== undefined) employee.numberOfDependents = Number(numberOfDependents);
    employee.payType = compensationToApply.payType;
    employee.perDayRate = compensationToApply.perDayRate;
    employee.perHourRate = compensationToApply.perHourRate;
    employee.otRatePerHour = compensationToApply.otRatePerHour;
    employee.annualGrossSalary = compensationToApply.annualGrossSalary;
    employee.monthlyGrossSalary = compensationToApply.monthlyGrossSalary;
    employee.clientPerDayRate = compensationToApply.clientPerDayRate;
    employee.clientPerHourRate = compensationToApply.clientPerHourRate;
    employee.clientOtRatePerHour = compensationToApply.clientOtRatePerHour;

    if (payrollEnabled !== undefined) {
      employee.payrollEnabled = !!payrollEnabled;
    }

    if (password && password.trim()) {
      employee.password = await bcrypt.hash(password.trim(), 10);
    }

    await employee.save();

    const safeEmployee = await User.findById(id).select("+address +ssnLast4");

    return Response.json({
      message: "Employee updated successfully",
      employee: safeEmployee,
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
