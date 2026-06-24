-- CreateEnum
CREATE TYPE "GradeCategoryType" AS ENUM ('ASSIGNMENT', 'QUIZ', 'MIDTERM', 'FINAL', 'MOCK_GED');

-- CreateEnum
CREATE TYPE "GedSubjectArea" AS ENUM ('RLA', 'MATH', 'SCIENCE', 'SOCIAL_STUDIES');

-- CreateEnum
CREATE TYPE "GedReadinessStatus" AS ENUM ('NOT_READY', 'DEVELOPING', 'NEAR_READY', 'READY', 'TEST_SCHEDULED', 'PASSED');

-- CreateTable
CREATE TABLE "GradeItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "GradeCategoryType" NOT NULL,
    "maxMarks" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "gradeItemId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "marks" DOUBLE PRECISION,
    "comment" TEXT,
    "gradedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryWeight" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "category" "GradeCategoryType" NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GedReadiness" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subject" "GedSubjectArea" NOT NULL,
    "status" "GedReadinessStatus" NOT NULL DEFAULT 'NOT_READY',
    "note" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GedReadiness_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradeItem_classId_idx" ON "GradeItem"("classId");
CREATE INDEX "GradeItem_subjectId_idx" ON "GradeItem"("subjectId");
CREATE INDEX "GradeItem_category_idx" ON "GradeItem"("category");
CREATE INDEX "Grade_studentId_idx" ON "Grade"("studentId");
CREATE UNIQUE INDEX "Grade_gradeItemId_studentId_key" ON "Grade"("gradeItemId", "studentId");
CREATE INDEX "CategoryWeight_classId_idx" ON "CategoryWeight"("classId");
CREATE UNIQUE INDEX "CategoryWeight_classId_category_key" ON "CategoryWeight"("classId", "category");
CREATE INDEX "GedReadiness_studentId_idx" ON "GedReadiness"("studentId");
CREATE UNIQUE INDEX "GedReadiness_studentId_subject_key" ON "GedReadiness"("studentId", "subject");

-- AddForeignKey
ALTER TABLE "GradeItem" ADD CONSTRAINT "GradeItem_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GradeItem" ADD CONSTRAINT "GradeItem_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_gradeItemId_fkey" FOREIGN KEY ("gradeItemId") REFERENCES "GradeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CategoryWeight" ADD CONSTRAINT "CategoryWeight_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GedReadiness" ADD CONSTRAINT "GedReadiness_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
