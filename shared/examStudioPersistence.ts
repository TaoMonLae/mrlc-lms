/** Called inside the exam update transaction, after authorization and attempt checks. */
export async function saveStudioQuestions(tx: any, examId: string, questions: any[]) {
  const current = await tx.question.findMany({ where: { examId }, select: { id: true } });
  const currentIds = new Set(current.map((q: any) => q.id));
  const retainedIds = questions.map(q => q.id).filter(id => currentIds.has(id));
  if (new Set(retainedIds).size !== retainedIds.length) throw Object.assign(new Error('A question cannot appear twice. Use Duplicate to create a copy.'), { http: 400 });
  await tx.question.deleteMany({ where: { examId, id: { notIn: retainedIds } } });
  for (const [orderIndex, q] of questions.entries()) {
    const data = {
      examId, text: String(q.questionText || ''), type: q.type || 'MCQ',
      points: Number(q.points ?? 5), orderIndex, options: q.choices || null,
      correctAnswer: q.correctAnswer != null ? String(q.correctAnswer) : null,
      correctAnswers: q.correctAnswers ?? null, partialCredit: !!q.partialCredit,
      passageText: q.passageText || null, explanation: q.explanation || null, imageUrl: q.imageUrl || null,
    };
    // Updating existing rows preserves section/group links and advanced scoring
    // settings that this editor does not expose. Never update another exam's ID.
    if (currentIds.has(q.id)) await tx.question.update({ where: { id: q.id }, data });
    else await tx.question.create({ data });
  }
}
