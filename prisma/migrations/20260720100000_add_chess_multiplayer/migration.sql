-- Create ChessMatch table (online multiplayer chess between students)
CREATE TABLE "ChessMatch" (
    "id" TEXT NOT NULL,
    "whiteId" TEXT NOT NULL,
    "blackId" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "classId" TEXT,
    "className" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fen" TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    "moves" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "turnColor" TEXT NOT NULL DEFAULT 'w',
    "result" TEXT,
    "resultReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "lastMoveAt" TIMESTAMP(3),

    CONSTRAINT "ChessMatch_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "ChessMatch_whiteId_idx" ON "ChessMatch"("whiteId");
CREATE INDEX "ChessMatch_blackId_idx" ON "ChessMatch"("blackId");
CREATE INDEX "ChessMatch_status_idx" ON "ChessMatch"("status");
CREATE INDEX "ChessMatch_classId_idx" ON "ChessMatch"("classId");
CREATE INDEX "ChessMatch_updatedAt_idx" ON "ChessMatch"("updatedAt");

-- Foreign keys
ALTER TABLE "ChessMatch"
ADD CONSTRAINT "ChessMatch_whiteId_fkey"
FOREIGN KEY ("whiteId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChessMatch"
ADD CONSTRAINT "ChessMatch_blackId_fkey"
FOREIGN KEY ("blackId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMENT ON TABLE "ChessMatch" IS 'Online multiplayer chess games/challenges between students, server-authoritative (fen + SAN move history).';
