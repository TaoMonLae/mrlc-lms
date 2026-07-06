-- The School Profile settings form has always had inputs for short name,
-- website, current academic year, principal name, and description, but the
-- SchoolProfile table never had matching columns -- those fields were
-- silently dropped on save (never sent by the frontend, and nowhere to
-- store them even if they had been). Add the missing columns.
ALTER TABLE "SchoolProfile" ADD COLUMN "shortName" TEXT;
ALTER TABLE "SchoolProfile" ADD COLUMN "website" TEXT;
ALTER TABLE "SchoolProfile" ADD COLUMN "academicYear" TEXT;
ALTER TABLE "SchoolProfile" ADD COLUMN "principalName" TEXT;
ALTER TABLE "SchoolProfile" ADD COLUMN "description" TEXT;
