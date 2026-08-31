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
  id: '2026-09-01-about-mrlc-malaysia',
  version: 'September 2026 · About MRLC',
  releasedAt: '2026-08-31T16:00:00.000Z',
  title: 'MRLC, accurately represented',
  summary: 'A redesigned About experience now places the school’s Malaysian identity, purpose and developer stewardship in clear view.',
  highlights: [
    {
      eyebrow: 'MRLC in Malaysia',
      title: 'The school’s location is now correct everywhere',
      description: 'MRLC is represented as a Malaysian GED school across the About page, login identity and system defaults.',
      details: [
        'Incorrect Mae Sot references have been removed from active school-facing screens.',
        'New installations use Malaysia, Asia/Kuala_Lumpur and MYR by default.',
        'Legacy MRLC settings are aligned through a safe database migration.',
      ],
      accent: 'blue',
      icon: 'map',
    },
    {
      eyebrow: 'A clearer school story',
      title: 'About MRLC now starts with purpose',
      description: 'A high-contrast editorial layout explains the school’s mission, connected system and learning evidence without generic feature blocks.',
      details: [
        'School identity and Malaysia lead the opening statement.',
        'Learning, support, operations and practice are presented as one system.',
        'The responsive page remains clear from desktop to mobile.',
      ],
      accent: 'mint',
      icon: 'sparkles',
    },
    {
      eyebrow: 'Developer stewardship',
      title: 'The work behind the portal is visible',
      description: 'The About page now identifies Tao Mon Lae and explains the product, design and engineering responsibility behind MRLC LMS.',
      details: [
        'Developer role, responsibility and focus are stated directly.',
        'GitHub profile and source repository links are provided.',
        'Open-source acknowledgements remain visible and attributable.',
      ],
      accent: 'coral',
      icon: 'cursor',
    },
  ],
};
