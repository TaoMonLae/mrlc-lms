export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'VOLUNTEER';
export type TeacherStatus = 'ACTIVE' | 'INACTIVE';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface AssignedClass {
  id: string;
  name: string;
  subject: string;
  schedule: string;
}

export interface Teacher {
  id: string;
  teacherId: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  phone: string;
  email: string;
  address: string;
  subjects: string[];
  assignedClasses: AssignedClass[];
  employmentType: EmploymentType;
  status: TeacherStatus;
  joinedDate: string;
  photoUrl?: string;
  profilePhotoUrl?: string | null;
  notes?: string;
  userId?: string; // Linked user account ID
}

export interface TeacherActivity {
  id: string;
  type: 'LOGIN' | 'ASSIGN_CLASS' | 'REPORT_SUBMIT' | 'PROFILE_UPDATE';
  description: string;
  timestamp: string;
}
