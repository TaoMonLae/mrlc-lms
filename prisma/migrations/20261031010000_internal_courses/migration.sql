CREATE TABLE "Course" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "draft" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'PUBLISHED', 'ARCHIVED')),
  "revision" INTEGER NOT NULL DEFAULT 1,
  "reviewNote" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Course_ownerId_updatedAt_idx" ON "Course"("ownerId", "updatedAt");
CREATE INDEX "Course_status_idx" ON "Course"("status");
CREATE TABLE "CourseVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "courseId" TEXT NOT NULL REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "number" INTEGER NOT NULL,
  "syllabus" JSONB NOT NULL,
  "publishedById" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "CourseVersion_courseId_number_key" ON "CourseVersion"("courseId", "number");
CREATE TABLE "CourseEnrollment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "versionId" TEXT NOT NULL REFERENCES "CourseVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "assignedById" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "CourseEnrollment_versionId_studentId_key" ON "CourseEnrollment"("versionId", "studentId");
CREATE INDEX "CourseEnrollment_studentId_classId_idx" ON "CourseEnrollment"("studentId", "classId");
CREATE INDEX "CourseEnrollment_classId_idx" ON "CourseEnrollment"("classId");
CREATE TABLE "CourseItemProgress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "enrollmentId" TEXT NOT NULL REFERENCES "CourseEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "itemId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "CourseItemProgress_enrollmentId_itemId_key" ON "CourseItemProgress"("enrollmentId", "itemId");
