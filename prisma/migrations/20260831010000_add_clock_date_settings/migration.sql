-- Persist the account-wide school clock display standard.
ALTER TABLE "SchoolProfile"
ADD COLUMN "timeFormat" TEXT DEFAULT '24',
ADD COLUMN "clockShowSeconds" BOOLEAN NOT NULL DEFAULT true;
