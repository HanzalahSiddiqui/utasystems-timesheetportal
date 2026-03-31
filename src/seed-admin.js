import bcrypt from "bcryptjs";
import { connectDB } from "./lib/mongodb.js";
import User from "./models/User.js";

async function run() {
  try {
    await connectDB();

    console.log("User import type:", typeof User);
    console.log("User model name:", User?.modelName);

    const existing = await User.findOne({ email: "admin@utasystems.com" });

    if (existing) {
      console.log("Admin already exists");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    await User.create({
      name: "Admin User",
      email: "admin@utasystems.com",
      password: hashedPassword,
      employeeId: "UTA-ADMIN-001",
      designation: "Administrator",
      department: "Management",
      role: "admin",
      status: "active",
    });

    console.log("Admin created successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

run();