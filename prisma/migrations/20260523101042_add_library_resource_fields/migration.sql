-- AlterTable
ALTER TABLE "LibraryResource" ADD COLUMN     "classId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "subjectId" TEXT,
ADD COLUMN     "visibility" TEXT DEFAULT 'ALL';
