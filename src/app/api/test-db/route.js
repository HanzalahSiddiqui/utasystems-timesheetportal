import { connectDB } from "@/lib/mongodb";

export async function GET() {
  try {
    await connectDB();
    return Response.json({ message: "MongoDB connected successfully" });
  } catch (error) {
    return Response.json(
      { error: "MongoDB connection failed", details: error.message },
      { status: 500 }
    );
  }
}