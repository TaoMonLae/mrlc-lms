ALTER TABLE "VideoProgress" ADD COLUMN "resumePosition" INTEGER;
CREATE TABLE "VideoLearning" (
  "videoId" TEXT PRIMARY KEY, "examId" TEXT, "homeworkId" TEXT,
  "requireQuiz" BOOLEAN NOT NULL DEFAULT false, "chapters" JSONB NOT NULL DEFAULT '[]',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VideoLearning_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "VideoLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "VideoPlaylist" (
  "id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
  "videoIds" TEXT[] NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "VideoPlaylist_ownerId_idx" ON "VideoPlaylist"("ownerId");
CREATE TABLE "VideoNote" (
  "id" TEXT PRIMARY KEY, "videoId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "seconds" INTEGER NOT NULL, "body" TEXT NOT NULL, "isQuestion" BOOLEAN NOT NULL DEFAULT false,
  "reply" TEXT, "repliedById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VideoNote_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "VideoLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "VideoNote_videoId_userId_idx" ON "VideoNote"("videoId", "userId");
