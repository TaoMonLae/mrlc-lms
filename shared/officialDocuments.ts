export const OFFICIAL_DOCUMENT_TYPE_LABELS = {
  REPORT_CARD: 'Term Report Card',
  TRANSCRIPT: 'Academic Transcript',
  ENROLLMENT_CONFIRMATION: 'Enrollment Confirmation',
  COMPLETION_CERTIFICATE: 'Completion Certificate',
  PROGRESS_REPORT: 'Student Progress Report',
  STUDENT_ID_CARD: 'Student ID Card',
} as const;

export type OfficialDocumentType = keyof typeof OFFICIAL_DOCUMENT_TYPE_LABELS;

export type OfficialDocumentLinkTarget = {
  id: string;
  type: string;
};

export function officialDocumentLabel(type: string): string {
  return OFFICIAL_DOCUMENT_TYPE_LABELS[type as OfficialDocumentType] || type.replaceAll('_', ' ');
}

export function officialDocumentViewPath(document: OfficialDocumentLinkTarget): string {
  const suffix = document.type === 'STUDENT_ID_CARD' ? 'id-card' : 'print';
  return `/documents/${encodeURIComponent(document.id)}/${suffix}`;
}

export function officialDocumentBackPath(role?: string | null): string {
  return role === 'STUDENT' ? '/student/profile' : '/documents';
}
