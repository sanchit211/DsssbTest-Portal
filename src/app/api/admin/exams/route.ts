import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";

function isAdmin(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const decoded = token ? verifyToken(token) : null;
  return decoded && decoded.role === "ADMIN";
}

// GET all exams
export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exams = await db.exam.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subjects: {
          include: {
            subject: { select: { name: true } },
          },
        },
        _count: {
          select: { questions: true, attempts: true },
        },
      },
    });

    // Formatting response to match UI requirements
    const formatted = exams.map((exam: any) => {
      const subjectTotalQuestions = exam.subjects.reduce((sum: number, s: any) => sum + s.questionCount, 0);
      const questionsCount = exam._count.questions > 0 ? exam._count.questions : subjectTotalQuestions;
      return {
        id: exam.id,
        name: exam.name,
        description: exam.description,
        duration: exam.duration,
        timerMode: exam.timerMode,
        status: exam.status,
        createdAt: exam.createdAt,
        subjects: exam.subjects.map((es: any) => es.subject.name),
        questionsCount,
        attemptsCount: exam._count.attempts,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("GET exams error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST create exam (initially as a DRAFT)
export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, instructions, duration, timerMode, maxAttempts } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Exam name is required" }, { status: 400 });
    }

    const exam = await db.exam.create({
      data: {
        name,
        description,
        instructions,
        duration: Number(duration || 60),
        timerMode: timerMode || "OVERALL",
        maxAttempts: Number(maxAttempts || -1),
        status: "DRAFT",
      },
    });

    return NextResponse.json(exam);
  } catch (error: any) {
    console.error("POST exam error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
