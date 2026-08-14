import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";

function isAdmin(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const decoded = token ? verifyToken(token) : null;
  return decoded && decoded.role === "ADMIN";
}

// GET single exam details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        subjects: {
          include: {
            subject: true,
          },
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
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json(exam);
  } catch (error: any) {
    console.error("GET exam detail error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT update exam configuration & questions
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const {
      name,
      description,
      instructions,
      duration,
      timerMode,
      status,
      maxAttempts,
      subjects, // Array of: { subjectId, questionCount, duration, marks, negativeMarks, questionSelection }
      questionIds, // Array of question IDs (for manual question selection)
    } = body;

    const updatedExam = await db.$transaction(async (tx: any) => {
      // 1. Update basic details
      const exam = await tx.exam.update({
        where: { id },
        data: {
          name,
          description,
          instructions,
          duration: duration !== undefined ? Number(duration) : undefined,
          timerMode,
          status,
          maxAttempts: maxAttempts !== undefined ? Number(maxAttempts) : undefined,
        },
      });

      // 2. Update subjects configuration if provided
      if (subjects !== undefined) {
        // Delete current configurations
        await tx.examSubject.deleteMany({
          where: { examId: id },
        });

        // Re-create configurations
        if (subjects.length > 0) {
          await tx.examSubject.createMany({
            data: subjects.map((sub: any) => ({
              examId: id,
              subjectId: sub.subjectId,
              questionCount: Number(sub.questionCount || 0),
              duration: Number(sub.duration || 0),
              marks: Number(sub.marks || 2.0),
              negativeMarks: Number(sub.negativeMarks || 0.5),
              questionSelection: sub.questionSelection || "MANUAL",
            })),
          });
        }
      }

      // 3. Update manual question linking if provided
      if (questionIds !== undefined) {
        // Delete current questions linked
        await tx.examQuestion.deleteMany({
          where: { examId: id },
        });

        // Link new questions in order
        if (questionIds.length > 0) {
          await tx.examQuestion.createMany({
            data: questionIds.map((qId: string, index: number) => ({
              examId: id,
              questionId: qId,
              order: index,
            })),
          });
        }
      }

      return exam;
    });

    return NextResponse.json(updatedExam);
  } catch (error: any) {
    console.error("PUT exam error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// DELETE exam
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await db.exam.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Exam deleted successfully" });
  } catch (error: any) {
    console.error("DELETE exam error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
