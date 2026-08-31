-- MRLC operates in Malaysia. Align legacy Thai defaults and existing singleton
-- values with the school's actual location and local system settings.
ALTER TABLE "SchoolProfile"
ALTER COLUMN "timezone" SET DEFAULT 'Asia/Kuala_Lumpur',
ALTER COLUMN "currency" SET DEFAULT 'MYR';

UPDATE "SchoolProfile"
SET "address" = 'Malaysia'
WHERE "address" = 'Mae Sot, Tak Province, Thailand';

UPDATE "SchoolProfile"
SET "timezone" = 'Asia/Kuala_Lumpur'
WHERE "timezone" IS NULL OR "timezone" = 'Asia/Bangkok';

UPDATE "SchoolProfile"
SET "currency" = 'MYR'
WHERE "currency" IS NULL OR "currency" = 'THB';
