/**
 * TypeScript types for video-related API responses
 */

/**
 * Video lesson visibility levels
 */
export type VideoVisibility = 'ALL' | 'STUDENTS' | 'TEACHERS_ONLY';

/**
 * Video lesson status
 */
export type VideoStatus = 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';

/**
 * Base video lesson interface (shared between client and API)
 */
export interface VideoLesson {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  captionsUrl?: string | null;
  duration: number | null; // seconds
  classId: string | null;
  className: string | null;
  subjectId: string | null;
  subjectName: string | null;
  visibility: VideoVisibility;
  status: VideoStatus;
  isRequired?: boolean;
  dueDate?: string | null;
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Watch analytics for a video (teacher/admin view)
 */
export interface VideoAnalyticsRow {
  studentId: string;
  name: string;
  status: 'completed' | 'in_progress' | 'not_started';
  percent: number;
  lastWatchedAt: string | null;
}

export interface VideoAnalytics {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  dueDate: string | null;
  overdue: boolean;
  isRequired: boolean;
  scope: 'class' | 'all';
  roster: VideoAnalyticsRow[];
}

/**
 * Video progress tracking
 */
export interface VideoProgress {
  id: string;
  userId: string;
  videoId: string;
  currentPosition: number; // seconds
  isCompleted: boolean;
  lastWatchedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Video upload response
 */
export interface VideoUploadResponse {
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
