-- Guided Studio exam redesign introduces three additional question types that
-- the existing "QuestionType" enum did not carry:
--
--   DROPDOWN  — single-select rendered as a drop-down (graded like a choice)
--   HOTSPOT   — pick the correct region/option (graded like a choice)
--   EXTENDED  — extended constructed response (manually graded, like WRITTEN)
--
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS is the correct, idempotent way to
-- backfill enum values on a type that may or may not already have them.
-- Requires PostgreSQL 12+ for ADD VALUE IF NOT EXISTS.
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'DROPDOWN';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'HOTSPOT';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'EXTENDED';
