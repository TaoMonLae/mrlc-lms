/** The public preferences contract deliberately excludes database metadata. */
export const notificationPreferenceDefaults = {
  inAppEnabled: true,
  emailEnabled: false,
  homeworkReminders: true,
  resultNotifications: true,
  interventionReminders: true,
  payrollNotifications: true,
  classNotifications: true,
  appUpdates: true,
};

export type NotificationPreferences = typeof notificationPreferenceDefaults;
export type NotificationPreferenceKey = keyof NotificationPreferences;
export const notificationPreferenceKeys = Object.keys(notificationPreferenceDefaults) as NotificationPreferenceKey[];

export function publicNotificationPreferences(value: NotificationPreferences): NotificationPreferences {
  return Object.fromEntries(notificationPreferenceKeys.map((key) => [key, value[key]])) as NotificationPreferences;
}

/** Validate the read contract so a failed/old API cannot silently reset preferences. */
export function parseNotificationPreferences(value: unknown): NotificationPreferences {
  if (!value || typeof value !== 'object' || notificationPreferenceKeys.some((key) => typeof (value as any)[key] !== 'boolean')) {
    throw new Error('Notification settings could not be loaded. Please try again.');
  }
  return publicNotificationPreferences(value as NotificationPreferences);
}

export function notificationTypeEnabled(type: string, preference: NotificationPreferences) {
  if (type === 'HOMEWORK_DUE' || type === 'HOMEWORK_REDO') return preference.homeworkReminders;
  if (type.startsWith('HOMEWORK_') || type === 'EXAM_RESULT') return preference.resultNotifications;
  if (type.startsWith('INTERVENTION_')) return preference.interventionReminders;
  if (type.startsWith('PAYROLL_')) return preference.payrollNotifications;
  if (type.startsWith('CLASS_') || type === 'VIDEO_LESSON') return preference.classNotifications;
  if (type === 'APP_UPDATE') return preference.appUpdates;
  return true;
}

/** Equivalent database filter, applied before pagination and unread counting. */
export function disabledNotificationTypeFilters(preference: NotificationPreferences) {
  const filters: { type: string | { startsWith: string } }[] = [];
  if (!preference.homeworkReminders) filters.push({ type: 'HOMEWORK_DUE' }, { type: 'HOMEWORK_REDO' });
  if (!preference.resultNotifications) filters.push({ type: 'EXAM_RESULT' }, { type: 'HOMEWORK_MARKED' });
  if (!preference.interventionReminders) filters.push({ type: { startsWith: 'INTERVENTION_' } });
  if (!preference.payrollNotifications) filters.push({ type: { startsWith: 'PAYROLL_' } });
  if (!preference.classNotifications) filters.push({ type: { startsWith: 'CLASS_' } }, { type: 'VIDEO_LESSON' });
  if (!preference.appUpdates) filters.push({ type: 'APP_UPDATE' });
  return filters;
}
