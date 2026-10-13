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
  id: '2026-10-13-mobile-focus-beta',
  version: 'October 2026 · Focus and learning',
  releasedAt: '2026-10-13T00:00:00.000Z',
  title: 'A clearer view of supervised learning',
  summary: 'Follow assigned student focus sessions, use improved video and exam controls, and choose the school updates that reach you.',
  highlights: [
    {
      eyebrow: 'For teachers and administrators',
      title: 'Follow focus sessions',
      description: 'See active school-student sessions, connection and focus status, and requests for release.',
      details: [
        'Open Focus monitor to see students in your assigned classes; administrators can see all school students.',
        'Add or remove 15 minutes, approve release, or decline a release request.',
        'A focus warning means the LMS page lost focus; it cannot identify another tab or app.',
      ],
      accent: 'mint',
      icon: 'map',
    },
    {
      eyebrow: 'Device options',
      title: 'Open a focus view on your phone',
      description: 'The voluntary MRLC Focus beta gives personal phones and tablets a dedicated view of assigned study time and release requests.',
      details: [
        'Open the Focus beta from the kiosk downloads page and add it to your home screen.',
        'The app reports focus and connection status; it does not lock a personal device or prevent switching apps.',
        'The separate unsigned desktop kiosk beta remains for supervised Windows and Mac testing.',
      ],
      accent: 'blue',
      icon: 'cursor',
    },
    {
      eyebrow: 'Teaching and assessment',
      title: 'Smoother video and exam review',
      description: 'Video lessons have clearer player, fullscreen and bulk controls; exam answer keys follow staff permissions.',
      details: [
        'Video lesson playback and fullscreen controls are easier to use.',
        'Staff can manage video lessons with bulk actions.',
        'Exam response review and answer-key access follow the assigned permissions.',
      ],
      accent: 'coral',
      icon: 'cursor',
    },
    {
      eyebrow: 'Notification preferences',
      title: 'Choose the updates that matter',
      description: 'The October notification settings let you choose delivery channels and topics.',
      details: [
        'Turn in-app and email delivery on or off separately, then save your choices.',
        'Teachers can choose payroll, class, timetable, announcement and app-update topics.',
        'Email is opt-in and requires the school email service to be configured.',
      ],
      accent: 'mint',
      icon: 'cursor',
    },
  ],
};
