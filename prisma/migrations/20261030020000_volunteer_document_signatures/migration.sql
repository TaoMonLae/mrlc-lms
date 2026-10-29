ALTER TABLE "SchoolProfile" ADD COLUMN "schoolChopDataUrl" TEXT;
ALTER TABLE "VolunteerDocument" ADD COLUMN "signatoryUserId" TEXT,
  ADD COLUMN "organizationSignatoryUserId" TEXT;

CREATE TABLE "VolunteerDocumentSignature" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "slot" TEXT NOT NULL CHECK ("slot" IN ('SCHOOL', 'ORGANIZATION')),
  "signerUserId" TEXT NOT NULL,
  "signerName" TEXT NOT NULL,
  "signerTitle" TEXT NOT NULL,
  "imageDataUrl" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VolunteerDocumentSignature_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VolunteerDocumentSignature_documentId_fkey" FOREIGN KEY ("documentId")
    REFERENCES "VolunteerDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "VolunteerDocumentSignature_documentId_slot_key" ON "VolunteerDocumentSignature"("documentId", "slot");
CREATE INDEX "VolunteerDocumentSignature_signerUserId_idx" ON "VolunteerDocumentSignature"("signerUserId");
CREATE INDEX "VolunteerDocument_signatoryUserId_createdAt_idx" ON "VolunteerDocument"("signatoryUserId", "createdAt");
CREATE INDEX "VolunteerDocument_organizationSignatoryUserId_createdAt_idx" ON "VolunteerDocument"("organizationSignatoryUserId", "createdAt");
