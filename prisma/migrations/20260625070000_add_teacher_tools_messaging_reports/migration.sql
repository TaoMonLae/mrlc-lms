ALTER TABLE "LibraryResource"
  ADD COLUMN IF NOT EXISTS "fileSize" INTEGER,
  ADD COLUMN IF NOT EXISTS "mimeType" TEXT,
  ADD COLUMN IF NOT EXISTS "downloadCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastDownloaded" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "subjectAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "gradeLevels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "uploadedById" TEXT,
  ADD COLUMN IF NOT EXISTS "uploadedByName" TEXT;

CREATE TABLE IF NOT EXISTS "Message" (
  "id" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "senderId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "MessageRecipient" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MessageRecipient_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MessageRecipient_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MessageRecipient_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SavedReport" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "reportType" TEXT NOT NULL,
  "filters" JSONB NOT NULL,
  "generatedById" TEXT NOT NULL,
  "generatedByName" TEXT,
  "lastGeneratedAt" TIMESTAMP(3),
  "generationCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReportGeneration" (
  "id" TEXT NOT NULL,
  "savedReportId" TEXT,
  "reportType" TEXT NOT NULL,
  "reportName" TEXT NOT NULL,
  "filters" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "fileUrl" TEXT,
  "fileSize" INTEGER,
  "generatedById" TEXT NOT NULL,
  "generatedByName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReportGeneration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReportGeneration_savedReportId_fkey" FOREIGN KEY ("savedReportId") REFERENCES "SavedReport"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "LessonPlan" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "classId" TEXT NOT NULL,
  "subjectId" TEXT,
  "plannedDate" TIMESTAMP(3) NOT NULL,
  "duration" INTEGER NOT NULL DEFAULT 60,
  "room" TEXT,
  "objectives" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "materials" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "activities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "assessment" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "teacherId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LessonPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LessonPlan_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LessonPlan_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "LessonPlan_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "LessonPlanProgress" (
  "id" TEXT NOT NULL,
  "lessonPlanId" TEXT NOT NULL,
  "week" INTEGER NOT NULL,
  "topicsCovered" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LessonPlanProgress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LessonPlanProgress_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "LessonPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX IF NOT EXISTS "Message_sentAt_idx" ON "Message"("sentAt");
CREATE UNIQUE INDEX IF NOT EXISTS "MessageRecipient_messageId_recipientId_key" ON "MessageRecipient"("messageId", "recipientId");
CREATE INDEX IF NOT EXISTS "MessageRecipient_messageId_idx" ON "MessageRecipient"("messageId");
CREATE INDEX IF NOT EXISTS "MessageRecipient_recipientId_idx" ON "MessageRecipient"("recipientId");
CREATE INDEX IF NOT EXISTS "MessageRecipient_readAt_idx" ON "MessageRecipient"("readAt");
CREATE INDEX IF NOT EXISTS "SavedReport_reportType_idx" ON "SavedReport"("reportType");
CREATE INDEX IF NOT EXISTS "SavedReport_generatedById_idx" ON "SavedReport"("generatedById");
CREATE INDEX IF NOT EXISTS "ReportGeneration_savedReportId_idx" ON "ReportGeneration"("savedReportId");
CREATE INDEX IF NOT EXISTS "ReportGeneration_reportType_idx" ON "ReportGeneration"("reportType");
CREATE INDEX IF NOT EXISTS "ReportGeneration_generatedById_idx" ON "ReportGeneration"("generatedById");
CREATE INDEX IF NOT EXISTS "ReportGeneration_status_idx" ON "ReportGeneration"("status");
CREATE INDEX IF NOT EXISTS "ReportGeneration_createdAt_idx" ON "ReportGeneration"("createdAt");
CREATE INDEX IF NOT EXISTS "LessonPlan_classId_idx" ON "LessonPlan"("classId");
CREATE INDEX IF NOT EXISTS "LessonPlan_subjectId_idx" ON "LessonPlan"("subjectId");
CREATE INDEX IF NOT EXISTS "LessonPlan_teacherId_idx" ON "LessonPlan"("teacherId");
CREATE INDEX IF NOT EXISTS "LessonPlan_plannedDate_idx" ON "LessonPlan"("plannedDate");
CREATE INDEX IF NOT EXISTS "LessonPlan_status_idx" ON "LessonPlan"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "LessonPlanProgress_lessonPlanId_week_key" ON "LessonPlanProgress"("lessonPlanId", "week");
CREATE INDEX IF NOT EXISTS "LessonPlanProgress_lessonPlanId_idx" ON "LessonPlanProgress"("lessonPlanId");
CREATE INDEX IF NOT EXISTS "LessonPlanProgress_week_idx" ON "LessonPlanProgress"("week");
