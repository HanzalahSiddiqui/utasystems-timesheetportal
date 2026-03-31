import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Holiday from "@/models/Holiday";

export async function DELETE(req, context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await connectDB();

    const deleted = await Holiday.findByIdAndDelete(id);

    if (!deleted) {
      return Response.json({ error: "Holiday not found" }, { status: 404 });
    }

    return Response.json({ message: "Holiday deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/holidays/[id] error:", error);
    return Response.json(
      { error: error.message || "Failed to delete holiday" },
      { status: 500 }
    );
  }
}