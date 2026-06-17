-- AlterEnum
ALTER TYPE "CasePriority" ADD VALUE 'URGENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuestionType" ADD VALUE 'MCQ';
ALTER TYPE "QuestionType" ADD VALUE 'WRITTEN';
ALTER TYPE "QuestionType" ADD VALUE 'GED_RLA_PASSAGE';
ALTER TYPE "QuestionType" ADD VALUE 'GED_MATH';
ALTER TYPE "QuestionType" ADD VALUE 'GED_SCIENCE';
ALTER TYPE "QuestionType" ADD VALUE 'GED_SOCIAL_STUDIES';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'STAFF';
ALTER TYPE "Role" ADD VALUE 'ACCOUNTANT';
ALTER TYPE "Role" ADD VALUE 'CASE_WORKER';
