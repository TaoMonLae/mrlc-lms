export const LANGUAGE_QUEST_LEADERBOARD_SCOPES = [
  'global',
  'league',
  'course',
  'category',
  'classroom',
] as const;

export type LanguageQuestLeaderboardScope = typeof LANGUAGE_QUEST_LEADERBOARD_SCOPES[number];

export function languageQuestLeaderboardScope(value: unknown): LanguageQuestLeaderboardScope {
  return LANGUAGE_QUEST_LEADERBOARD_SCOPES.includes(value as LanguageQuestLeaderboardScope)
    ? value as LanguageQuestLeaderboardScope
    : 'global';
}

export const LANGUAGE_QUEST_LEAGUES = [
  { id: 'sprout', title: 'Sprout League', emoji: '🌱', minXp: 0, maxXp: 99 },
  { id: 'explorer', title: 'Explorer League', emoji: '🧭', minXp: 100, maxXp: 299 },
  { id: 'pathfinder', title: 'Pathfinder League', emoji: '⛰️', minXp: 300, maxXp: 699 },
  { id: 'luminary', title: 'Luminary League', emoji: '✨', minXp: 700, maxXp: null },
] as const;

export type LanguageQuestLeague = typeof LANGUAGE_QUEST_LEAGUES[number];

export function languageQuestLeagueForXp(recentXp: number): LanguageQuestLeague {
  const xp = Math.max(0, Number.isFinite(recentXp) ? recentXp : 0);
  return LANGUAGE_QUEST_LEAGUES.find((league) => league.maxXp === null || xp <= league.maxXp)
    ?? LANGUAGE_QUEST_LEAGUES[LANGUAGE_QUEST_LEAGUES.length - 1];
}
