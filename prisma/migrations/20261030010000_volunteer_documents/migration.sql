CREATE TYPE "VolunteerDocumentType" AS ENUM ('VOLUNTEER_APPRECIATION_LETTER', 'VOLUNTEER_APPRECIATION_CERTIFICATE', 'PART_TIME_VOLUNTEER_CONFIRMATION');

CREATE TABLE "VolunteerDocument" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "verifyToken" TEXT NOT NULL,
    "type" "VolunteerDocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "recipientName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "fromMonth" TEXT NOT NULL,
    "toMonth" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "issuedById" TEXT NOT NULL,
    "issuedByName" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledReason" TEXT,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VolunteerDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VolunteerDocument_documentNumber_key" ON "VolunteerDocument"("documentNumber");
CREATE UNIQUE INDEX "VolunteerDocument_verifyToken_key" ON "VolunteerDocument"("verifyToken");
CREATE INDEX "VolunteerDocument_status_createdAt_idx" ON "VolunteerDocument"("status", "createdAt");
CREATE INDEX "VolunteerDocument_type_idx" ON "VolunteerDocument"("type");
