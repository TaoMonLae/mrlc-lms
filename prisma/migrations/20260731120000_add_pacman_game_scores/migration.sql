-- Create PacmanGameScore table (school-wide Pac-Man leaderboard)
CREATE TABLE "PacmanGameScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "gameMode" TEXT NOT NULL DEFAULT 'CLASSIC',
    "highScore" BOOLEAN NOT NULL DEFAULT false,
    "deviceInfo" JSONB,
    "ipAddress" TEXT,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PacmanGameScore_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "PacmanGameScore_userId_idx" ON "PacmanGameScore"("userId");
CREATE INDEX "PacmanGameScore_score_idx" ON "PacmanGameScore"("score");
CREATE INDEX "PacmanGameScore_gameMode_idx" ON "PacmanGameScore"("gameMode");
CREATE INDEX "PacmanGameScore_playedAt_idx" ON "PacmanGameScore"("playedAt");

-- Foreign keys
ALTER TABLE "PacmanGameScore"
ADD CONSTRAINT "PacmanGameScore_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMENT ON TABLE "PacmanGameScore" IS 'Pac-Man arcade scores tied to a real User account, powering a school-wide (not class-scoped) leaderboard.';
