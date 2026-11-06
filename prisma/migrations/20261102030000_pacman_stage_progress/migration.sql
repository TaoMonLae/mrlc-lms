CREATE TABLE "PacmanStageProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameMode" TEXT NOT NULL,
    "highestLevel" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PacmanStageProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PacmanStageProgress_userId_gameMode_key" ON "PacmanStageProgress"("userId", "gameMode");
CREATE INDEX "PacmanStageProgress_userId_idx" ON "PacmanStageProgress"("userId");

ALTER TABLE "PacmanStageProgress"
ADD CONSTRAINT "PacmanStageProgress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
