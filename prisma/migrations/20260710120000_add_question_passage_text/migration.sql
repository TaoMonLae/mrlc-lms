-- AlterTable
-- `Question.passageText` was added to prisma/schema.prisma but never captured
-- in a migration file, so `prisma migrate deploy` reported "up to date" while
-- the live database was still missing the column (P2022 on Question.create).
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "passageText" TEXT;
