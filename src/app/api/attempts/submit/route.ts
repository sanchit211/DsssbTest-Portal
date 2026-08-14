import { NextRequest, NextResponse } from "next/server";
import { submitExamAttempt } from "../[id]/route";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    const decoded = token ? verifyToken(token) : null;

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attemptId } = await req.json();

    if (!attemptId) {
      return NextResponse.json({ error: "Attempt ID is required" }, { status: 400 });
    }

    // Call shared submit helper to calculate grade and lock status
    const result = await submitExamAttempt(attemptId, "SUBMITTED");

    return NextResponse.json({
      message: "Exam submitted successfully",
      score: result?.score,
      accuracy: result?.accuracy,
    });
  } catch (error: any) {
    console.error("POST submit attempt error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
