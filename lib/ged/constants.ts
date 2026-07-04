/**
 * GED Readiness constants and configuration
 */

export const GED_SUBJECTS = ["RLA", "MATH", "SCIENCE", "SOCIAL_STUDIES"] as const;
export type GedSubject = typeof GED_SUBJECTS[number];

export const GED_STATUSES = [
  "NOT_READY",
  "DEVELOPING",
  "NEAR_READY",
  "READY",
  "TEST_SCHEDULED",
  "PASSED"
] as const;
export type GedStatus = typeof GED_STATUSES[number];

export const GED_SUBJECT_LABELS: Record<GedSubject, string> = {
  RLA: "RLA",
  MATH: "Math",
  SCIENCE: "Science",
  SOCIAL_STUDIES: "Social Studies"
};

export const GED_STATUS_LABELS: Record<GedStatus, string> = {
  NOT_READY: "Not Ready",
  DEVELOPING: "Developing",
  NEAR_READY: "Near Ready",
  READY: "Ready",
  TEST_SCHEDULED: "Test Scheduled",
  PASSED: "Passed"
};

export const GED_STATUS_STYLES: Record<GedStatus, string> = {
  NOT_READY: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200",
  DEVELOPING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  NEAR_READY: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  READY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  TEST_SCHEDULED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  PASSED: "bg-emerald-600 text-white"
};

// Stage configuration for visual tracker
export const GED_STAGES = GED_STATUSES.map((status, index) => ({
  status,
  label: GED_STATUS_LABELS[status],
  step: index + 1,
  style: GED_STATUS_STYLES[status]
}));

// Thresholds for automatic status suggestions based on exam performance
export const GED_MASTERY_THRESHOLDS = {
  PASSED: 90,
  READY: 80,
  NEAR_READY: 70,
  DEVELOPING: 60,
  NOT_READY: 0
} as const;
