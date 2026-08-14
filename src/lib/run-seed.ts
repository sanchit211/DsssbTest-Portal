import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");
  
  // 1. Create a default admin and candidate if they don't exist
  // We can import bcryptjs to hash their passwords
  const bcrypt = require("bcryptjs");
  const hashedAdminPassword = await bcrypt.hash("admin123", 10);
  const hashedCandidatePassword = await bcrypt.hash("candidate123", 10);

  const admin = await db.user.upsert({
    where: { email: "admin@exam.com" },
    update: {},
    create: {
      email: "admin@exam.com",
      name: "System Administrator",
      password: hashedAdminPassword,
      role: "ADMIN",
    },
  });
  console.log("Admin user seeded:", admin.email);

  const candidate = await db.user.upsert({
    where: { email: "candidate@exam.com" },
    update: {},
    create: {
      email: "candidate@exam.com",
      name: "Rahul Kumar",
      password: hashedCandidatePassword,
      role: "CANDIDATE",
    },
  });
  console.log("Candidate user seeded:", candidate.email);

  // 2. Create Subjects
  const subjectsData = [
    { name: "Quantitative Aptitude", description: "Mathematics, Algebra, Arithmetic, and Geometry" },
    { name: "General Intelligence & Reasoning", description: "Logical reasoning, puzzles, analogies" },
    { name: "English Language", description: "Grammar, comprehension, vocabulary" },
    { name: "General Awareness", description: "History, geography, science, current affairs" },
  ];

  const subjects = [];
  for (const s of subjectsData) {
    const created = await db.subject.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
    subjects.push(created);
  }
  console.log("Subjects seeded:", subjects.map(s => s.name));

  // 3. Create Questions
  const qaSubject = subjects.find(s => s.name === "Quantitative Aptitude")!;
  const reasoningSubject = subjects.find(s => s.name === "General Intelligence & Reasoning")!;
  const englishSubject = subjects.find(s => s.name === "English Language")!;
  const gkSubject = subjects.find(s => s.name === "General Awareness")!;

  const questionsData = [
    // QA
    {
      questionText: "If a train runs at 60 km/h, it reaches its destination late by 15 minutes. But, if it runs at 80 km/h, it is late by 7 minutes only. Find the distance to be covered by the train.",
      correctAnswer: "B",
      explanation: "Let the distance be D. Difference in time = 15 - 7 = 8 minutes = 8/60 hours. D/60 - D/80 = 8/60 => (4D - 3D)/240 = 8/60 => D/240 = 8/60 => D = 32 km.",
      difficulty: "MEDIUM",
      subjectId: qaSubject.id,
      options: [
        { optionCode: "A", optionText: "24 km" },
        { optionCode: "B", optionText: "32 km" },
        { optionCode: "C", optionText: "40 km" },
        { optionCode: "D", optionText: "48 km" },
      ]
    },
    {
      questionText: "Find the value of x if 25% of x + 15% of 300 = 120.",
      correctAnswer: "C",
      explanation: "25% of x + (15/100)*300 = 120 => 0.25x + 45 = 120 => 0.25x = 75 => x = 300.",
      difficulty: "EASY",
      subjectId: qaSubject.id,
      options: [
        { optionCode: "A", optionText: "200" },
        { optionCode: "B", optionText: "250" },
        { optionCode: "C", optionText: "300" },
        { optionCode: "D", optionText: "350" },
      ]
    },
    {
      questionText: "The average age of 15 students of a class is 15 years. Out of these, the average age of 5 students is 14 years and that of the other 9 students is 16 years. The age of the 15th student is:",
      correctAnswer: "A",
      explanation: "Total age of 15 students = 15 * 15 = 225. Total age of 14 students = (5 * 14) + (9 * 16) = 70 + 144 = 214. Age of 15th student = 225 - 214 = 11 years.",
      difficulty: "EASY",
      subjectId: qaSubject.id,
      options: [
        { optionCode: "A", optionText: "11 years" },
        { optionCode: "B", optionText: "15 years" },
        { optionCode: "C", optionText: "20 years" },
        { optionCode: "D", optionText: "14 years" },
      ]
    },

    // Reasoning
    {
      questionText: "In a certain code language, 'COMPUTER' is written as 'RFUVQNPC'. How will 'MEDICINE' be written in that code language?",
      correctAnswer: "D",
      explanation: "The logic is: Reverse the word and add +1 to all intermediate letters. MEDICINE reversed is ENICIDEM. E -> E, N+1 -> O, I+1 -> J, C+1 -> D, I+1 -> J, D+1 -> E, E+1 -> F, M -> M. Thus: EOJDEJFM.",
      difficulty: "MEDIUM",
      subjectId: reasoningSubject.id,
      options: [
        { optionCode: "A", optionText: "EOJDEJFM" },
        { optionCode: "B", optionText: "MFEJDJOE" },
        { optionCode: "C", optionText: "DJEOJFEN" },
        { optionCode: "D", optionText: "EOJDJEFM" },
      ]
    },
    {
      questionText: "Which number replaces the question mark in the following series? 2, 6, 12, 20, 30, ?",
      correctAnswer: "C",
      explanation: "Differences are: +4, +6, +8, +10. Next difference should be +12. 30 + 12 = 42.",
      difficulty: "EASY",
      subjectId: reasoningSubject.id,
      options: [
        { optionCode: "A", optionText: "36" },
        { optionCode: "B", optionText: "40" },
        { optionCode: "C", optionText: "42" },
        { optionCode: "D", optionText: "44" },
      ]
    },

    // English
    {
      questionText: "Choose the word most opposite in meaning to 'ABUNDANT'.",
      correctAnswer: "A",
      explanation: "Abundant means present in great quantity. Its opposite is scarce (scanty, insufficient).",
      difficulty: "EASY",
      subjectId: englishSubject.id,
      options: [
        { optionCode: "A", optionText: "Scarce" },
        { optionCode: "B", optionText: "Plentiful" },
        { optionCode: "C", optionText: "Generous" },
        { optionCode: "D", optionText: "Ample" },
      ]
    },
    {
      questionText: "Identify the correct spelled word.",
      correctAnswer: "B",
      explanation: "The correct spelling is 'Accommodation'.",
      difficulty: "MEDIUM",
      subjectId: englishSubject.id,
      options: [
        { optionCode: "A", optionText: "Acomodation" },
        { optionCode: "B", optionText: "Accommodation" },
        { optionCode: "C", optionText: "Accomodation" },
        { optionCode: "D", optionText: "Acommodation" },
      ]
    },

    // GK
    {
      questionText: "Who was the first Governor-General of independent India?",
      correctAnswer: "B",
      explanation: "Lord Mountbatten was the first Governor-General of independent India. C. Rajagopalachari was the first and only Indian Governor-General.",
      difficulty: "EASY",
      subjectId: gkSubject.id,
      options: [
        { optionCode: "A", optionText: "C. Rajagopalachari" },
        { optionCode: "B", optionText: "Lord Mountbatten" },
        { optionCode: "C", optionText: "Dr. Rajendra Prasad" },
        { optionCode: "D", optionText: "Jawaharlal Nehru" },
      ]
    },
    {
      questionText: "Which is the largest organ in the human body?",
      correctAnswer: "C",
      explanation: "Skin is the largest organ in the human body. Liver is the largest internal organ.",
      difficulty: "EASY",
      subjectId: gkSubject.id,
      options: [
        { optionCode: "A", optionText: "Liver" },
        { optionCode: "B", optionText: "Heart" },
        { optionCode: "C", optionText: "Skin" },
        { optionCode: "D", optionText: "Lungs" },
      ]
    },
  ];

  for (const q of questionsData) {
    const existing = await db.question.findFirst({
      where: { questionText: q.questionText },
    });
    if (!existing) {
      await db.question.create({
        data: {
          questionText: q.questionText,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          subjectId: q.subjectId,
          options: {
            create: q.options,
          },
        },
      });
    }
  }

  // 4. Create a default Exam
  const examName = "SSC CGL Mini Mock Test 01";
  let exam = await db.exam.findFirst({
    where: { name: examName },
  });

  if (!exam) {
    exam = await db.exam.create({
      data: {
        name: examName,
        description: "This is a default mock test to verify candidate login and exam attempt logic.",
        instructions: "Read all questions carefully. There will be negative marking of 0.5 marks for wrong answers.",
        duration: 20,
        timerMode: "OVERALL",
        status: "PUBLISHED",
        maxAttempts: -1,
      },
    });

    // Create ExamSubject mappings
    for (const sub of subjects) {
      await db.examSubject.create({
        data: {
          examId: exam.id,
          subjectId: sub.id,
          questionCount: 2,
          duration: 0,
          marks: 2.0,
          negativeMarks: 0.5,
          questionSelection: "MANUAL",
        },
      });
    }

    // Link the seeded questions to the exam
    const dbQuestions = await db.question.findMany({
      where: { subjectId: { in: subjects.map(s => s.id) } },
    });

    for (let index = 0; index < dbQuestions.length; index++) {
      const q = dbQuestions[index];
      await db.examQuestion.create({
        data: {
          examId: exam.id,
          questionId: q.id,
          order: index,
        },
      });
    }
    console.log(`Created default mock exam with ${dbQuestions.length} questions.`);
  }

  // 5. Assign this exam to the default candidate (Rahul Kumar)
  const candidateUser = await db.user.findUnique({
    where: { email: "candidate@exam.com" },
  });

  if (candidateUser && exam) {
    await db.examAssignment.upsert({
      where: {
        examId_userId: {
          examId: exam.id,
          userId: candidateUser.id,
        },
      },
      update: {},
      create: {
        examId: exam.id,
        userId: candidateUser.id,
      },
    });
    console.log(`Assigned default mock exam to candidate: ${candidateUser.email}`);
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
