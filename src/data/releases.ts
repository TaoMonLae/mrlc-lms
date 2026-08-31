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
  id: '2026-08-31-school-portal-refresh',
  version: 'August 2026 · School Portal',
  releasedAt: '2026-08-31T15:37:36.000Z',
  title: 'The school portal is back at the centre',
  summary: 'A restored school-first login, a clearer About page, and more dependable update and cursor behaviour.',
  highlights: [
    {
      eyebrow: 'School-first access',
      title: 'Your school login is the front door again',
      description: 'MRLC identity and school access now lead the sign-in journey instead of Language Quest.',
      details: [
        'The school portal is restored at the main login route.',
        'Classes, records, the library and learning tools share one clear entry point.',
        'Language Quest remains available as a learning area and public learner option.',
      ],
      accent: 'blue',
      icon: 'map',
    },
    {
      eyebrow: 'About MRLC',
      title: 'A clearer account of the whole school day',
      description: 'The About page now explains how learning, people, operations and practice connect across MRLC.',
      details: [
        'School identity and purpose lead the story.',
        'Evidence, technology and acknowledgements are easier to scan.',
        'The page adapts cleanly from desktop to mobile.',
      ],
      accent: 'mint',
      icon: 'sparkles',
    },
    {
      eyebrow: 'Reliable preferences',
      title: 'Updates and cursor choices now stay in their lane',
      description: 'Release notices wait until you enter the protected portal, while saved cursor choices persist between sections.',
      details: [
        'This screen appears once for this new release on each signed-in device.',
        'Login, registration and verification routes remain interruption-free.',
        'Saved cursor effects no longer fall back to Click Spark after navigation.',
      ],
      accent: 'coral',
      icon: 'cursor',
    },
  ],
};
