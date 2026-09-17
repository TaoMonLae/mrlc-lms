export function homeworkTeacherScope(actor: { userId: string; role: string }) {
  return actor.role === 'TEACHER' ? { teacher: { userId: actor.userId } } : {};
}

export function ownsHomework(actor: { userId: string; role: string }, teacherUserId: string | null | undefined): boolean {
  return actor.role === 'ADMIN' || (actor.role === 'TEACHER' && teacherUserId === actor.userId);
}
