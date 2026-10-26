import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";

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

    const attempt = await db.examAttempt.findUnique({
      where: { id },
      include: {
        exam: {
          include: {
            subjects: {
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

    // Security check
    if (attempt.userId !== decoded.id && decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access to results" }, { status: 403 });
    }

    // Enforce lock: result can only be viewed if the test is submitted
    if (attempt.status === "IN_PROGRESS") {
      return NextResponse.json({ error: "Exam attempt is still in progress. Submit first." }, { status: 403 });
    }

    // Calculate details and breakdowns
    const totalQuestions = attempt.exam.questions.length;
    const questionsBreakdown: any[] = [];
    
    // Subject Breakdown Map
    const subjectStats: Record<string, {
      name: string;
      questionsCount: number;
      correct: number;
      incorrect: number;
      unattempted: number;
      score: number;
    }> = {};

    // Initialize map
    for (const es of attempt.exam.subjects) {
      subjectStats[es.subjectId] = {
        name: es.subject.name,
        questionsCount: 0,
        correct: 0,
        incorrect: 0,
        unattempted: 0,
        score: 0,
      };
    }

    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;

    for (const eq of attempt.exam.questions) {
      const q = eq.question;
      const ans = attempt.answers.find((a: any) => a.questionId === q.id);
      const subConfig = attempt.exam.subjects.find((sc: any) => sc.subjectId === q.subjectId);
      
      const marks = subConfig?.marks ?? 2.0;
      const negMarks = subConfig?.negativeMarks ?? 0.5;

      const stats = subjectStats[q.subjectId] || {
        name: q.subject.name,
        questionsCount: 0,
        correct: 0,
        incorrect: 0,
        unattempted: 0,
        score: 0,
      };

      stats.questionsCount++;

      let status: "correct" | "incorrect" | "unattempted" = "unattempted";
      let earned = 0;

      if (!ans || !ans.selectedOption) {
        status = "unattempted";
        unattemptedCount++;
        stats.unattempted++;
      } else if (ans.selectedOption === q.correctAnswer) {
        status = "correct";
        correctCount++;
        earned = marks;
        stats.correct++;
        stats.score += marks;
      } else {
        status = "incorrect";
        incorrectCount++;
        earned = -negMarks;
        stats.incorrect++;
        stats.score -= negMarks;
      }

      questionsBreakdown.push({
        id: q.id,
        questionText: q.questionText,
        options: q.options.map((o: any) => ({ code: o.optionCode, text: o.optionText })),
        correctAnswer: q.correctAnswer,
        selectedOption: ans ? ans.selectedOption : null,
        status,
        earned,
        explanation: q.explanation,
        subjectName: q.subject.name,
        difficulty: q.difficulty,
        timeSpent: ans ? ans.timeSpent : 0,
      });

      subjectStats[q.subjectId] = stats;
    }

    // Time Taken calculation (minutes and seconds)
    const end = attempt.submittedAt || attempt.endTime;
    const elapsedSecs = Math.max(0, Math.floor((end.getTime() - attempt.startTime.getTime()) / 1000));
    const mins = Math.floor(elapsedSecs / 60);
    const secs = elapsedSecs % 60;
    const timeTakenStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

    const maxMarks = attempt.exam.subjects.reduce((sum: number, s: any) => sum + (s.questionCount * s.marks), 0);

    return NextResponse.json({
      attemptId: attempt.id,
      examName: attempt.exam.name,
      status: attempt.status,
      startTime: attempt.startTime,
      submittedAt: attempt.submittedAt,
      timeTaken: timeTakenStr,
      score: attempt.score,
      maxMarks,
      accuracy: attempt.accuracy,
      totals: {
        questions: totalQuestions,
        correct: correctCount,
        incorrect: incorrectCount,
        unattempted: unattemptedCount,
      },
      subjectBreakdown: Object.values(subjectStats),
      questions: questionsBreakdown,
    });
  } catch (error: any) {
    console.error("GET attempt result error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
