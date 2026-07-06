-- Tracks the last time each user viewed the Social Space feed, so unread
-- activity (new posts/comments from other people) can be badged in the UI.
CREATE TABLE "SocialSeen" (
    "userId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialSeen_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "SocialSeen" ADD CONSTRAINT "SocialSeen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
