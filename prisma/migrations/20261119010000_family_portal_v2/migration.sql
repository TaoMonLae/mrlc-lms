ALTER TABLE "GuardianStudentLink" ADD COLUMN "learnerConsentScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "learnerConsentAt" TIMESTAMP(3),
ADD COLUMN "learnerConsentByName" TEXT,
ADD COLUMN "learnerConsentNote" TEXT;

ALTER TABLE "FamilyMessage" ADD COLUMN "guardianReadAt" TIMESTAMP(3);

CREATE TABLE "FamilyAbsenceNotice" (
    "id" TEXT NOT NULL,
    "guardianUserId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "staffNote" TEXT,
    "acknowledgedByName" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyAbsenceNotice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FamilyAbsenceNotice_guardianUserId_studentId_startDate_idx" ON "FamilyAbsenceNotice"("guardianUserId", "studentId", "startDate");

CREATE INDEX "FamilyAbsenceNotice_status_startDate_idx" ON "FamilyAbsenceNotice"("status", "startDate");

ALTER TABLE "FamilyAbsenceNotice" ADD CONSTRAINT "FamilyAbsenceNotice_guardianUserId_fkey" FOREIGN KEY ("guardianUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FamilyAbsenceNotice" ADD CONSTRAINT "FamilyAbsenceNotice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
