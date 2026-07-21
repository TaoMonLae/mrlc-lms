-- LibraryResource list filtering + file-gate lookups were unindexed.
-- createdAt: the list is ordered by createdAt desc (every page load sorts the
--   whole table without this index).
-- visibility: the role filter (ALL/STUDENTS/TEACHERS_ONLY) narrows the list
--   per role on every GET /api/library.
-- externalUrl: the /uploads/library auth gate looks a resource up by
--   externalUrl before serving the file; index it so each file fetch is O(1).

CREATE INDEX IF NOT EXISTS "LibraryResource_createdAt_idx" ON "LibraryResource"("createdAt");
CREATE INDEX IF NOT EXISTS "LibraryResource_visibility_idx" ON "LibraryResource"("visibility");
CREATE INDEX IF NOT EXISTS "LibraryResource_externalUrl_idx" ON "LibraryResource"("externalUrl");
