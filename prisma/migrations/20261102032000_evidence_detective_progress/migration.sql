CREATE TABLE "EvidenceCaseProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "solvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EvidenceCaseProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EvidenceCaseProgress_userId_caseId_key" ON "EvidenceCaseProgress"("userId", "caseId");
CREATE INDEX "EvidenceCaseProgress_userId_solved_idx" ON "EvidenceCaseProgress"("userId", "solved");
ALTER TABLE "EvidenceCaseProgress" ADD CONSTRAINT "EvidenceCaseProgress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
