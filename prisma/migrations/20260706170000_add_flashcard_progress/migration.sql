-- Per-card mastery tracking and quiz/match/spelling attempt history for Flashcards.
CREATE TABLE "FlashcardCardMastery" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LEARNING',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardCardMastery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FlashcardAttempt" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashcardAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FlashcardCardMastery_studentId_cardId_key" ON "FlashcardCardMastery"("studentId", "cardId");
CREATE INDEX "FlashcardCardMastery_cardId_idx" ON "FlashcardCardMastery"("cardId");
CREATE INDEX "FlashcardAttempt_deckId_idx" ON "FlashcardAttempt"("deckId");
CREATE INDEX "FlashcardAttempt_studentId_idx" ON "FlashcardAttempt"("studentId");

ALTER TABLE "FlashcardCardMastery" ADD CONSTRAINT "FlashcardCardMastery_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlashcardCardMastery" ADD CONSTRAINT "FlashcardCardMastery_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "FlashcardCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlashcardAttempt" ADD CONSTRAINT "FlashcardAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlashcardAttempt" ADD CONSTRAINT "FlashcardAttempt_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "FlashcardDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
