import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";

function isAdmin(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const decoded = token ? verifyToken(token) : null;
  return decoded && decoded.role === "ADMIN";
}

// PUT edit subject
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { name, description, isActive } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Subject name is required" }, { status: 400 });
    }

    // Check if name is taken by another subject
    const existing = await db.subject.findFirst({
      where: {
        name,
        NOT: { id },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Another subject already has this name" }, { status: 400 });
    }

    const subject = await db.subject.update({
      where: { id },
      data: {
        name,
        description,
        isActive,
      },
    });

    return NextResponse.json(subject);
  } catch (error: any) {
    console.error("PUT subject error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE subject
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await db.$transaction(async (tx: any) => {
      // 1. Delete the subject (cascades questions, options, examSubjects, etc.)
      await tx.subject.delete({
        where: { id },
      });

      // 2. Find and delete exams that no longer have any questions or subjects
      const exams = await tx.exam.findMany({
        include: {
          questions: true,
          subjects: true,
        },
      });

      for (const exam of exams) {
        if (exam.questions.length === 0 || exam.subjects.length === 0) {
          await tx.exam.delete({
            where: { id: exam.id },
          }).catch(() => {});
        }
      }
    });

    return NextResponse.json({ message: "Subject and related exams/assignments deleted successfully" });
  } catch (error: any) {
    console.error("DELETE subject error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
