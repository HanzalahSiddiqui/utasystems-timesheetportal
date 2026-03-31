import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/Client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const clients = await Client.find().sort({ clientName: 1 });

    return Response.json({ clients });
  } catch (error) {
    console.error("GET /api/clients error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch clients" },
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
    const { clientName, clientEmail, clientAddress, status } = body;

    if (!clientName || !clientEmail) {
      return Response.json(
        { error: "Client name and client email are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await Client.findOne({
      clientName: clientName.trim(),
    });

    if (existing) {
      return Response.json(
        { error: "Client already exists" },
        { status: 400 }
      );
    }

    const client = await Client.create({
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim().toLowerCase(),
      clientAddress: clientAddress?.trim() || "",
      status: status || "active",
    });

    return Response.json({
      message: "Client created successfully",
      client,
    });
  } catch (error) {
    console.error("POST /api/clients error:", error);
    return Response.json(
      { error: error.message || "Failed to create client" },
      { status: 500 }
    );
  }
}