// Check the actor's assigned class separately before using this exam-level capability.
type Actor = { role: string; userId: string };
type Ownership = { ownerId?: string | null; editorIds?: string[] };

export function examAccess(actor: Actor, exam: Ownership) {
  if (actor.role === 'ADMIN') return 'admin';
  if (actor.role === 'TEACHER' && actor.userId) {
    if (exam.ownerId === actor.userId) return 'owner';
    if (exam.editorIds?.includes(actor.userId)) return 'editor';
  }
  return 'viewer';
}

export function canWriteExam(actor: Actor, exam: Ownership) {
  return examAccess(actor, exam) !== 'viewer';
}

export function canShareExam(actor: Actor, exam: Ownership) {
  const access = examAccess(actor, exam);
  return access === 'admin' || access === 'owner';
}
