import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";

function isAdmin(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const decoded = token ? verifyToken(token) : null;
  return decoded && decoded.role === "ADMIN";
}

// PUT edit question
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const {
      questionText,
      options, // array of { optionCode, optionText }
      correctAnswer,
      explanation,
      difficulty,
      subjectId,
      defaultMarks,
      defaultNegativeMarks,
    } = await req.json();

    if (!questionText || !options || !correctAnswer || !difficulty || !subjectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Use transaction to update safely
    const updated = await db.$transaction(async (tx: any) => {
      // 1. Delete all existing options for this question
      await tx.questionOption.deleteMany({
        where: { questionId: id },
      });

      // 2. Update question details and create new options
      return tx.question.update({
        where: { id },
        data: {
          questionText,
          correctAnswer,
          explanation,
          difficulty,
          subjectId,
          defaultMarks: Number(defaultMarks || 2.0),
          defaultNegativeMarks: Number(defaultNegativeMarks || 0.5),
          options: {
            create: options.map((opt: any) => ({
              optionCode: opt.optionCode,
              optionText: opt.optionText,
            })),
          },
        },
        include: {
          options: true,
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT question error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE question
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await db.question.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Question deleted successfully" });
  } catch (error: any) {
    console.error("DELETE question error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
