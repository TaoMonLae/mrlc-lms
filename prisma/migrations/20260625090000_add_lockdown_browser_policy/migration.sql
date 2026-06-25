ALTER TABLE "SchoolProfile"
ADD COLUMN "lockdownBrowserEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lockdownRequireFullscreen" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lockdownBlockClipboard" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lockdownBlockContextMenu" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lockdownBlockShortcuts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lockdownAutoSubmitOnViolation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lockdownMaxWarnings" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "lockdownInstructions" TEXT;
