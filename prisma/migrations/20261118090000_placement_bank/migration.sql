ALTER TABLE "PlacementTestSubmission" ADD COLUMN "formVersionId" TEXT;

CREATE TABLE "PlacementForm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementForm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlacementBankPassage" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementBankPassage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlacementBankQuestion" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "band" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "passageId" TEXT,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "answer" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementBankQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlacementFormVersion" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedById" TEXT,
    "publishedByName" TEXT,

    CONSTRAINT "PlacementFormVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlacementSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "closedMessage" TEXT,
    "timeLimitMinutes" INTEGER NOT NULL DEFAULT 90,
    "foundationMastery" INTEGER NOT NULL DEFAULT 60,
    "preGedMastery" INTEGER NOT NULL DEFAULT 60,
    "gedMastery" INTEGER NOT NULL DEFAULT 60,
    "retakeWaitDays" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByName" TEXT,

    CONSTRAINT "PlacementSettings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlacementBankPassage_formId_idx" ON "PlacementBankPassage"("formId");
CREATE INDEX "PlacementBankQuestion_formId_section_idx" ON "PlacementBankQuestion"("formId", "section");
CREATE UNIQUE INDEX "PlacementFormVersion_formId_version_key" ON "PlacementFormVersion"("formId", "version");
CREATE INDEX "PlacementFormVersion_formId_idx" ON "PlacementFormVersion"("formId");
