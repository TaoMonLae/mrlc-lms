export type SubjectStatus = 'ACTIVE' | 'ARCHIVED';

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  level: string;
  status: SubjectStatus;
}
