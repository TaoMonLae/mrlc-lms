ALTER TABLE "Exam" ADD COLUMN "ownerId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
                   ADD COLUMN "archivedAsDraft" BOOLEAN NOT NULL DEFAULT false,
                   ADD COLUMN "editorIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Only creation provenance establishes ownership. An edit or a class assignment does not.
UPDATE "Exam" e SET "ownerId" = creator.owner
FROM (
  SELECT "entityId", MIN("userId") AS owner
  FROM "AuditLog"
  WHERE "entityType" = 'EXAM' AND action IN ('CREATE', 'CLONE') AND "userId" IS NOT NULL
  GROUP BY "entityId" HAVING COUNT(DISTINCT "userId") = 1
) creator JOIN "User" u ON u.id = creator.owner
WHERE creator."entityId" = e.id;
