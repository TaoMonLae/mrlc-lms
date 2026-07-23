-- CreateTable
CREATE TABLE "GameControlPolicy" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "gameKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "dailyLimitMinutes" INTEGER,
    "sessionLimitMinutes" INTEGER,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 0,
    "allowedDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "allowedStartMinute" INTEGER,
    "allowedEndMinute" INTEGER,
    "note" TEXT,
    "managedByRole" "Role" NOT NULL,
    "classId" TEXT,
    "studentId" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameControlPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePlaySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "consumedSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamePlaySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameDailyUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameKey" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "seconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameDailyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameControlPolicy_scopeKey_gameKey_key" ON "GameControlPolicy"("scopeKey", "gameKey");

-- CreateIndex
CREATE INDEX "GameControlPolicy_classId_idx" ON "GameControlPolicy"("classId");

-- CreateIndex
CREATE INDEX "GameControlPolicy_studentId_idx" ON "GameControlPolicy"("studentId");

-- CreateIndex
CREATE INDEX "GameControlPolicy_gameKey_enabled_idx" ON "GameControlPolicy"("gameKey", "enabled");

-- CreateIndex
CREATE INDEX "GamePlaySession_userId_status_idx" ON "GamePlaySession"("userId", "status");

-- CreateIndex
CREATE INDEX "GamePlaySession_userId_gameKey_startedAt_idx" ON "GamePlaySession"("userId", "gameKey", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameDailyUsage_userId_gameKey_dayKey_key" ON "GameDailyUsage"("userId", "gameKey", "dayKey");

-- CreateIndex
CREATE INDEX "GameDailyUsage_userId_dayKey_idx" ON "GameDailyUsage"("userId", "dayKey");

-- AddForeignKey
ALTER TABLE "GameControlPolicy" ADD CONSTRAINT "GameControlPolicy_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameControlPolicy" ADD CONSTRAINT "GameControlPolicy_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameControlPolicy" ADD CONSTRAINT "GameControlPolicy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameControlPolicy" ADD CONSTRAINT "GameControlPolicy_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlaySession" ADD CONSTRAINT "GamePlaySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameDailyUsage" ADD CONSTRAINT "GameDailyUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
