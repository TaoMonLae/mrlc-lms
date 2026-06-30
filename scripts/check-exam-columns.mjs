// Dumps the actual columns of the core exam tables so we can spot any that the
// code expects but the database is missing. Run: npx tsx scripts/check-exam-columns.mjs
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const tables = ['Exam', 'Question', 'ExamAttempt', 'ExamAnswer', 'ExamResultPolicy', 'ExamAssignment', 'ExamSection'];

for (const t of tables) {
  const cols = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 ORDER BY column_name;`, t,
  );
  console.log(`\n=== ${t} (${cols.length} cols) ===`);
  console.log(cols.map((c) => c.column_name).join(', '));
}

// Also do the exact query the failing endpoint runs, and report any error verbatim.
console.log('\n=== Live test: prisma.exam.findFirst with question select ===');
try {
  await prisma.exam.findFirst({
    include: {
      class: true, subject: true,
      questions: { select: { id: true, text: true, type: true, points: true, options: true, correctAnswer: true, passageText: true, explanation: true, imageUrl: true, examId: true, createdAt: true, updatedAt: true } },
      attempts: { include: { student: { include: { user: true } } } },
    },
  });
  console.log('OK — query succeeded, no missing columns.');
} catch (e) {
  console.log('FAILED:', e?.code || '', e?.message?.split('\n')[0] || e);
  if (e?.meta) console.log('meta:', JSON.stringify(e.meta));
}

await prisma.$disconnect();
await pool.end();
