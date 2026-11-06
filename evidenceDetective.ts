import { Router, type Request, type Response } from "express";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { EVIDENCE_CASES, evidenceAttemptResponse, gradeEvidence, publicEvidenceCase } from "./evidenceCases";

const attemptSchema = z.object({
  caseId: z.string(),
  evidenceId: z.string(),
  reasoningId: z.string(),
});

export function registerEvidenceDetectiveRoutes({ app, prisma, authMiddleware, gameAccessMiddleware }: {
  app: { use: (path: string, router: Router) => void };
  prisma: PrismaClient;
  authMiddleware: (req: Request, res: Response, next: (error?: unknown) => void) => void;
  gameAccessMiddleware: (req: Request, res: Response, next: (error?: unknown) => void) => void;
}) {
  const router = Router();
  router.use(authMiddleware, gameAccessMiddleware);

  router.get("/", async (req, res) => {
    try {
      const userId = (req as any).user.userId as string;
      const progress = await prisma.evidenceCaseProgress.findMany({
        where: { userId },
        select: { caseId: true, attempts: true, solved: true, solvedAt: true },
      });
      const solvedIds = new Set(progress.filter((row) => row.solved).map((row) => row.caseId));
      const reviews = Object.fromEntries(EVIDENCE_CASES.filter((item) => solvedIds.has(item.id)).map((item) => [item.id, {
        answer: item.answer, explanation: item.explanation,
      }]));
      res.json({ cases: EVIDENCE_CASES.map(publicEvidenceCase), progress, reviews });
    } catch (error) {
      console.error("Evidence Detective load failed:", error);
      res.status(500).json({ error: "Could not load your cases. Please try again." });
    }
  });

  router.post("/attempt", async (req, res) => {
    const parsed = attemptSchema.safeParse(req.body);
    const caseItem = EVIDENCE_CASES.find((item) => item.id === parsed.data?.caseId);
    if (!parsed.success || !caseItem ||
      !caseItem.evidence.some((option) => option.id === parsed.data.evidenceId) ||
      !caseItem.reasoning.some((option) => option.id === parsed.data.reasoningId)) {
      res.status(400).json({ error: "Choose one quotation and one reason from this case." });
      return;
    }
    const userId = (req as any).user.userId as string;
    try {
      const existing = await prisma.evidenceCaseProgress.findUnique({ where: { userId_caseId: { userId, caseId: caseItem.id } } });
      if (existing?.solved) {
        res.json({ solved: true, alreadySolved: true, attempts: existing.attempts, answer: caseItem.answer, explanation: caseItem.explanation });
        return;
      }
      const result = gradeEvidence(caseItem, parsed.data.evidenceId, parsed.data.reasoningId);
      const solved = result.evidenceCorrect && result.reasoningCorrect;
      const progress = await prisma.evidenceCaseProgress.upsert({
        where: { userId_caseId: { userId, caseId: caseItem.id } },
        create: { userId, caseId: caseItem.id, attempts: 1, solved, solvedAt: solved ? new Date() : null },
        update: { attempts: { increment: 1 }, ...(solved ? { solved: true, solvedAt: new Date() } : {}) },
      });
      const completed = progress.solved;
      res.json(evidenceAttemptResponse(caseItem, progress.attempts, completed));
    } catch (error) {
      console.error("Evidence Detective save failed:", error);
      res.status(500).json({ error: "Your answer could not be saved. Please try again." });
    }
  });

  app.use("/api/games/evidence-detective", router);
}
