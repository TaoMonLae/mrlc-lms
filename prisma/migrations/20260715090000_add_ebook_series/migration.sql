ALTER TABLE "Ebook"
ADD COLUMN "seriesName" TEXT,
ADD COLUMN "seriesNumber" INTEGER;

CREATE INDEX "Ebook_seriesName_seriesNumber_idx" ON "Ebook"("seriesName", "seriesNumber");
