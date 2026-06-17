-- CreateTable
CREATE TABLE "Ebook" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "description" TEXT,
    "category" TEXT,
    "language" TEXT,
    "coverUrl" TEXT,
    "format" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT,
    "fileSize" INTEGER,
    "visibility" TEXT NOT NULL DEFAULT 'ALL',
    "downloadAllowed" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" TEXT,
    "uploadedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ebook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ebook_title_idx" ON "Ebook"("title");

-- CreateIndex
CREATE INDEX "Ebook_author_idx" ON "Ebook"("author");

-- CreateIndex
CREATE INDEX "Ebook_category_idx" ON "Ebook"("category");

-- CreateIndex
CREATE INDEX "Ebook_format_idx" ON "Ebook"("format");
