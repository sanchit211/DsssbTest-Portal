import { NextResponse } from "next/server";
import db from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    // 1. Clear database (in correct order to prevent foreign key issues)
    await db.attemptAnswer.deleteMany({});
    await db.examAttempt.deleteMany({});
    await db.examQuestion.deleteMany({});
    await db.examSubject.deleteMany({});
    await db.exam.deleteMany({});
    await db.questionOption.deleteMany({});
    await db.question.deleteMany({});
    await db.subject.deleteMany({});
    await db.user.deleteMany({});

    // 2. Create Users
    const hashedAdminPassword = await hashPassword("admin123");
    const hashedCandidatePassword = await hashPassword("candidate123");

    const admin = await db.user.create({
      data: {
        email: "admin@test.com",
        password: hashedAdminPassword,
        name: "Admin User",
        role: "ADMIN",
      },
    });

    const candidate = await db.user.create({
      data: {
        email: "candidate@test.com",
        password: hashedCandidatePassword,
        name: "Candidate User",
        role: "CANDIDATE",
      },
    });

    // 3. Create Subjects
    const english = await db.subject.create({
      data: { name: "English", description: "Grammar, vocabulary, reading comprehension." },
    });

    const quant = await db.subject.create({
      data: { name: "Quantitative Aptitude", description: "Mathematical calculations and problem solving." },
    });

    const gk = await db.subject.create({
      data: { name: "General Knowledge", description: "General awareness, current events, history." },
    });

    const reasoning = await db.subject.create({
      data: { name: "Reasoning", description: "Logical deductions and analytical thinking." },
    });

    // 4. Helper to insert Question with options
    const createQuestionWithOptions = async (
      subjectId: string,
      questionText: string,
      options: { code: string; text: string }[],
      correctAnswer: string,
      explanation: string,
      difficulty: "EASY" | "MEDIUM" | "HARD"
    ) => {
      return db.question.create({
        data: {
          subjectId,
          questionText,
          correctAnswer,
          explanation,
          difficulty,
          defaultMarks: 2.0,
          defaultNegativeMarks: 0.5,
          options: {
            create: options.map(o => ({
              optionCode: o.code,
              optionText: o.text,
            })),
          },
        },
      });
    };

    // 5. Seed English questions
    await createQuestionWithOptions(
      english.id,
      'Select the synonym of the word "ABUNDANT".',
      [
        { code: "A", text: "Rare" },
        { code: "B", text: "Scarce" },
        { code: "C", text: "Plentiful" },
        { code: "D", text: "Limited" },
      ],
      "C",
      '"Abundant" means existing or available in large quantities; overflowing. "Plentiful" is the direct synonym.',
      "EASY"
    );

    await createQuestionWithOptions(
      english.id,
      "Choose the correctly spelled word.",
      [
        { code: "A", text: "Accomodate" },
        { code: "B", text: "Accommodate" },
        { code: "C", text: "Acommodate" },
        { code: "D", text: "Accomodatte" },
      ],
      "B",
      'The correct spelling is "Accommodate" with double "c" and double "m".',
      "MEDIUM"
    );

    await createQuestionWithOptions(
      english.id,
      'Identify the antonym of "TIMID".',
      [
        { code: "A", text: "Bold" },
        { code: "B", text: "Shy" },
        { code: "C", text: "Fearful" },
        { code: "D", text: "Humble" },
      ],
      "A",
      '"Timid" means showing lack of courage or easily frightened. "Bold" means courageous and brave, making it the antonym.',
      "EASY"
    );

    await createQuestionWithOptions(
      english.id,
      "Complete the sentence: She has been working here _______ 2018.",
      [
        { code: "A", text: "for" },
        { code: "B", text: "from" },
        { code: "C", text: "since" },
        { code: "D", text: "until" },
      ],
      "C",
      'We use "since" to denote a specific point in time in the past when an action started.',
      "EASY"
    );

    await createQuestionWithOptions(
      english.id,
      "Select the word that means: A person who writes dictionaries.",
      [
        { code: "A", text: "Linguist" },
        { code: "B", text: "Lexicographer" },
        { code: "C", text: "Bibliographer" },
        { code: "D", text: "Cartographer" },
      ],
      "B",
      "A lexicographer is a person who compiles dictionaries. Cartographer is for maps; Linguist studies languages.",
      "HARD"
    );

    // 6. Seed Quant questions
    await createQuestionWithOptions(
      quant.id,
      "What is the value of 15% of 240?",
      [
        { code: "A", text: "30" },
        { code: "B", text: "36" },
        { code: "C", text: "40" },
        { code: "D", text: "42" },
      ],
      "B",
      "15% of 240 = (15 / 100) * 240 = 0.15 * 240 = 36.",
      "EASY"
    );

    await createQuestionWithOptions(
      quant.id,
      "If the cost price of an item is $100 and it is sold for $125, what is the profit percentage?",
      [
        { code: "A", text: "20%" },
        { code: "B", text: "25%" },
        { code: "C", text: "30%" },
        { code: "D", text: "15%" },
      ],
      "B",
      "Profit = Selling Price - Cost Price = 125 - 100 = 25. Profit % = (25 / 100) * 100 = 25%.",
      "EASY"
    );

    await createQuestionWithOptions(
      quant.id,
      "A train covers 360 km in 4 hours. What is its speed in meters per second (m/s)?",
      [
        { code: "A", text: "20 m/s" },
        { code: "B", text: "25 m/s" },
        { code: "C", text: "30 m/s" },
        { code: "D", text: "90 m/s" },
      ],
      "B",
      "Speed = Distance / Time = 360 km / 4 hours = 90 km/h. To convert km/h to m/s, multiply by 5/18: 90 * (5/18) = 25 m/s.",
      "MEDIUM"
    );

    await createQuestionWithOptions(
      quant.id,
      "Solve for x: 3x + 7 = 22.",
      [
        { code: "A", text: "4" },
        { code: "B", text: "5" },
        { code: "C", text: "6" },
        { code: "D", text: "7" },
      ],
      "B",
      "3x + 7 = 22 => 3x = 15 => x = 5.",
      "EASY"
    );

    await createQuestionWithOptions(
      quant.id,
      "The average of 5 consecutive numbers is 20. What is the largest of these numbers?",
      [
        { code: "A", text: "20" },
        { code: "B", text: "21" },
        { code: "C", text: "22" },
        { code: "D", text: "24" },
      ],
      "C",
      "Let the numbers be x-2, x-1, x, x+1, x+2. Their average is x. So x = 20. The largest number is x+2 = 22.",
      "MEDIUM"
    );

    // 7. Seed GK questions
    await createQuestionWithOptions(
      gk.id,
      "Which planet is known as the Red Planet?",
      [
        { code: "A", text: "Venus" },
        { code: "B", text: "Mars" },
        { code: "C", text: "Jupiter" },
        { code: "D", text: "Saturn" },
      ],
      "B",
      "Mars is known as the Red Planet due to iron oxide (rust) on its surface, giving it a reddish appearance.",
      "EASY"
    );

    await createQuestionWithOptions(
      gk.id,
      "Who was the first President of India?",
      [
        { code: "A", text: "Dr. B.R. Ambedkar" },
        { code: "B", text: "Jawaharlal Nehru" },
        { code: "C", text: "Dr. Rajendra Prasad" },
        { code: "D", text: "Sardar Vallabhbhai Patel" },
      ],
      "C",
      "Dr. Rajendra Prasad served as the first President of Independent India from 1950 to 1962.",
      "EASY"
    );

    await createQuestionWithOptions(
      gk.id,
      "Which is the largest ocean on Earth?",
      [
        { code: "A", text: "Atlantic Ocean" },
        { code: "B", text: "Indian Ocean" },
        { code: "C", text: "Pacific Ocean" },
        { code: "D", text: "Arctic Ocean" },
      ],
      "C",
      "The Pacific Ocean is the largest and deepest of Earth's oceanic divisions.",
      "EASY"
    );

    await createQuestionWithOptions(
      gk.id,
      "What is the chemical formula for common kitchen salt?",
      [
        { code: "A", text: "NaCl" },
        { code: "B", text: "HCl" },
        { code: "C", text: "H2O" },
        { code: "D", text: "NaOH" },
      ],
      "A",
      "Common table salt is Sodium Chloride, represented chemically as NaCl.",
      "EASY"
    );

    await createQuestionWithOptions(
      gk.id,
      "In which year did World War II end?",
      [
        { code: "A", text: "1918" },
        { code: "B", text: "1939" },
        { code: "C", text: "1943" },
        { code: "D", text: "1945" },
      ],
      "D",
      "World War II ended in 1945 with the official surrender of Japan on September 2, 1945.",
      "EASY"
    );

    // 8. Seed Reasoning questions
    await createQuestionWithOptions(
      reasoning.id,
      "If CAT is coded as 24, how is DOG coded?",
      [
        { code: "A", text: "22" },
        { code: "B", text: "26" },
        { code: "C", text: "28" },
        { code: "D", text: "30" },
      ],
      "B",
      "C=3, A=1, T=20 => 3+1+20 = 24. For DOG: D=4, O=15, G=7 => 4+15+7 = 26.",
      "EASY"
    );

    await createQuestionWithOptions(
      reasoning.id,
      "Which number should replace the question mark? 2, 6, 12, 20, 30, ?",
      [
        { code: "A", text: "40" },
        { code: "B", text: "42" },
        { code: "C", text: "44" },
        { code: "D", text: "46" },
      ],
      "B",
      "The differences are +4, +6, +8, +10. The next difference should be +12: 30 + 12 = 42.",
      "EASY"
    );

    await createQuestionWithOptions(
      reasoning.id,
      "Pointing to a photograph, a man said, 'I have no brother or sister but that man's father is my father's son.' Whose photograph was it?",
      [
        { code: "A", text: "His own" },
        { code: "B", text: "His son's" },
        { code: "C", text: "His father's" },
        { code: "D", text: "His nephew's" },
      ],
      "B",
      "'My father's son' with no brothers/sisters means himself. So 'that man's father is myself'. Therefore, the photograph is of his son.",
      "HARD"
    );

    return NextResponse.json({
      message: "Database seeded successfully",
      users: {
        admin: "admin@test.com / admin123",
        candidate: "candidate@test.com / candidate123",
      },
      subjects: ["English", "Quantitative Aptitude", "General Knowledge", "Reasoning"],
      questionsCount: 20,
    });
  } catch (error: any) {
    console.error("Seeding error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
