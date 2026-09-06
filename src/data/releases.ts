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
  id: '2026-09-06-language-quest-course-path',
  version: 'September 2026 · Course path redesign',
  releasedAt: '2026-09-06T05:30:00.000Z',
  title: 'Language Quest has a clearer path forward',
  summary: 'Courses now feel like a connected learning journey, with a focused next step, tactile lesson nodes and a mobile layout built for one-handed progress.',
  highlights: [
    {
      eyebrow: 'A path, not a list',
      title: 'Every unit is now one connected journey',
      description: 'The old stack of lesson blocks is replaced by an easy-to-scan path that makes completed, current and locked work visually distinct.',
      details: [
        'The current lesson is labelled directly on the path.',
        'Completed lessons stay open for practice.',
        'Final exams and boss battles now sit at the course finish line.',
      ],
      accent: 'mint',
      icon: 'map',
    },
    {
      eyebrow: 'Made for mobile',
      title: 'Course progress fits smaller screens cleanly',
      description: 'Lesson nodes, course actions and completion results now adapt down to phone widths without horizontal scrolling or tiny controls.',
      details: [
        'Tappable controls meet the 44-pixel touch-target baseline.',
        'Course tools move below the path instead of squeezing beside it.',
        'Completion results stack into a readable phone layout.',
      ],
      accent: 'blue',
      icon: 'cursor',
    },
    {
      eyebrow: 'Safer progress',
      title: 'Course actions now respect real availability',
      description: 'Progress is bounded correctly and unavailable assessments no longer appear as actions learners can open.',
      details: [
        'Displayed completion stays between zero and 100 percent.',
        'Unavailable final exams remain clearly locked.',
        'The next-step action only opens an available, unlocked lesson.',
      ],
      accent: 'coral',
      icon: 'sparkles',
    },
  ],
};
