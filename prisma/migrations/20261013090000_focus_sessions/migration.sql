CREATE TABLE "FocusSession" (
    "id" TEXT NOT NULL,
    "authSessionId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "lastHeartbeatAt" TIMESTAMP(3),
    "isFocused" BOOLEAN NOT NULL DEFAULT true,
    "isFullscreen" BOOLEAN NOT NULL DEFAULT false,
    "releaseRequestedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FocusEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FocusEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FocusSession_authSessionId_key" ON "FocusSession"("authSessionId");
CREATE INDEX "FocusSession_studentUserId_startedAt_idx" ON "FocusSession"("studentUserId", "startedAt");
CREATE INDEX "FocusSession_endsAt_releasedAt_idx" ON "FocusSession"("endsAt", "releasedAt");
CREATE INDEX "FocusEvent_sessionId_createdAt_idx" ON "FocusEvent"("sessionId", "createdAt");
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FocusEvent" ADD CONSTRAINT "FocusEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FocusSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
