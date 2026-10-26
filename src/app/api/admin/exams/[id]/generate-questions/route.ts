import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { selectDiverseQuestions } from "@/lib/question-selection";

function isAdmin(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const decoded = token ? verifyToken(token) : null;
  return decoded && decoded.role === "ADMIN";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { subjectId, count, easyCount, mediumCount, hardCount } = await req.json();

    if (!subjectId || !count) {
      return NextResponse.json({ error: "Subject ID and count are required" }, { status: 400 });
    }

    // 1. Fetch available questions for this subject in the Question Bank
    const allQuestions = await db.question.findMany({
      where: { subjectId },
    });

    if (allQuestions.length < count) {
      return NextResponse.json({
        error: `Insufficient questions in the Question Bank. Available: ${allQuestions.length}, Requested: ${count}`
      }, { status: 400 });
    }

    // 2. Select questions based on difficulty distribution if supplied, using diverse sampling
    const hasDistribution = easyCount !== undefined || mediumCount !== undefined || hardCount !== undefined;

    if (hasDistribution) {
      const eReq = Number(easyCount || 0);
      const mReq = Number(mediumCount || 0);
      const hReq = Number(hardCount || 0);

      if (eReq + mReq + hReq !== Number(count)) {
        return NextResponse.json({
          error: "Sum of difficulty distribution counts must equal total question count"
        }, { status: 400 });
      }

      const easyQuestions = allQuestions.filter((q: any) => q.difficulty === "EASY");
      const mediumQuestions = allQuestions.filter((q: any) => q.difficulty === "MEDIUM");
      const hardQuestions = allQuestions.filter((q: any) => q.difficulty === "HARD");

      if (easyQuestions.length < eReq || mediumQuestions.length < mReq || hardQuestions.length < hReq) {
        return NextResponse.json({
          error: `Insufficient questions in bank for specified distribution. Available - Easy: ${easyQuestions.length}, Medium: ${mediumQuestions.length}, Hard: ${hardQuestions.length}`
        }, { status: 400 });
      }
    }

    const selectedQuestions = selectDiverseQuestions(allQuestions, Number(count), hasDistribution ? {
      easyCount: Number(easyCount || 0),
      mediumCount: Number(mediumCount || 0),
      hardCount: Number(hardCount || 0),
    } : undefined);

    // 3. Update the exam's questions. 
    // Delete existing ExamQuestions for this exam and this subject
    await db.$transaction(async (tx: any) => {
      // Find current ExamQuestion IDs that are linked to this subject
      const existingExamQuestions = await tx.examQuestion.findMany({
        where: {
          examId: id,
          question: { subjectId },
        },
        select: { id: true },
      });

      const idsToDelete = existingExamQuestions.map((eq: any) => eq.id);

      await tx.examQuestion.deleteMany({
        where: { id: { in: idsToDelete } },
      });

      // Find current max order to append correctly
      const maxOrderResult = await tx.examQuestion.aggregate({
        where: { examId: id },
        _max: { order: true },
      });
      const startOrder = (maxOrderResult._max.order ?? -1) + 1;

      await tx.examQuestion.createMany({
        data: selectedQuestions.map((q: any, index: number) => ({
          examId: id,
          questionId: q.id,
          order: startOrder + index,
        })),
      });
    });

    return NextResponse.json({
      message: `Successfully selected ${selectedQuestions.length} random questions for subject.`,
      count: selectedQuestions.length,
    });
  } catch (error: any) {
    console.error("Generate questions error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
