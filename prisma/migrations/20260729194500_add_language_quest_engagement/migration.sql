CREATE TABLE "LanguageQuestXpEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "points" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LanguageQuestXpEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LanguageQuestMasteryProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "lastReviewedAt" TIMESTAMP(3),
    "correctReviews" INTEGER NOT NULL DEFAULT 0,
    "wrongReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanguageQuestMasteryProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LanguageQuestMissionClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionKey" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "rewardXp" INTEGER NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LanguageQuestMissionClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LanguageQuestClassroomChallenge" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetXp" INTEGER NOT NULL,
    "rewardLabel" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanguageQuestClassroomChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LanguageQuestXpEvent_userId_occurredAt_idx" ON "LanguageQuestXpEvent"("userId", "occurredAt");
CREATE INDEX "LanguageQuestXpEvent_courseId_occurredAt_idx" ON "LanguageQuestXpEvent"("courseId", "occurredAt");
CREATE INDEX "LanguageQuestXpEvent_source_occurredAt_idx" ON "LanguageQuestXpEvent"("source", "occurredAt");
CREATE UNIQUE INDEX "LanguageQuestMasteryProgress_userId_challengeId_key" ON "LanguageQuestMasteryProgress"("userId", "challengeId");
CREATE INDEX "LanguageQuestMasteryProgress_userId_dueAt_idx" ON "LanguageQuestMasteryProgress"("userId", "dueAt");
CREATE INDEX "LanguageQuestMasteryProgress_challengeId_idx" ON "LanguageQuestMasteryProgress"("challengeId");
CREATE UNIQUE INDEX "LanguageQuestMissionClaim_userId_missionKey_periodKey_key" ON "LanguageQuestMissionClaim"("userId", "missionKey", "periodKey");
CREATE INDEX "LanguageQuestMissionClaim_userId_claimedAt_idx" ON "LanguageQuestMissionClaim"("userId", "claimedAt");
CREATE INDEX "LanguageQuestClassroomChallenge_classroomId_active_endsAt_idx" ON "LanguageQuestClassroomChallenge"("classroomId", "active", "endsAt");

ALTER TABLE "LanguageQuestXpEvent"
ADD CONSTRAINT "LanguageQuestXpEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LanguageQuestXpEvent"
ADD CONSTRAINT "LanguageQuestXpEvent_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "LanguageQuestCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LanguageQuestMasteryProgress"
ADD CONSTRAINT "LanguageQuestMasteryProgress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LanguageQuestMasteryProgress"
ADD CONSTRAINT "LanguageQuestMasteryProgress_challengeId_fkey"
FOREIGN KEY ("challengeId") REFERENCES "LanguageQuestChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LanguageQuestMissionClaim"
ADD CONSTRAINT "LanguageQuestMissionClaim_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LanguageQuestClassroomChallenge"
ADD CONSTRAINT "LanguageQuestClassroomChallenge_classroomId_fkey"
FOREIGN KEY ("classroomId") REFERENCES "LanguageQuestClassroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
