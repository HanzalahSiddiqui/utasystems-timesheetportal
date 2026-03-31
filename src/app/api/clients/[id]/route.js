import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/Client";
import mongoose from "mongoose";

export async function PATCH(req, context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid client ID" }, { status: 400 });
    }

    const body = await req.json();
    const { clientName, clientEmail, clientAddress, status } = body;

    await connectDB();

    const client = await Client.findById(id);

    if (!client) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    if (clientName && clientName !== client.clientName) {
      const existingName = await Client.findOne({
        clientName: clientName.trim(),
        _id: { $ne: id },
      });

      if (existingName) {
        return Response.json(
          { error: "Client name already in use" },
          { status: 400 }
        );
      }

      client.clientName = clientName.trim();
    }

    if (clientEmail !== undefined) {
      client.clientEmail = clientEmail.trim().toLowerCase();
    }

    if (clientAddress !== undefined) {
      client.clientAddress = clientAddress.trim();
    }

    if (status !== undefined) {
      client.status = status;
    }

    await client.save();

    return Response.json({
      message: "Client updated successfully",
      client,
    });
  } catch (error) {
    console.error("PATCH /api/clients/[id] error:", error);
    return Response.json(
      { error: error.message || "Failed to update client" },
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
      return Response.json({ error: "Invalid client ID" }, { status: 400 });
    }

    await connectDB();

    const client = await Client.findById(id);

    if (!client) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    await Client.findByIdAndDelete(id);

    return Response.json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/clients/[id] error:", error);
    return Response.json(
      { error: error.message || "Failed to delete client" },
      { status: 500 }
    );
  }
}