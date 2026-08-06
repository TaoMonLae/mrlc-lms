-- Add STUDENT_ID_CARD as a new value of the existing DocumentType enum, so
-- printable/verifiable student ID cards can be issued through the same
-- GeneratedDocument pipeline used for report cards, transcripts, etc.
ALTER TYPE "DocumentType" ADD VALUE 'STUDENT_ID_CARD';
