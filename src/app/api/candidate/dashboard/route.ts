import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { checkAndSubmitExpiredAttempts } from "@/lib/attempts";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    const decoded = token ? verifyToken(token) : null;

    if (!decoded || (decoded.role !== "CANDIDATE" && decoded.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = decoded.id;

    // Auto-submit expired attempts first
    await checkAndSubmitExpiredAttempts(userId);

    // 1. Fetch published exams
    const exams = await db.exam.findMany({
      where: { 
        status: "PUBLISHED",
        assignments: {
          some: {
            userId,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        subjects: {
          include: {
            subject: { select: { name: true } },
          },
        },
        _count: {
          select: { questions: true },
        },
      },
    });

    // Formatting exams
    const formattedExams = exams.map((e: any) => {
      const subjectTotalQuestions = e.subjects.reduce((sum: number, s: any) => sum + s.questionCount, 0);
      const questionsCount = e._count.questions > 0 ? e._count.questions : subjectTotalQuestions;
      return {
        id: e.id,
        name: e.name,
        description: e.description,
        duration: e.duration,
        timerMode: e.timerMode,
        questionsCount,
        subjects: e.subjects.map((es: any) => ({
          name: es.subject.name,
          questionCount: es.questionCount,
          duration: es.duration,
        })),
      };
    });

    // 2. Fetch candidate stats
    const attempts = await db.examAttempt.findMany({
      where: {
        userId,
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "EXPIRED"] },
      },
      select: {
        score: true,
        accuracy: true,
        exam: {
          select: {
            id: true,
          },
        },
      },
    });

    const totalAttempts = attempts.length;
    let avgScore = 0;
    let bestScore = 0;
    let avgAccuracy = 0;

    if (totalAttempts > 0) {
      const scores = attempts.map((a: any) => a.score || 0);
      const accuracies = attempts.map((a: any) => a.accuracy || 0);

      avgScore = Number((scores.reduce((sum: number, s: number) => sum + s, 0) / totalAttempts).toFixed(2));
      bestScore = Number(Math.max(...scores).toFixed(2));
      avgAccuracy = Number((accuracies.reduce((sum: number, a: number) => sum + a, 0) / totalAttempts).toFixed(1));
    }

    return NextResponse.json({
      userName: decoded.name,
      exams: formattedExams,
      stats: {
        totalAttempts,
        avgScore,
        bestScore,
        avgAccuracy,
      },
    });
  } catch (error: any) {
    console.error("GET candidate dashboard error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
