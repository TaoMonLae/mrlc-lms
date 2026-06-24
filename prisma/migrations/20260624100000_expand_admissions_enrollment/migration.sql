-- Expand the existing lightweight admissions table into the full admissions workflow.
ALTER TABLE "AdmissionApplication"
  ADD COLUMN IF NOT EXISTS "applicationNo" TEXT,
  ADD COLUMN IF NOT EXISTS "preferredName" TEXT,
  ADD COLUMN IF NOT EXISTS "email" TEXT,
  ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "gender" TEXT,
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "targetClassId" TEXT,
  ADD COLUMN IF NOT EXISTS "previousSchool" TEXT,
  ADD COLUMN IF NOT EXISTS "previousEducationLevel" TEXT,
  ADD COLUMN IF NOT EXISTS "previousEducationNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "guardianRelationship" TEXT,
  ADD COLUMN IF NOT EXISTS "guardianPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "guardianEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyContactRelationship" TEXT,
  ADD COLUMN IF NOT EXISTS "identityType" TEXT,
  ADD COLUMN IF NOT EXISTS "identityNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "legalDocumentationStatus" TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "boardingType" TEXT DEFAULT 'DAY',
  ADD COLUMN IF NOT EXISTS "medicalInformation" TEXT,
  ADD COLUMN IF NOT EXISTS "allergies" TEXT,
  ADD COLUMN IF NOT EXISTS "medicationNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "interviewAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "interviewMode" TEXT,
  ADD COLUMN IF NOT EXISTS "interviewLocation" TEXT,
  ADD COLUMN IF NOT EXISTS "interviewNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "decisionAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "decisionById" TEXT,
  ADD COLUMN IF NOT EXISTS "decisionByName" TEXT,
  ADD COLUMN IF NOT EXISTS "decisionNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "convertedStudentId" TEXT,
  ADD COLUMN IF NOT EXISTS "convertedUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "createdById" TEXT,
  ADD COLUMN IF NOT EXISTS "createdByName" TEXT;

UPDATE "AdmissionApplication"
SET
  "guardianPhone" = COALESCE("guardianPhone", "contactNumber"),
  "status" = CASE
    WHEN "status" = 'NEW' THEN 'SUBMITTED'
    WHEN "status" = 'REVIEWING' THEN 'UNDER_REVIEW'
    WHEN "status" = 'ACCEPTED' THEN 'APPROVED'
    ELSE "status"
  END
WHERE "status" IN ('NEW', 'REVIEWING', 'ACCEPTED');

CREATE UNIQUE INDEX IF NOT EXISTS "AdmissionApplication_applicationNo_key" ON "AdmissionApplication"("applicationNo");
CREATE INDEX IF NOT EXISTS "AdmissionApplication_applicationNo_idx" ON "AdmissionApplication"("applicationNo");
CREATE INDEX IF NOT EXISTS "AdmissionApplication_targetClassId_idx" ON "AdmissionApplication"("targetClassId");
CREATE INDEX IF NOT EXISTS "AdmissionApplication_convertedStudentId_idx" ON "AdmissionApplication"("convertedStudentId");

CREATE TABLE IF NOT EXISTS "AdmissionDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'OTHER',
    "checklistStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "notes" TEXT,
    "uploadedById" TEXT,
    "uploadedByName" TEXT,
    "verifiedById" TEXT,
    "verifiedByName" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionDocument_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AdmissionDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "AdmissionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AdmissionDocument_applicationId_idx" ON "AdmissionDocument"("applicationId");
CREATE INDEX IF NOT EXISTS "AdmissionDocument_documentType_idx" ON "AdmissionDocument"("documentType");
CREATE INDEX IF NOT EXISTS "AdmissionDocument_checklistStatus_idx" ON "AdmissionDocument"("checklistStatus");

CREATE TABLE IF NOT EXISTS "AdmissionTimelineEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdmissionTimelineEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AdmissionTimelineEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "AdmissionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AdmissionTimelineEvent_applicationId_idx" ON "AdmissionTimelineEvent"("applicationId");
CREATE INDEX IF NOT EXISTS "AdmissionTimelineEvent_eventType_idx" ON "AdmissionTimelineEvent"("eventType");
