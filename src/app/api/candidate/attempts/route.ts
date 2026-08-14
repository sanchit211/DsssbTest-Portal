import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    const decoded = token ? verifyToken(token) : null;

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = decoded.id;

    const attempts = await db.examAttempt.findMany({
      where: { userId },
      orderBy: { startTime: "desc" },
      include: {
        exam: {
          select: {
            name: true,
            subjects: {
              include: { subject: { select: { name: true } } },
            },
          },
        },
      },
    });

    const formatted = attempts.map((a: any) => {
      // Calculate elapsed time string
      const end = a.submittedAt || a.endTime;
      const elapsedSecs = Math.max(0, Math.floor((end.getTime() - a.startTime.getTime()) / 1000));
      const mins = Math.floor(elapsedSecs / 60);
      const secs = elapsedSecs % 60;
      const timeTakenStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

      return {
        id: a.id,
        examName: a.exam.name,
        subjects: a.exam.subjects.map((s: any) => s.subject.name),
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
    console.error("GET candidate attempts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
