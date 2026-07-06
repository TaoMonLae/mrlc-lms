-- Flashcards feature: teacher-authored study decks assigned to classes.
CREATE TABLE "FlashcardDeck" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardDeck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FlashcardCard" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashcardCard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FlashcardDeckClass" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "FlashcardDeckClass_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FlashcardDeck_teacherId_idx" ON "FlashcardDeck"("teacherId");
CREATE INDEX "FlashcardCard_deckId_idx" ON "FlashcardCard"("deckId");
CREATE INDEX "FlashcardDeckClass_classId_idx" ON "FlashcardDeckClass"("classId");
CREATE UNIQUE INDEX "FlashcardDeckClass_deckId_classId_key" ON "FlashcardDeckClass"("deckId", "classId");

ALTER TABLE "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FlashcardCard" ADD CONSTRAINT "FlashcardCard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "FlashcardDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlashcardDeckClass" ADD CONSTRAINT "FlashcardDeckClass_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "FlashcardDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlashcardDeckClass" ADD CONSTRAINT "FlashcardDeckClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
