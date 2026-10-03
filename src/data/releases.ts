export type ReleaseHighlight = {
  eyebrow: string;
  title: string;
  description: string;
  details: string[];
  accent: 'blue' | 'mint' | 'coral';
  icon: 'sparkles' | 'cursor' | 'map';
};

export type AppRelease = {
  id: string;
  version: string;
  releasedAt: string;
  title: string;
  summary: string;
  highlights: ReleaseHighlight[];
};

/**
 * Update this record whenever a new app release ships. Changing `id` makes
 * the What's New screen appear once for every signed-in user on each device.
 */
export const CURRENT_RELEASE: AppRelease = {
  id: '2026-10-03-notifications-and-reliability',
  version: 'October 2026 · Notifications',
  releasedAt: '2026-10-03T00:00:00.000Z',
  title: 'More control over your school updates',
  summary: 'Choose which notifications you receive, keep up with payroll and class changes, and use a clearer, more reliable school workspace.',
  highlights: [
    {
      eyebrow: 'Your preferences',
      title: 'Notifications, your way',
      description: 'Choose your delivery channels and topics from the new Notification settings page.',
      details: [
        'Open Notifications from navigation or Notification settings from the bell.',
        'Turn in-app and email delivery on or off separately, then save your changes.',
        'Topic choices apply to both channels. Email requires your school’s email service to be configured.',
      ],
      accent: 'mint',
      icon: 'cursor',
    },
    {
      eyebrow: 'For teachers',
      title: 'Keep up with the updates that matter',
      description: 'Manage payroll, class and app-update notifications in one place.',
      details: [
        'Receive personal payslip and payment updates, with a sign-in link to view your payroll.',
        'Choose whether to receive class assignments, timetable changes and school announcements.',
        'Enable App updates for new releases. Notifications already waiting to be emailed are checked against your latest preferences.',
      ],
      accent: 'blue',
      icon: 'map',
    },
    {
      eyebrow: 'Everyday improvements',
      title: 'Clearer controls and more reliable access',
      description: 'Small improvements make settings, reminders and account access easier to use.',
      details: [
        'The notification bell is available on mobile, with improved contrast and labelled timetable filters.',
        'Failed notification saves keep your changes so you can retry or discard them.',
        'Account access follows the school’s current permissions, and recovery codes can only be used once.',
      ],
      accent: 'coral',
      icon: 'cursor',
    },
    {
      eyebrow: 'Workspace changes',
      title: 'AI assistance has been removed',
      description: 'The floating AI Assistant and AI-generated exam questions are no longer available.',
      details: [
        'Create and edit exam questions in Studio or use the question bank.',
        'Continue using student previews, answer review, grading and other exam tools.',
        'School chat remains available for conversations with your school community.',
      ],
      accent: 'mint',
      icon: 'map',
    },
  ],
};
