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

    const { attemptId, questionId, selectedOption, isMarkedForReview, timeSpent } = await req.json();

    if (!attemptId || !questionId) {
      return NextResponse.json({ error: "Attempt ID and Question ID are required" }, { status: 400 });
    }

    // 1. Fetch current attempt status
    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: true,
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Exam attempt not found" }, { status: 404 });
    }

    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "Exam attempt is already submitted or closed" }, { status: 403 });
    }

    const now = new Date();

    // 2. Validate overall exam timer
    if (now >= attempt.endTime) {
      return NextResponse.json({ error: "Exam time has expired" }, { status: 403 });
    }

    // 3. Validate subject-wise timer constraints
    if (attempt.exam.timerMode === "SUBJECT_WISE") {
      // Find which subject the target question belongs to
      const question = await db.question.findUnique({
        where: { id: questionId },
        select: { subjectId: true },
      });

      if (!question) {
        return NextResponse.json({ error: "Question not found" }, { status: 404 });
      }

      // Check if question belongs to the active subject section
      if (question.subjectId !== attempt.activeSubjectId) {
        return NextResponse.json({ error: "Cannot modify answers for inactive sections" }, { status: 403 });
      }

      // Check if active subject section timer expired
      if (attempt.activeSubjectEndTime && now >= attempt.activeSubjectEndTime) {
        return NextResponse.json({ error: "Active section timer has expired" }, { status: 403 });
      }
    }

    // 4. Save answer (using Upsert on attemptId + questionId unique constraint)
    const answer = await db.attemptAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId,
        },
      },
      update: {
        selectedOption: selectedOption === "" ? null : selectedOption,
        isMarkedForReview: isMarkedForReview ?? false,
        answeredAt: now,
        timeSpent: typeof timeSpent === "number" ? timeSpent : undefined,
      },
      create: {
        attemptId,
        questionId,
        selectedOption: selectedOption === "" ? null : selectedOption,
        isMarkedForReview: isMarkedForReview ?? false,
        answeredAt: now,
        timeSpent: typeof timeSpent === "number" ? timeSpent : 0,
      },
    });

    return NextResponse.json({ message: "Answer saved", answer });
  } catch (error: any) {
    console.error("POST save answer error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
