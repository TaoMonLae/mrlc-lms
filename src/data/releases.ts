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
  id: '2026-09-05-landing-brand-click-spark',
  version: 'September 2026 · School identity',
  releasedAt: '2026-09-05T07:45:00.000Z',
  title: 'The MRLC welcome is unmistakably ours',
  summary: 'The public landing page now carries the saved school logo, a sharper MRLC-specific design and a reliable Click Spark cursor by default.',
  highlights: [
    {
      eyebrow: 'School identity restored',
      title: 'Your saved logo now reaches the landing page',
      description: 'Public pages load the same saved school identity used by the authenticated portal instead of showing a hard-coded initial.',
      details: [
        'The landing header and footer use the configured school logo.',
        'The saved school name and landing photograph are loaded on public routes.',
        'A typographic MRLC wordmark remains available if an image cannot load.',
      ],
      accent: 'blue',
      icon: 'map',
    },
    {
      eyebrow: 'Click Spark by default',
      title: 'A lighter cursor effect replaces the oversized blob',
      description: 'Click Spark is now the safe default for public pages, new installations and schools still using the previous generated default.',
      details: [
        'Public routes now load the saved school cursor setting.',
        'The effect keeps React Bits’ published motion values with an MRLC teal spark.',
        'Existing deliberate personal cursor choices remain unchanged.',
      ],
      accent: 'mint',
      icon: 'cursor',
    },
    {
      eyebrow: 'A school, not a template',
      title: 'Generic icon blocks have been replaced',
      description: 'The landing page now uses strong typography, numbered routes and real school-day evidence instead of interchangeable feature tiles.',
      details: [
        'The classroom image remains full-bleed and central to the first impression.',
        'Role and tool sections use editorial divisions rather than decorative cards.',
        'Entrance motion remains responsive and respects reduced-motion preferences.',
      ],
      accent: 'coral',
      icon: 'sparkles',
    },
  ],
};
