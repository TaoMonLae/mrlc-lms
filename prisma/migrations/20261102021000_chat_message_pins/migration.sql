ALTER TABLE "ChatMessage" ADD COLUMN "pinnedAt" TIMESTAMP(3);
ALTER TABLE "ChatMessage" ADD COLUMN "pinnedById" TEXT;
CREATE INDEX "ChatMessage_conversationId_pinnedAt_idx" ON "ChatMessage"("conversationId", "pinnedAt");
