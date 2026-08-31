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
  id: '2026-08-31-language-quest-refresh',
  version: 'August 2026',
  releasedAt: '2026-08-31T00:00:00.000Z',
  title: 'A clearer path through Language Quest',
  summary: 'See what changed before you continue learning, teaching, or managing the school day.',
  highlights: [
    {
      eyebrow: 'Always informed',
      title: 'Updates now introduce themselves',
      description: 'After each release, a short What’s New screen explains the changes that matter to you.',
      details: [
        'Appears once per release and remembers each user separately.',
        'Reopen it any time from the sparkle button in the top bar.',
        'Short, focused slides replace long release-note lists.',
      ],
      accent: 'blue',
      icon: 'sparkles',
    },
    {
      eyebrow: 'Motion restored',
      title: 'Cursor effects are easier to see and trust',
      description: 'Cursor choices preview immediately and recover cleanly when a new app build replaces old files.',
      details: [
        'Selections preview before you save them.',
        'Personal overrides and school defaults are clearly identified.',
        'Reduce Motion no longer fails silently—the reason is shown in settings.',
      ],
      accent: 'mint',
      icon: 'cursor',
    },
    {
      eyebrow: 'Language Quest',
      title: 'A more confident start to every quest',
      description: 'The refreshed entry, account, and learning surfaces make the next action easier to understand.',
      details: [
        'A distinct learning-first visual system replaces generic blocks.',
        'Sign in and account creation share one clear journey.',
        'Timetable and quest updates are easier to scan at a glance.',
      ],
      accent: 'coral',
      icon: 'map',
    },
  ],
};
