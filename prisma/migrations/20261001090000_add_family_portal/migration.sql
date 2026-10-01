ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'GUARDIAN';

CREATE TABLE "GuardianStudentLink" (
  "id" TEXT NOT NULL,
  "guardianUserId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GuardianStudentLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuardianStudentLink_guardianUserId_studentId_key" ON "GuardianStudentLink"("guardianUserId", "studentId");
CREATE INDEX "GuardianStudentLink_studentId_idx" ON "GuardianStudentLink"("studentId");
ALTER TABLE "GuardianStudentLink" ADD CONSTRAINT "GuardianStudentLink_guardianUserId_fkey" FOREIGN KEY ("guardianUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuardianStudentLink" ADD CONSTRAINT "GuardianStudentLink_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FamilyMessage" (
  "id" TEXT NOT NULL,
  "guardianUserId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "reply" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "repliedByName" TEXT,
  "repliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FamilyMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FamilyMessage_guardianUserId_studentId_createdAt_idx" ON "FamilyMessage"("guardianUserId", "studentId", "createdAt");
CREATE INDEX "FamilyMessage_status_createdAt_idx" ON "FamilyMessage"("status", "createdAt");
ALTER TABLE "FamilyMessage" ADD CONSTRAINT "FamilyMessage_guardianUserId_fkey" FOREIGN KEY ("guardianUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyMessage" ADD CONSTRAINT "FamilyMessage_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
