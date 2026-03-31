import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";

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
    const search = searchParams.get("search");

    const query = {};

    if (month) query.month = month;
    if (status) query.status = status;

    if (search) {
      query.$or = [
        { employeeName: { $regex: search, $options: "i" } },
        { clientName: { $regex: search, $options: "i" } },
        { invoiceNumber: { $regex: search, $options: "i" } },
      ];
    }

    const items = await Invoice.find(query).sort({
      createdAt: -1,
    });

    return Response.json({ items });
  } catch (error) {
    console.error("GET /api/invoices error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}