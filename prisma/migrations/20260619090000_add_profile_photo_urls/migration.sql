-- Add persisted profile photo URLs for users and linked student/teacher records.
ALTER TABLE "User" ADD COLUMN "profilePhotoUrl" TEXT;
ALTER TABLE "Student" ADD COLUMN "profilePhotoUrl" TEXT,
ADD COLUMN "contactNumber" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "identityType" TEXT,
ADD COLUMN "identityNumber" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "emergencyContact" TEXT,
ADD COLUMN "notes" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "profilePhotoUrl" TEXT;
