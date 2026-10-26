import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { submitExamAttempt } from "@/lib/attempts";

// GET attempt details (restores state, processes sections/timeouts)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get("token")?.value;
    const decoded = token ? verifyToken(token) : null;

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch attempt details
    let attempt: any = await db.examAttempt.findUnique({
      where: { id },
      include: {
        exam: {
          include: {
            subjects: {
              orderBy: { id: "asc" },
              include: { subject: true },
            },
            questions: {
              orderBy: { order: "asc" },
              include: {
                question: {
                  include: {
                    options: true,
                    subject: true,
                  },
                },
              },
            },
          },
        },
        answers: true,
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Security check: ensure current user matches candidate
    if (attempt.userId !== decoded.id && decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access to attempt" }, { status: 403 });
    }

    const now = new Date();

    // 1. If already submitted, return early
    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({ attempt, isFinished: true });
    }

    // 2. Check overall exam timer expiration
    if (now >= attempt.endTime) {
      // Auto-submit the attempt
      const updated = await submitExamAttempt(id, "EXPIRED");
      return NextResponse.json({ attempt: updated, isFinished: true });
    }

    // 3. Check section timer expiration if timerMode is SUBJECT_WISE
    if (attempt.exam.timerMode === "SUBJECT_WISE") {
      // If no active subject set (should not happen), set first
      if (!attempt.activeSubjectId || !attempt.activeSubjectEndTime) {
        attempt = await db.examAttempt.update({
          where: { id },
          data: {
            activeSubjectId: attempt.exam.subjects[0].subjectId,
            activeSubjectEndTime: new Date(now.getTime() + attempt.exam.subjects[0].duration * 60 * 1000),
          },
          include: {
            exam: {
              include: {
                subjects: { orderBy: { id: "asc" }, include: { subject: true } },
                questions: { orderBy: { order: "asc" }, include: { question: { include: { options: true, subject: true } } } },
              },
            },
            answers: true,
          },
        });
      }

      // Loop to handle transitions (in case they spent a long time away and multiple section timers expired)
      while (attempt.activeSubjectEndTime && now >= attempt.activeSubjectEndTime && attempt.status === "IN_PROGRESS") {
        const currentIdx = attempt.exam.subjects.findIndex((s: any) => s.subjectId === attempt.activeSubjectId);
        const nextSubject: any = attempt.exam.subjects[currentIdx + 1];

        if (nextSubject) {
          // Transition to next subject section
          const newEndTime: Date = new Date(attempt.activeSubjectEndTime.getTime() + nextSubject.duration * 60 * 1000);
          attempt = await db.examAttempt.update({
            where: { id },
            data: {
              activeSubjectId: nextSubject.subjectId,
              activeSubjectEndTime: newEndTime,
            },
            include: {
              exam: {
                include: {
                  subjects: { orderBy: { id: "asc" }, include: { subject: true } },
                  questions: { orderBy: { order: "asc" }, include: { question: { include: { options: true, subject: true } } } },
                },
              },
              answers: true,
            },
          });
        } else {
          // No more sections, auto-submit exam
          const updated = await submitExamAttempt(id, "AUTO_SUBMITTED");
          return NextResponse.json({ attempt: updated, isFinished: true });
        }
      }
    }

    // 4. Filter correct answers from questions for security before returning to candidate
    const sanitizedQuestions = attempt.exam.questions.map((eq: any) => {
      const q = eq.question;
      return {
        id: q.id,
        questionText: q.questionText,
        imagePath: q.imagePath,
        questionType: q.questionType,
        subjectId: q.subjectId,
        subjectName: q.subject.name,
        difficulty: q.difficulty,
        options: q.options.map((o: any) => ({
          optionCode: o.optionCode,
          optionText: o.optionText,
        })),
      };
    });

    return NextResponse.json({
      attemptId: attempt.id,
      examName: attempt.exam.name,
      timerMode: attempt.exam.timerMode,
      overallEndTime: attempt.endTime.toISOString(),
      activeSubjectId: attempt.activeSubjectId,
      activeSubjectEndTime: attempt.activeSubjectEndTime ? attempt.activeSubjectEndTime.toISOString() : null,
      subjects: attempt.exam.subjects.map((s: any) => ({
        subjectId: s.subjectId,
        name: s.subject.name,
        questionCount: s.questionCount,
        duration: s.duration,
        marks: s.marks,
        negativeMarks: s.negativeMarks,
      })),
      questions: sanitizedQuestions,
      answers: attempt.answers.map((a: any) => ({
        questionId: a.questionId,
        selectedOption: a.selectedOption,
        isMarkedForReview: a.isMarkedForReview,
        timeSpent: a.timeSpent,
      })),
      isFinished: false,
    });
  } catch (error: any) {
    console.error("GET attempt error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
