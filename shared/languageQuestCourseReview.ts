export const LANGUAGE_QUEST_COURSE_REVIEW_STATUSES = [
  'DRAFT',
  'PENDING',
  'APPROVED',
  'CHANGES_REQUESTED',
] as const;

export type LanguageQuestCourseReviewStatus = typeof LANGUAGE_QUEST_COURSE_REVIEW_STATUSES[number];
export type LanguageQuestCourseReviewAction = 'APPROVE' | 'REQUEST_CHANGES';

export function isLanguageQuestCourseReviewAction(value: unknown): value is LanguageQuestCourseReviewAction {
  return value === 'APPROVE' || value === 'REQUEST_CHANGES';
}

export function languageQuestReviewStatusLabel(status: LanguageQuestCourseReviewStatus): string {
  switch (status) {
    case 'PENDING': return 'Awaiting review';
    case 'APPROVED': return 'Approved';
    case 'CHANGES_REQUESTED': return 'Changes requested';
    default: return 'Draft';
  }
}

export function languageQuestTeacherEditReviewData() {
  return {
    published: false,
    reviewStatus: 'DRAFT' as const,
    reviewNote: null,
    submittedForReviewAt: null,
    reviewedAt: null,
  };
}

export function languageQuestCourseReviewDecision(
  action: LanguageQuestCourseReviewAction,
  note: string | null,
  reviewedAt: Date,
) {
  return action === 'APPROVE'
    ? {
        published: true,
        reviewStatus: 'APPROVED' as const,
        reviewNote: note,
        reviewedAt,
      }
    : {
        published: false,
        reviewStatus: 'CHANGES_REQUESTED' as const,
        reviewNote: note,
        reviewedAt,
      };
}
