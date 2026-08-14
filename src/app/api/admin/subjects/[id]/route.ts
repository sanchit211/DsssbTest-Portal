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

    await db.subject.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Subject deleted successfully" });
  } catch (error: any) {
    console.error("DELETE subject error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
