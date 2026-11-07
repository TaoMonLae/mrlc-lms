// Short labels for the staff Documents register (the printed sheet uses the
// full titles in shared/officialDocuments.ts).
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  REPORT_CARD: 'Report Card',
  TRANSCRIPT: 'Transcript',
  PROGRESS_REPORT: 'Progress Report',
  ENROLLMENT_CONFIRMATION: 'Enrollment Confirmation',
  COMPLETION_CERTIFICATE: 'Completion Certificate',
  STUDENT_ID_CARD: 'Student ID Card',
};

const NOUNS: Record<string, [string, string]> = {
  REPORT_CARD: ['report card', 'report cards'],
  TRANSCRIPT: ['transcript', 'transcripts'],
  PROGRESS_REPORT: ['progress report', 'progress reports'],
  ENROLLMENT_CONFIRMATION: ['enrollment confirmation', 'enrollment confirmations'],
  COMPLETION_CERTIFICATE: ['completion certificate', 'completion certificates'],
  STUDENT_ID_CARD: ['student ID card', 'student ID cards'],
};

/** "report card" / "report cards", for sentences and button labels. */
export function documentTypeNoun(type: string, count: number): string {
  const pair = NOUNS[type] || ['document', 'documents'];
  return count === 1 ? pair[0] : pair[1];
}

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  CANCELLED: 'Cancelled',
  REISSUED: 'Reissued',
};
