-- Click Spark is the new school-wide default. Preserve every explicit cursor
-- choice; only migrate the previous generated default (Blob Cursor) and nulls.
ALTER TABLE "SchoolProfile"
ALTER COLUMN "cursorEffect" SET DEFAULT 'CLICK_SPARK';

UPDATE "SchoolProfile"
SET "cursorEffect" = 'CLICK_SPARK'
WHERE "cursorEffect" IS NULL OR "cursorEffect" = 'RAINBOW_TRAIL';
