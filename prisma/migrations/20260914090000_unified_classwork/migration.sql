CREATE TABLE "ClassworkTopic" (
  "id" TEXT NOT NULL, "classId" TEXT NOT NULL, "title" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassworkTopic_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClassworkTopic_classId_title_key" ON "ClassworkTopic"("classId", "title");
ALTER TABLE "ClassworkTopic" ADD CONSTRAINT "ClassworkTopic_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ClassworkResource" (
  "id" TEXT NOT NULL, "classId" TEXT NOT NULL, "title" TEXT NOT NULL,
  "description" TEXT, "kind" TEXT NOT NULL, "url" TEXT NOT NULL,
  "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassworkResource_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClassworkResource_kind_check" CHECK ("kind" IN ('READING', 'ACTIVITY'))
);
CREATE INDEX "ClassworkResource_classId_idx" ON "ClassworkResource"("classId");
ALTER TABLE "ClassworkResource" ADD CONSTRAINT "ClassworkResource_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ClassworkPlacement" (
  "id" TEXT NOT NULL, "classId" TEXT NOT NULL, "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL, "topicId" TEXT, "pinned" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "ClassworkPlacement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClassworkPlacement_sourceType_check" CHECK ("sourceType" IN ('HOMEWORK', 'EXAM', 'RESOURCE'))
);
CREATE UNIQUE INDEX "ClassworkPlacement_classId_sourceType_sourceId_key" ON "ClassworkPlacement"("classId", "sourceType", "sourceId");
CREATE INDEX "ClassworkPlacement_topicId_idx" ON "ClassworkPlacement"("topicId");
ALTER TABLE "ClassworkPlacement" ADD CONSTRAINT "ClassworkPlacement_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassworkPlacement" ADD CONSTRAINT "ClassworkPlacement_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ClassworkTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
