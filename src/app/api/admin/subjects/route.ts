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
