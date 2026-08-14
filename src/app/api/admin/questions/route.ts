import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";

function isAdmin(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const decoded = token ? verifyToken(token) : null;
  return decoded && decoded.role === "ADMIN";
}

// GET list of questions with filtering & search
export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const difficulty = searchParams.get("difficulty");
    const search = searchParams.get("search");

    const where: any = {};

    if (subjectId && subjectId !== "all") {
      where.subjectId = subjectId;
    }

    if (difficulty && difficulty !== "all") {
      where.difficulty = difficulty;
    }

    if (search) {
      where.questionText = {
        contains: search,
      };
    }

    const questions = await db.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        subject: { select: { name: true } },
        options: true,
      },
    });

    return NextResponse.json(questions);
  } catch (error: any) {
    console.error("GET questions error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST create question
export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    if (options.length < 2) {
      return NextResponse.json({ error: "At least two options are required" }, { status: 400 });
    }

    const question = await db.question.create({
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

    return NextResponse.json(question);
  } catch (error: any) {
    console.error("POST question error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
