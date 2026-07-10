export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export type QuestionType =
  | 'MCQ'
  | 'SHORT_ANSWER'
  | 'WRITTEN'
  | 'GED_RLA_PASSAGE'
  | 'GED_MATH'
  | 'GED_SCIENCE'
  | 'GED_SOCIAL_STUDIES'
  | 'DRAG_DROP';

// Wayground-style drag-and-drop: a passage with blanked-out words the
// student drags word chips into. Authored as raw text using "[[word]]" to
// mark blanks (see src/lib/dragBlanks.ts) — parsed into the stored
// "{{id}}"-token text + a blanks list only at save time. `distractors` are
// extra wrong words mixed into the word bank alongside the blanks' answers.
export interface DragBlank {
  id: string;
  answer: string;
}

export interface ExamQuestion {
  id: string;
  type: QuestionType;
  questionText: string;
  passageText?: string;
  imageUrl?: string | null;
  choices?: string[];
  dragRawText?: string;
  distractors?: string[];
  correctAnswer?: string;
  explanation?: string;
  points: number;
  order: number;
}

export interface ExamSettings {
  enableTimer: boolean;
  autoSubmit: boolean;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  showScoreAfterSubmit: boolean;
  showCorrectAnswers: boolean;
  startDate?: string;
  endDate?: string;
  allowedAttempts: number;
}

export interface Exam {
  id: string;
  title: string;
  classId: string;
  subject: string;
  examType: string;
  durationMinutes: number;
  totalPoints: number;
  status: ExamStatus;
  questions: ExamQuestion[];
  settings: ExamSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  studentId: string;
  answers: Record<string, string>;
  score?: number;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
  startedAt: string;
  submittedAt?: string;
}
