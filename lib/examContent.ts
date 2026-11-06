import type { Response } from 'express';
import type { PrismaClient } from '@prisma/client';

export function examContentIsEditable(exam: { status: string; _count: { attempts: number } }, role: string) {
  return exam._count.attempts === 0 && (role === 'ADMIN' || exam.status === 'DRAFT');
}

/** Run after ownership/class authorization, before changing the paper itself. */
export async function ensureEditableExamContent(db: Pick<PrismaClient, 'exam'>, role: string, examId: string, res: Response) {
  const exam = await db.exam.findUnique({
    where: { id: examId },
    select: { status: true, _count: { select: { attempts: true } } },
  });
  if (!exam) {
    res.status(404).json({ error: 'Exam not found' });
    return false;
  }
  if (!examContentIsEditable(exam, role)) {
    res.status(409).json({ error: 'This paper is locked. Clone the exam to change its content, or use the approved answer-key correction flow.' });
    return false;
  }
  return true;
}
