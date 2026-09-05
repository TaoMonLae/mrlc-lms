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
  id: '2026-09-05-timetable-teacher-integrity',
  version: 'September 2026 · Timetable integrity',
  releasedAt: '2026-09-05T08:15:00.000Z',
  title: 'Timetables now follow the live teaching team',
  summary: 'Teacher names in schedules now come from active MRLC profiles, removing stale demo identities without discarding the timetable itself.',
  highlights: [
    {
      eyebrow: 'One source of truth',
      title: 'Only active teachers appear in timetable controls',
      description: 'The teacher filter and schedule form now use the current MRLC teaching roster instead of copied names from old schedule rows.',
      details: [
        'Inactive and deleted teacher profiles are excluded.',
        'Renamed teachers appear with their current profile name.',
        'New schedules require a valid active teacher assignment.',
      ],
      accent: 'blue',
      icon: 'cursor',
    },
    {
      eyebrow: 'History preserved',
      title: 'Stale identity data is removed—not the schedule',
      description: 'Existing class periods remain available while invalid teacher links and copied mock names are cleared.',
      details: [
        'Class, subject, room and timing information remain intact.',
        'Unassigned schedule rows are clearly labelled for correction.',
        'Substitute teachers receive the same integrity checks.',
      ],
      accent: 'mint',
      icon: 'map',
    },
    {
      eyebrow: 'Protected going forward',
      title: 'Invalid teacher links cannot return',
      description: 'The database and API now enforce the relationship between a timetable assignment and a real teacher profile.',
      details: [
        'Teacher names are derived server-side rather than trusted from the browser.',
        'Database constraints prevent orphaned teacher references.',
        'The update applies consistently to primary and substitute assignments.',
      ],
      accent: 'coral',
      icon: 'sparkles',
    },
  ],
};
