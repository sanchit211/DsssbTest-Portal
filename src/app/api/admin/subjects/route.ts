import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// Middleware authorization helper
function isAdmin(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const decoded = token ? verifyToken(token) : null;
  return decoded && decoded.role === "ADMIN";
}

// GET all subjects
export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subjects = await db.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    return NextResponse.json(subjects);
  } catch (error: any) {
    console.error("GET subjects error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST create subject
export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, isActive } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Subject name is required" }, { status: 400 });
    }

    const existing = await db.subject.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json({ error: "Subject already exists" }, { status: 400 });
    }

    const subject = await db.subject.create({
      data: {
        name,
        description,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(subject);
  } catch (error: any) {
    console.error("POST subject error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE all subjects (and cascade clean up related questions, options, exams, attempts, assignments)
export async function DELETE(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db.$transaction(async (tx: any) => {
      // 1. Delete all attempt answers & exam attempts
      await tx.attemptAnswer.deleteMany({});
      await tx.examAttempt.deleteMany({});

      // 2. Delete all exam assignments
      await tx.examAssignment.deleteMany({});

      // 3. Delete all exam questions & exam subjects
      await tx.examQuestion.deleteMany({});
      await tx.examSubject.deleteMany({});

      // 4. Delete all exams
      await tx.exam.deleteMany({});

      // 5. Delete all question options & questions
      await tx.questionOption.deleteMany({});
      await tx.question.deleteMany({});

      // 6. Delete all subjects
      const subRes = await tx.subject.deleteMany({});

      return subRes;
    });

    return NextResponse.json({
      message: "All subjects, questions, exams, and assignments deleted successfully",
      count: result.count,
    });
  } catch (error: any) {
    console.error("DELETE all subjects error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

