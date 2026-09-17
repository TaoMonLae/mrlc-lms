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
  id: '2026-09-18-learning-and-student-life',
  version: 'September 2026 · Learning & student life',
  releasedAt: '2026-09-18T00:00:00.000Z',
  title: 'Better lessons, private homework and simpler student life',
  summary: 'Submit homework files, review students on a dedicated page, connect videos to learning activities and keep boarding expenses linked to Finance.',
  highlights: [
    {
      eyebrow: 'Homework, reimagined',
      title: 'A clearer hand-in and review workflow',
      description: 'Students can upload their work, while teachers get a focused review page for each student instead of a crowded assignment screen.',
      details: [
        'Browse or drag and drop up to five files, with a 10 MB limit per file.',
        'Preview or remove attachments before submitting, with clear validation messages.',
        'Review opens on its own page with feedback, grading and navigation between students.',
      ],
      accent: 'mint',
      icon: 'map',
    },
    {
      eyebrow: 'Private by default',
      title: 'Your homework stays with your teacher',
      description: 'Teachers only see and manage their own homework. Administrators keep oversight, and students retain access to their assigned work.',
      details: [
        'Teacher privacy also applies to linked Classwork, Video Lessons and homework grades.',
        'Homework attachment previews and downloads require authorized access.',
        'Failed feedback saves keep the entered feedback so teachers can retry.',
      ],
      accent: 'blue',
      icon: 'cursor',
    },
    {
      eyebrow: 'Watch, practice, submit',
      title: 'Video lessons connect to real learning',
      description: 'Lessons now bring YouTube watch tracking, quizzes and homework together, with clearer lesson layouts and more reliable editing.',
      details: [
        'Track playback progress and open the lesson’s linked quiz and homework.',
        'Save timestamped private notes or send a question to the lesson teacher.',
        'Organize lessons into units, check learning reports and send in-app reminders.',
      ],
      accent: 'coral',
      icon: 'sparkles',
    },
    {
      eyebrow: 'Boarding student life',
      title: 'Daily duties stay connected to Finance',
      description: 'Boarding students can record duty expenses for cooking, school supplies and daily necessities, with a review and approval workflow for staff.',
      details: [
        'Student expense submissions appear in the Finance expense workflow.',
        'Arrange cooking duty groups using the drag-and-drop duty board.',
        'Assign student council roles, including hostel and resource monitors.',
      ],
      accent: 'mint',
      icon: 'map',
    },
    {
      eyebrow: 'Profiles and reading',
      title: 'Student records and reading feel smoother',
      description: 'Student profiles, documents and ID cards have refreshed layouts, alongside fixes for Safari reader selection and fullscreen navigation.',
      details: [
        'Scrollable profile tabs keep sections reachable on smaller screens.',
        'Only administrators can change students’ profile photos.',
        'Reader text selection tools and the Contents menu work in fullscreen.',
      ],
      accent: 'blue',
      icon: 'cursor',
    },
  ],
};
