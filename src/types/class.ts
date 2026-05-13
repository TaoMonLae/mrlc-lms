export type ClassStatus = 'ACTIVE' | 'ARCHIVED';

export interface Class {
  id: string;
  name: string;
  level: string;
  academicYear: string;
  description?: string;
  classTeacherId?: string;
  status: ClassStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSummary {
  studentCount: number;
  attendanceAvg: number;
  activeExams: number;
}
