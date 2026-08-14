import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    const decoded = token ? verifyToken(token) : null;

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { examId } = await req.json();

    if (!examId) {
      return NextResponse.json({ error: "Exam ID is required" }, { status: 400 });
    }

    const exam: any = await db.exam.findUnique({
      where: { id: examId },
      include: {
        subjects: {
          orderBy: { id: "asc" }, // consistent sequence order
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    if (exam.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Exam is not available" }, { status: 403 });
    }

    // Verify candidate is assigned to this exam
    const assignment = await db.examAssignment.findUnique({
      where: {
        examId_userId: {
          examId,
          userId: decoded.id,
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "This exam has not been assigned to you" }, { status: 403 });
    }

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + exam.duration * 60 * 1000);

    let activeSubjectId: string | null = null;
    let activeSubjectEndTime: Date | null = null;

    // For subject-wise timer mode, initialize active subject end time
    if (exam.timerMode === "SUBJECT_WISE" && exam.subjects.length > 0) {
      const firstSubject = exam.subjects[0];
      activeSubjectId = firstSubject.subjectId;
      activeSubjectEndTime = new Date(startTime.getTime() + firstSubject.duration * 60 * 1000);
    }

    // Create the exam attempt
    const attempt = await db.examAttempt.create({
      data: {
        userId: decoded.id,
        examId: exam.id,
        startTime,
        endTime,
        status: "IN_PROGRESS",
        activeSubjectId,
        activeSubjectEndTime,
      },
    });

    return NextResponse.json({
      message: "Attempt started",
      attemptId: attempt.id,
    });
  } catch (error: any) {
    console.error("POST start attempt error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
