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

    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        subjects: {
          include: {
            subject: { select: { name: true } },
          },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    if (decoded.role !== "ADMIN") {
      const assignment = await db.examAssignment.findUnique({
        where: {
          examId_userId: {
            examId: id,
            userId: decoded.id,
          },
        },
      });

      if (!assignment) {
        return NextResponse.json({ error: "This exam has not been assigned to you" }, { status: 403 });
      }
    }

    return NextResponse.json(exam);
  } catch (error: any) {
    console.error("GET exam instructions API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
