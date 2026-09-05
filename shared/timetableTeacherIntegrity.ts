export type TimetableTeacherSource = {
  id: string;
  teacherCode?: string | null;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    isActive?: boolean | null;
  } | null;
};

export type TimetableTeacherReferences = {
  teacherId?: string | null;
  teacherName?: string | null;
  substituteTeacherId?: string | null;
  substituteTeacherName?: string | null;
};

/** Active teacher profiles are the authority for names shown in timetables. */
export function activeTimetableTeacherNames(teachers: TimetableTeacherSource[]) {
  const names = new Map<string, string>();

  teachers.forEach((teacher) => {
    if (!teacher.user?.isActive) return;
    const fullName = `${teacher.user.firstName ?? ''} ${teacher.user.lastName ?? ''}`.trim();
    const displayName = fullName || teacher.teacherCode?.trim();
    if (displayName) names.set(teacher.id, displayName);
  });

  return names;
}

/**
 * Remove copied names and IDs that no longer resolve to an active teacher.
 * This preserves the schedule record while preventing deleted, inactive, or
 * imported demo identities from leaking into timetable filters and cards.
 */
export function normalizeTimetableTeacherReferences<T extends TimetableTeacherReferences>(
  entry: T,
  activeNames: ReadonlyMap<string, string>,
): T {
  const teacherName = entry.teacherId ? activeNames.get(entry.teacherId) : undefined;
  const substituteTeacherName = entry.substituteTeacherId
    ? activeNames.get(entry.substituteTeacherId)
    : undefined;

  return {
    ...entry,
    teacherId: teacherName ? entry.teacherId : null,
    teacherName: teacherName ?? null,
    substituteTeacherId: substituteTeacherName ? entry.substituteTeacherId : null,
    substituteTeacherName: substituteTeacherName ?? null,
  };
}
