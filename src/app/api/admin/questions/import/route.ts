import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";

function isAdmin(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const decoded = token ? verifyToken(token) : null;
  return decoded && decoded.role === "ADMIN";
}

// Simple, robust CSV parsing helper that handles double quotes
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let currentVal = "";
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        // Escaped quote
        currentVal += '"';
        i++; // skip next quote
      } else {
        // Toggle quote state
        insideQuote = !insideQuote;
      }
    } else if (char === "," && !insideQuote) {
      row.push(currentVal.trim());
      currentVal = "";
    } else if ((char === "\r" || char === "\n") && !insideQuote) {
      if (char === "\r" && nextChar === "\n") i++; // skip linefeed
      row.push(currentVal.trim());
      if (row.length > 0 && row.some(cell => cell !== "")) {
        lines.push(row);
      }
      row = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }

  // Push remaining cells/rows
  if (currentVal !== "") {
    row.push(currentVal.trim());
  }
  if (row.length > 0 && row.some(cell => cell !== "")) {
    lines.push(row);
  }

  return lines;
}

export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No CSV file provided" }, { status: 400 });
    }

    const fileContent = await file.text();
    const rows = parseCSV(fileContent);

    if (rows.length < 2) {
      return NextResponse.json({ error: "CSV file is empty or missing headers" }, { status: 400 });
    }

    const headers = rows[0].map(h => h.toLowerCase());
    const dataRows = rows.slice(1);

    // Columns indices mapping
    const colIdx = {
      question: headers.indexOf("question"),
      optA: headers.indexOf("option a"),
      optB: headers.indexOf("option b"),
      optC: headers.indexOf("option c"),
      optD: headers.indexOf("option d"),
      correct: headers.indexOf("correct answer"),
      explanation: headers.indexOf("explanation"),
      subject: headers.indexOf("subject"),
      difficulty: headers.indexOf("difficulty"),
      marks: headers.indexOf("marks"),
      negMarks: headers.indexOf("negative marks"),
    };

    if (colIdx.question === -1 || colIdx.optA === -1 || colIdx.optB === -1 || colIdx.correct === -1 || colIdx.subject === -1) {
      return NextResponse.json({
        error: "Missing required columns in CSV. Required: 'Question', 'Option A', 'Option B', 'Correct Answer', 'Subject'"
      }, { status: 400 });
    }

    let importCount = 0;

    await db.$transaction(async (tx: any) => {
      for (const row of dataRows) {
        const questionText = row[colIdx.question];
        const optAText = row[colIdx.optA];
        const optBText = row[colIdx.optB];
        const optCText = colIdx.optC !== -1 ? row[colIdx.optC] : "";
        const optDText = colIdx.optD !== -1 ? row[colIdx.optD] : "";
        const correctAnswer = row[colIdx.correct];
        const explanation = colIdx.explanation !== -1 ? row[colIdx.explanation] : "";
        const subjectName = row[colIdx.subject];
        let difficulty = colIdx.difficulty !== -1 ? row[colIdx.difficulty]?.toUpperCase() : "MEDIUM";
        let marks = colIdx.marks !== -1 ? parseFloat(row[colIdx.marks]) : 2.0;
        let negMarks = colIdx.negMarks !== -1 ? parseFloat(row[colIdx.negMarks]) : 0.5;

        if (!questionText || !optAText || !optBText || !correctAnswer || !subjectName) {
          continue; // Skip invalid rows
        }

        if (difficulty !== "EASY" && difficulty !== "MEDIUM" && difficulty !== "HARD") {
          difficulty = "MEDIUM";
        }

        if (isNaN(marks)) marks = 2.0;
        if (isNaN(negMarks)) negMarks = 0.5;

        // Find or create subject
        let subject = await tx.subject.findFirst({
          where: { name: { equals: subjectName } },
        });

        if (!subject) {
          subject = await tx.subject.create({
            data: {
              name: subjectName,
              description: `Imported via CSV`,
            },
          });
        }

        // Create options array
        const optionsList = [
          { optionCode: "A", optionText: optAText },
          { optionCode: "B", optionText: optBText },
        ];
        if (optCText) optionsList.push({ optionCode: "C", optionText: optCText });
        if (optDText) optionsList.push({ optionCode: "D", optionText: optDText });

        // Create Question
        await tx.question.create({
          data: {
            questionText,
            correctAnswer,
            explanation,
            difficulty,
            defaultMarks: marks,
            defaultNegativeMarks: negMarks,
            subjectId: subject.id,
            options: {
              create: optionsList.map(o => ({
                optionCode: o.optionCode,
                optionText: o.optionText,
              })),
            },
          },
        });

        importCount++;
      }
    });

    return NextResponse.json({
      message: "Questions imported successfully",
      count: importCount,
    });
  } catch (error: any) {
    console.error("CSV import error:", error);
    return NextResponse.json({ error: error.message || "Failed to process CSV file" }, { status: 500 });
  }
}
