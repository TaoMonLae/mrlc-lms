-- Deck sharing/cloning between teachers, plus optional images on cards.
ALTER TABLE "FlashcardDeck" ADD COLUMN "shared" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FlashcardCard" ADD COLUMN "imageUrl" TEXT;
