-- Native Language Quest courses, curriculum, learner progress, and leaderboard.

CREATE TABLE "LanguageQuestCourse" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "language" TEXT NOT NULL,
    "imageEmoji" TEXT NOT NULL DEFAULT '🌍',
    "accentColor" TEXT NOT NULL DEFAULT '#7c3aed',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LanguageQuestCourse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LanguageQuestUnit" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LanguageQuestUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LanguageQuestLesson" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LanguageQuestLesson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LanguageQuestChallenge" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SELECT',
    "question" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LanguageQuestChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LanguageQuestOption" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL DEFAULT false,
    "emoji" TEXT,
    "audioText" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LanguageQuestOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LanguageQuestUserProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activeCourseId" TEXT,
    "hearts" INTEGER NOT NULL DEFAULT 5,
    "points" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LanguageQuestUserProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LanguageQuestChallengeProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correctAttempts" INTEGER NOT NULL DEFAULT 0,
    "wrongAttempts" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LanguageQuestChallengeProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LanguageQuestCourse_code_key" ON "LanguageQuestCourse"("code");
CREATE INDEX "LanguageQuestCourse_published_idx" ON "LanguageQuestCourse"("published");
CREATE INDEX "LanguageQuestCourse_createdById_idx" ON "LanguageQuestCourse"("createdById");
CREATE UNIQUE INDEX "LanguageQuestUnit_courseId_order_key" ON "LanguageQuestUnit"("courseId", "order");
CREATE INDEX "LanguageQuestUnit_courseId_idx" ON "LanguageQuestUnit"("courseId");
CREATE UNIQUE INDEX "LanguageQuestLesson_unitId_order_key" ON "LanguageQuestLesson"("unitId", "order");
CREATE INDEX "LanguageQuestLesson_unitId_idx" ON "LanguageQuestLesson"("unitId");
CREATE UNIQUE INDEX "LanguageQuestChallenge_lessonId_order_key" ON "LanguageQuestChallenge"("lessonId", "order");
CREATE INDEX "LanguageQuestChallenge_lessonId_idx" ON "LanguageQuestChallenge"("lessonId");
CREATE UNIQUE INDEX "LanguageQuestOption_challengeId_order_key" ON "LanguageQuestOption"("challengeId", "order");
CREATE INDEX "LanguageQuestOption_challengeId_idx" ON "LanguageQuestOption"("challengeId");
CREATE UNIQUE INDEX "LanguageQuestUserProgress_userId_key" ON "LanguageQuestUserProgress"("userId");
CREATE INDEX "LanguageQuestUserProgress_points_idx" ON "LanguageQuestUserProgress"("points");
CREATE INDEX "LanguageQuestUserProgress_activeCourseId_idx" ON "LanguageQuestUserProgress"("activeCourseId");
CREATE UNIQUE INDEX "LanguageQuestChallengeProgress_userId_challengeId_key" ON "LanguageQuestChallengeProgress"("userId", "challengeId");
CREATE INDEX "LanguageQuestChallengeProgress_userId_idx" ON "LanguageQuestChallengeProgress"("userId");
CREATE INDEX "LanguageQuestChallengeProgress_challengeId_idx" ON "LanguageQuestChallengeProgress"("challengeId");
CREATE INDEX "LanguageQuestChallengeProgress_completed_idx" ON "LanguageQuestChallengeProgress"("completed");

ALTER TABLE "LanguageQuestUnit" ADD CONSTRAINT "LanguageQuestUnit_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LanguageQuestCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LanguageQuestLesson" ADD CONSTRAINT "LanguageQuestLesson_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "LanguageQuestUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LanguageQuestChallenge" ADD CONSTRAINT "LanguageQuestChallenge_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LanguageQuestLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LanguageQuestOption" ADD CONSTRAINT "LanguageQuestOption_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "LanguageQuestChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LanguageQuestUserProgress" ADD CONSTRAINT "LanguageQuestUserProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LanguageQuestUserProgress" ADD CONSTRAINT "LanguageQuestUserProgress_activeCourseId_fkey" FOREIGN KEY ("activeCourseId") REFERENCES "LanguageQuestCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LanguageQuestChallengeProgress" ADD CONSTRAINT "LanguageQuestChallengeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LanguageQuestChallengeProgress" ADD CONSTRAINT "LanguageQuestChallengeProgress_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "LanguageQuestChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
