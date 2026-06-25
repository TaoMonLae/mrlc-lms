-- AlterTable: admission-style fields on Student
ALTER TABLE "Student" ADD COLUMN "preferredName" TEXT;
ALTER TABLE "Student" ADD COLUMN "guardianRelationship" TEXT;
ALTER TABLE "Student" ADD COLUMN "guardianEmail" TEXT;
ALTER TABLE "Student" ADD COLUMN "legalDocumentationStatus" TEXT;
ALTER TABLE "Student" ADD COLUMN "emergencyContactName" TEXT;
ALTER TABLE "Student" ADD COLUMN "emergencyContactPhone" TEXT;
ALTER TABLE "Student" ADD COLUMN "emergencyContactRelationship" TEXT;
ALTER TABLE "Student" ADD COLUMN "previousSchool" TEXT;
ALTER TABLE "Student" ADD COLUMN "previousEducationLevel" TEXT;
ALTER TABLE "Student" ADD COLUMN "educationLevel" TEXT;
ALTER TABLE "Student" ADD COLUMN "medicalInformation" TEXT;
ALTER TABLE "Student" ADD COLUMN "allergies" TEXT;
