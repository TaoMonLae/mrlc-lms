-- Re-point ChessMatch players at User instead of Student, so staff/teacher
-- accounts (which have no Student row) can also play. Add a `scope` column so
-- a match always stays within one pool: students only ever match classmates,
-- staff only ever match other staff — never mixed.

ALTER TABLE "ChessMatch" DROP CONSTRAINT IF EXISTS "ChessMatch_whiteId_fkey";
ALTER TABLE "ChessMatch" DROP CONSTRAINT IF EXISTS "ChessMatch_blackId_fkey";

ALTER TABLE "ChessMatch" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'STUDENT';

CREATE INDEX "ChessMatch_scope_idx" ON "ChessMatch"("scope");

ALTER TABLE "ChessMatch"
ADD CONSTRAINT "ChessMatch_whiteId_fkey"
FOREIGN KEY ("whiteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChessMatch"
ADD CONSTRAINT "ChessMatch_blackId_fkey"
FOREIGN KEY ("blackId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMENT ON TABLE "ChessMatch" IS 'Online multiplayer chess games/challenges (student-classmate or staff-staff pools), server-authoritative (fen + SAN move history).';
