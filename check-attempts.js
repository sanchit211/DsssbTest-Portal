const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const attempts = await prisma.examAttempt.findMany({
    include: {
      exam: true,
      user: true,
    },
    orderBy: { startTime: 'desc' },
  });
  console.log('--- ALL ATTEMPTS ---');
  console.log(attempts.map(a => ({
    id: a.id,
    userEmail: a.user.email,
    examName: a.exam.name,
    startTime: a.startTime,
    submittedAt: a.submittedAt,
    status: a.status,
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
