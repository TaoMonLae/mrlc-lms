-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('REPORT_CARD', 'TRANSCRIPT', 'ENROLLMENT_CONFIRMATION', 'COMPLETION_CERTIFICATE', 'PROGRESS_REPORT');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'REISSUED');

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "verifyToken" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "studentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "className" TEXT,
    "term" TEXT,
    "payload" JSONB,
    "issuedById" TEXT,
    "issuedByName" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reissuedFromId" TEXT,
    "cancelledReason" TEXT,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDocument_documentNumber_key" ON "GeneratedDocument"("documentNumber");
CREATE UNIQUE INDEX "GeneratedDocument_verifyToken_key" ON "GeneratedDocument"("verifyToken");
CREATE INDEX "GeneratedDocument_studentId_idx" ON "GeneratedDocument"("studentId");
CREATE INDEX "GeneratedDocument_type_idx" ON "GeneratedDocument"("type");
CREATE INDEX "GeneratedDocument_status_idx" ON "GeneratedDocument"("status");

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
