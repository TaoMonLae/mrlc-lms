-- Earlier installations already have this table. Fresh databases need it before
-- the video learning workspace adds the resumePosition column.
CREATE TABLE IF NOT EXISTS "VideoProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "currentPosition" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "lastWatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VideoProgress_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "VideoLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "VideoProgress_userId_videoId_key" ON "VideoProgress"("userId", "videoId");
CREATE INDEX IF NOT EXISTS "VideoProgress_userId_idx" ON "VideoProgress"("userId");
CREATE INDEX IF NOT EXISTS "VideoProgress_videoId_idx" ON "VideoProgress"("videoId");
