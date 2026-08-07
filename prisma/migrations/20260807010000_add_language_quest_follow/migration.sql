-- One-way "follow" relation between two users, powering the Follow button on
-- the global Language Quest leaderboard. A mutual follow is treated as a
-- "friend" at read time, so no separate friendship table is needed.
CREATE TABLE "LanguageQuestFollow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LanguageQuestFollow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LanguageQuestFollow_followerId_followingId_key" ON "LanguageQuestFollow"("followerId", "followingId");
CREATE INDEX "LanguageQuestFollow_followerId_idx" ON "LanguageQuestFollow"("followerId");
CREATE INDEX "LanguageQuestFollow_followingId_idx" ON "LanguageQuestFollow"("followingId");

ALTER TABLE "LanguageQuestFollow" ADD CONSTRAINT "LanguageQuestFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LanguageQuestFollow" ADD CONSTRAINT "LanguageQuestFollow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
