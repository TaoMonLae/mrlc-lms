-- Create SnakeGameScore table
CREATE TABLE "SnakeGameScore" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT,
    "className" TEXT,
    "score" INTEGER NOT NULL,
    "highScore" BOOLEAN NOT NULL DEFAULT false,
    "gameMode" TEXT NOT NULL DEFAULT 'CLASSIC',
    "speed" TEXT NOT NULL DEFAULT 'NORMAL',
    "gridSize" INTEGER NOT NULL DEFAULT 20,
    "gameDuration" INTEGER NOT NULL,
    "vocabularyWords" INTEGER NOT NULL DEFAULT 0,
    "wordsList" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "competitionId" TEXT,
    "rank" INTEGER,
    "deviceInfo" JSONB,
    "ipAddress" TEXT,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SnakeGameScore_pkey" PRIMARY KEY ("id")
);

-- Create SnakeCompetition table
CREATE TABLE "SnakeCompetition" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "classId" TEXT,
    "className" TEXT,
    "competitionType" TEXT NOT NULL DEFAULT 'WEEKLY',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "prizes" JSONB,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SnakeCompetition_pkey" PRIMARY KEY ("id")
);

-- Create indexes for SnakeGameScore
CREATE INDEX "SnakeGameScore_studentId_idx" ON "SnakeGameScore"("studentId");
CREATE INDEX "SnakeGameScore_classId_idx" ON "SnakeGameScore"("classId");
CREATE INDEX "SnakeGameScore_score_idx" ON "SnakeGameScore"("score");
CREATE INDEX "SnakeGameScore_gameMode_idx" ON "SnakeGameScore"("gameMode");
CREATE INDEX "SnakeGameScore_competitionId_idx" ON "SnakeGameScore"("competitionId");
CREATE INDEX "SnakeGameScore_playedAt_idx" ON "SnakeGameScore"("playedAt");

-- Create indexes for SnakeCompetition
CREATE INDEX "SnakeCompetition_classId_idx" ON "SnakeCompetition"("classId");
CREATE INDEX "SnakeCompetition_status_idx" ON "SnakeCompetition"("status");
CREATE INDEX "SnakeCompetition_startDate_idx" ON "SnakeCompetition"("startDate");
CREATE INDEX "SnakeCompetition_endDate_idx" ON "SnakeCompetition"("endDate");

-- Add foreign key constraints
ALTER TABLE "SnakeGameScore"
ADD CONSTRAINT "SnakeGameScore_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SnakeGameScore"
ADD CONSTRAINT "SnakeGameScore_competitionId_fkey"
FOREIGN KEY ("competitionId") REFERENCES "SnakeCompetition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE "SnakeGameScore" IS 'Stores snake game scores and achievements for students';
COMMENT ON TABLE "SnakeCompetition" IS 'Manages snake game competitions and tournaments between students/classes';
