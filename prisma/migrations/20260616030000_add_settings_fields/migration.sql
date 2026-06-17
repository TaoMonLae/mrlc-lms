-- AlterTable: branding + system settings persisted on the SchoolProfile singleton
ALTER TABLE "SchoolProfile" ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "signatureUrl" TEXT,
ADD COLUMN     "primaryColor" TEXT DEFAULT '#5865f2',
ADD COLUMN     "accentColor" TEXT DEFAULT '#3b82f6',
ADD COLUMN     "darkModeDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reportHeaderStyle" TEXT DEFAULT 'standard',
ADD COLUMN     "timezone" TEXT DEFAULT 'Asia/Bangkok',
ADD COLUMN     "dateFormat" TEXT DEFAULT 'DD/MM/YYYY',
ADD COLUMN     "currency" TEXT DEFAULT 'THB',
ADD COLUMN     "defaultLanguage" TEXT DEFAULT 'en',
ADD COLUMN     "fileUploadLimitMb" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "backupEnabled" BOOLEAN NOT NULL DEFAULT true;
