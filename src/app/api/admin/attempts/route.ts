import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { checkAndSubmitExpiredAttempts } from "@/lib/attempts";

function isAdmin(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const decoded = token ? verifyToken(token) : null;
  return decoded && decoded.role === "ADMIN";
}

// GET all attempts for all candidates
export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-submit all expired attempts first
    await checkAndSubmitExpiredAttempts();

    const attempts = await db.examAttempt.findMany({
      orderBy: { startTime: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        exam: { select: { name: true } },
      },
    });

    const formatted = attempts.map((a: any) => {
      const end = a.submittedAt || a.endTime;
      const elapsedSecs = Math.max(0, Math.floor((end.getTime() - a.startTime.getTime()) / 1000));
      const mins = Math.floor(elapsedSecs / 60);
      const secs = elapsedSecs % 60;
      const timeTakenStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

      return {
        id: a.id,
        candidateName: a.user.name,
        candidateEmail: a.user.email,
        examName: a.exam.name,
        startTime: a.startTime,
        submittedAt: a.submittedAt,
        status: a.status,
        score: a.score,
        accuracy: a.accuracy,
        timeTaken: timeTakenStr,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("GET admin attempts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
