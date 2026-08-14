import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";

function isAdmin(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const decoded = token ? verifyToken(token) : null;
  return decoded && decoded.role === "ADMIN";
}

export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const totalExams = await db.exam.count();
    const publishedExams = await db.exam.count({ where: { status: "PUBLISHED" } });
    const draftExams = await db.exam.count({ where: { status: "DRAFT" } });
    const totalQuestions = await db.question.count();
    const totalSubjects = await db.subject.count();
    const totalCandidates = await db.user.count({ where: { role: "CANDIDATE" } });
    
    const attempts = await db.examAttempt.findMany({
      where: {
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "EXPIRED"] },
      },
      select: { score: true },
    });

    const totalAttempts = attempts.length;
    let averageScore = 0;

    if (totalAttempts > 0) {
      const sum = attempts.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0);
      averageScore = Number((sum / totalAttempts).toFixed(2));
    }

    return NextResponse.json({
      totalExams,
      publishedExams,
      draftExams,
      totalQuestions,
      totalSubjects,
      totalCandidates,
      totalAttempts,
      averageScore,
    });
  } catch (error: any) {
    console.error("GET admin dashboard stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
