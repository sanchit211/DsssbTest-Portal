import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";

function isAdmin(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const decoded = token ? verifyToken(token) : null;
  return decoded && decoded.role === "ADMIN";
}

// GET all candidates, published exams, and current assignments
export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const candidates = await db.user.findMany({
      where: { role: "CANDIDATE" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    const exams = await db.exam.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, name: true, duration: true },
      orderBy: { name: "asc" },
    });

    const assignments = await db.examAssignment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        exam: { select: { name: true } },
      },
    });

    return NextResponse.json({
      candidates,
      exams,
      assignments: assignments.map((a: any) => ({
        id: a.id,
        examId: a.examId,
        userId: a.userId,
        examName: a.exam.name,
        candidateName: a.user.name,
        candidateEmail: a.user.email,
        assignedAt: a.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("GET assignments error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST create a new exam assignment
export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { examId, userIds } = await req.json();

    if (!examId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "Exam ID and an array of User IDs are required" }, { status: 400 });
    }

    const createdAssignments = [];

    // Create assignments (use a loop to ignore duplicates or upsert)
    for (const userId of userIds) {
      const assignment = await db.examAssignment.upsert({
        where: {
          examId_userId: {
            examId,
            userId,
          },
        },
        update: {},
        create: {
          examId,
          userId,
        },
      });
      createdAssignments.push(assignment);
    }

    return NextResponse.json({
      message: `Successfully assigned exam to ${createdAssignments.length} candidates.`,
      count: createdAssignments.length,
    });
  } catch (error: any) {
    console.error("POST assignments error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE an exam assignment
export async function DELETE(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 });
    }

    await db.examAssignment.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Assignment deleted successfully" });
  } catch (error: any) {
    console.error("DELETE assignment error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
