import db from "./db";

export async function submitExamAttempt(attemptId: string, finalStatus: "SUBMITTED" | "AUTO_SUBMITTED" | "EXPIRED" = "SUBMITTED") {
  const attempt = await db.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          subjects: true,
          questions: {
            include: {
              question: {
                include: {
                  options: true,
                },
              },
            },
          },
        },
      },
      answers: true,
    },
  });

  if (!attempt || attempt.status !== "IN_PROGRESS") {
    return attempt;
  }

  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalUnattempted = 0;
  let finalScore = 0;

  const subjectsConfig = attempt.exam.subjects;

  for (const eq of attempt.exam.questions) {
    const q = eq.question;
    const answer = attempt.answers.find((a: any) => a.questionId === q.id);
    const subConfig = subjectsConfig.find((sc: any) => sc.subjectId === q.subjectId);

    const marks = subConfig?.marks ?? 2.0;
    const negMarks = subConfig?.negativeMarks ?? 0.5;

    if (!answer || !answer.selectedOption) {
      totalUnattempted++;
    } else if (answer.selectedOption === q.correctAnswer) {
      totalCorrect++;
      finalScore += marks;
    } else {
      totalIncorrect++;
      finalScore -= negMarks;
    }
  }

  const attemptedCount = totalCorrect + totalIncorrect;
  const accuracy = attemptedCount > 0 
    ? Number(((totalCorrect / attemptedCount) * 100).toFixed(1)) 
    : 0;

  return db.examAttempt.update({
    where: { id: attemptId },
    data: {
      status: finalStatus,
      submittedAt: new Date(),
      score: finalScore,
      accuracy,
    },
  });
}

export async function checkAndSubmitExpiredAttempts(userId?: string) {
  const now = new Date();
  
  const expiredAttempts = await db.examAttempt.findMany({
    where: {
      status: "IN_PROGRESS",
      endTime: {
        lte: now,
      },
      ...(userId ? { userId } : {}),
    },
    select: {
      id: true,
    },
  });

  for (const attempt of expiredAttempts) {
    try {
      await submitExamAttempt(attempt.id, "EXPIRED");
    } catch (err) {
      console.error(`Failed to auto-submit expired attempt ${attempt.id}:`, err);
    }
  }
}
