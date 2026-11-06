-- CreateTable
CREATE TABLE "CouncilPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouncilPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouncilDutyEntry" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "dutyNumber" INTEGER NOT NULL,
    "dutyName" TEXT NOT NULL,
    "dutyType" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "groupNumber" INTEGER NOT NULL,
    "groupName" TEXT NOT NULL,
    "members" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rating" INTEGER,
    "note" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 0,
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouncilDutyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouncilForumTopic" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouncilForumTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouncilForumReply" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouncilForumReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouncilForumReport" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "replyId" TEXT,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouncilForumReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouncilAppointment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,

    CONSTRAINT "CouncilAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CouncilDutyEntry_date_idx" ON "CouncilDutyEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CouncilDutyEntry_planId_date_dutyNumber_key" ON "CouncilDutyEntry"("planId", "date", "dutyNumber");

-- CreateIndex
CREATE INDEX "CouncilForumTopic_hidden_pinned_updatedAt_idx" ON "CouncilForumTopic"("hidden", "pinned", "updatedAt");

-- CreateIndex
CREATE INDEX "CouncilForumReply_topicId_createdAt_idx" ON "CouncilForumReply"("topicId", "createdAt");

-- CreateIndex
CREATE INDEX "CouncilForumReport_resolved_createdAt_idx" ON "CouncilForumReport"("resolved", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CouncilAppointment_studentId_key" ON "CouncilAppointment"("studentId");

-- AddForeignKey
ALTER TABLE "CouncilDutyEntry" ADD CONSTRAINT "CouncilDutyEntry_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CouncilPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilForumReply" ADD CONSTRAINT "CouncilForumReply_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CouncilForumTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilForumReport" ADD CONSTRAINT "CouncilForumReport_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CouncilForumTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CouncilDutyEntry" ADD CONSTRAINT "CouncilDutyEntry_rating_check" CHECK ("rating" IS NULL OR ("rating" BETWEEN 1 AND 5 AND "status" = 'COMPLETED'));
