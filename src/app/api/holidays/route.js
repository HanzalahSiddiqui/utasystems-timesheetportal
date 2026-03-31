import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Holiday from "@/models/Holiday";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    const query = month ? { month } : {};
    const holidays = await Holiday.find(query).sort({ date: 1 });

    return Response.json({ holidays });
  } catch (error) {
    console.error("GET /api/holidays error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch holidays" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { date, title } = body;

    if (!date || !title) {
      return Response.json(
        { error: "Date and title are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await Holiday.findOne({ date });

    if (existing) {
      return Response.json(
        { error: "Holiday already exists on this date" },
        { status: 400 }
      );
    }

    const holiday = await Holiday.create({
      date,
      month: date.slice(0, 7),
      title,
      createdBy: session.user.id,
    });

    return Response.json({
      message: "Holiday added successfully",
      holiday,
    });
  } catch (error) {
    console.error("POST /api/holidays error:", error);
    return Response.json(
      { error: error.message || "Failed to create holiday" },
      { status: 500 }
    );
  }
}