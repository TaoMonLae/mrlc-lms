-- Conversation-based chat. NON-DESTRUCTIVE / idempotent. Legacy Message tables
-- are left untouched.

DO $$ BEGIN CREATE TYPE "ConversationType" AS ENUM ('DIRECT','GROUP','CLASS_CHANNEL'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ChatReportStatus" AS ENUM ('OPEN','REVIEWED','ACTIONED','DISMISSED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "Conversation" (
  "id"            TEXT NOT NULL,
  "type"          "ConversationType" NOT NULL DEFAULT 'DIRECT',
  "title"         TEXT,
  "classId"       TEXT,
  "createdById"   TEXT NOT NULL,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Conversation_classId_idx" ON "Conversation"("classId");
CREATE INDEX IF NOT EXISTS "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

CREATE TABLE IF NOT EXISTS "ConversationParticipant" (
  "id"             TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "lastReadAt"     TIMESTAMP(3),
  "isMuted"        BOOLEAN NOT NULL DEFAULT false,
  "leftAt"         TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId","userId");
CREATE INDEX IF NOT EXISTS "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

CREATE TABLE IF NOT EXISTS "ChatMessage" (
  "id"             TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId"       TEXT NOT NULL,
  "body"           TEXT NOT NULL,
  "attachmentUrl"  TEXT,
  "deletedAt"      TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId","createdAt");
CREATE INDEX IF NOT EXISTS "ChatMessage_senderId_idx" ON "ChatMessage"("senderId");

CREATE TABLE IF NOT EXISTS "ChatMessageReport" (
  "id"           TEXT NOT NULL,
  "messageId"    TEXT NOT NULL,
  "reportedById" TEXT NOT NULL,
  "reason"       TEXT,
  "status"       "ChatReportStatus" NOT NULL DEFAULT 'OPEN',
  "reviewedById" TEXT,
  "reviewedAt"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessageReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ChatMessageReport_status_idx" ON "ChatMessageReport"("status");
CREATE INDEX IF NOT EXISTS "ChatMessageReport_messageId_idx" ON "ChatMessageReport"("messageId");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ChatMessageReport" ADD CONSTRAINT "ChatMessageReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
