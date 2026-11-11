-- Authors can edit and remove their own forum posts. Removal is soft so open staff reports keep their evidence.
ALTER TABLE "CouncilForumTopic" ADD COLUMN "editedAt" TIMESTAMP(3), ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "CouncilForumReply" ADD COLUMN "editedAt" TIMESTAMP(3), ADD COLUMN "deletedAt" TIMESTAMP(3);
