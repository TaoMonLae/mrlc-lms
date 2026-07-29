export type LanguageQuestRewardRarity = "Starter" | "Bright" | "Rare" | "Epic" | "Legend";

export interface LanguageQuestRewardCard {
  id: string;
  level: number;
  unlockXp: number;
  name: string;
  epithet: string;
  achievement: string;
  powerMove: string;
  emoji: string;
  rarity: LanguageQuestRewardRarity;
  colors: [string, string, string];
}

export interface LanguageQuestRewardProgress {
  level: number;
  title: string;
  xp: number;
  levelStartXp: number;
  nextLevelXp: number | null;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
  unlockedCardIds: string[];
  currentCardId: string;
  nextCardId: string | null;
  unlockedLegendaryIds: string[];
  currentLegendaryId: string | null;
  nextLegendaryId: string | null;
}

export interface LanguageQuestLegendaryAward {
  id: string;
  unlockXp: number;
  name: string;
  reign: string;
  achievement: string;
  virtue: string;
  description: string;
}

export interface LanguageQuestStreakFrame {
  id: string;
  name: string;
  unlockStreak: number;
  colors: [string, string];
  emoji: string;
}

export const LANGUAGE_QUEST_STREAK_FRAMES: readonly LanguageQuestStreakFrame[] = [
  { id: "classic", name: "Quest Classic", unlockStreak: 0, colors: ["#64748b", "#cbd5e1"], emoji: "🩶" },
  { id: "ember", name: "Ember Edge", unlockStreak: 3, colors: ["#f97316", "#facc15"], emoji: "🔥" },
  { id: "aurora", name: "Aurora Glow", unlockStreak: 7, colors: ["#10b981", "#22d3ee"], emoji: "🌌" },
  { id: "sapphire", name: "Sapphire Crown", unlockStreak: 14, colors: ["#2563eb", "#a78bfa"], emoji: "💎" },
  { id: "legend", name: "Legend Prism", unlockStreak: 30, colors: ["#f59e0b", "#ec4899"], emoji: "👑" },
] as const;

export function languageQuestStreakFrame(bestStreak: number): LanguageQuestStreakFrame {
  const streak = Math.max(0, Math.floor(Number.isFinite(bestStreak) ? bestStreak : 0));
  return [...LANGUAGE_QUEST_STREAK_FRAMES]
    .reverse()
    .find((frame) => frame.unlockStreak <= streak) ?? LANGUAGE_QUEST_STREAK_FRAMES[0];
}

/**
 * Original MRLC collectible companions. Their names, achievements, and visual
 * identity belong to Language Quest; no third-party game characters or card
 * artwork are used.
 */
export const LANGUAGE_QUEST_REWARD_CARDS: readonly LanguageQuestRewardCard[] = [
  {
    id: "lexibloom",
    level: 1,
    unlockXp: 0,
    name: "Lexibloom",
    epithet: "The Curious Sprout",
    achievement: "First Step",
    powerMove: "Brave Beginning",
    emoji: "🌱",
    rarity: "Starter",
    colors: ["#14532d", "#22c55e", "#bef264"],
  },
  {
    id: "echoquill",
    level: 2,
    unlockXp: 30,
    name: "Echoquill",
    epithet: "The Sound Seeker",
    achievement: "Careful Listener",
    powerMove: "Echo Recall",
    emoji: "🪶",
    rarity: "Bright",
    colors: ["#164e63", "#06b6d4", "#67e8f9"],
  },
  {
    id: "phraseflare",
    level: 3,
    unlockXp: 80,
    name: "Phraseflare",
    epithet: "The Sentence Spark",
    achievement: "Phrase Builder",
    powerMove: "Sentence Ignite",
    emoji: "🔥",
    rarity: "Bright",
    colors: ["#7c2d12", "#f97316", "#facc15"],
  },
  {
    id: "grammashell",
    level: 4,
    unlockXp: 150,
    name: "Grammashell",
    epithet: "The Pattern Keeper",
    achievement: "Pattern Finder",
    powerMove: "Structure Shield",
    emoji: "🐚",
    rarity: "Rare",
    colors: ["#312e81", "#6366f1", "#c4b5fd"],
  },
  {
    id: "verblume",
    level: 5,
    unlockXp: 250,
    name: "Verblume",
    epithet: "The Action Gardener",
    achievement: "Action Speaker",
    powerMove: "Verb Vine",
    emoji: "🌿",
    rarity: "Rare",
    colors: ["#064e3b", "#10b981", "#a7f3d0"],
  },
  {
    id: "tonetail",
    level: 6,
    unlockXp: 400,
    name: "Tonetail",
    epithet: "The Melody Guide",
    achievement: "Pronunciation Star",
    powerMove: "Perfect Pitch",
    emoji: "🎵",
    rarity: "Rare",
    colors: ["#581c87", "#a855f7", "#f0abfc"],
  },
  {
    id: "scriptora",
    level: 7,
    unlockXp: 600,
    name: "Scriptora",
    epithet: "The Ink Dancer",
    achievement: "Writing Wizard",
    powerMove: "Memory Mark",
    emoji: "🖋️",
    rarity: "Epic",
    colors: ["#172554", "#2563eb", "#7dd3fc"],
  },
  {
    id: "chatacrest",
    level: 8,
    unlockXp: 850,
    name: "Chatacrest",
    epithet: "The Friendly Voice",
    achievement: "Conversation Climber",
    powerMove: "Confidence Call",
    emoji: "💬",
    rarity: "Epic",
    colors: ["#831843", "#ec4899", "#f9a8d4"],
  },
  {
    id: "polyglow",
    level: 9,
    unlockXp: 1_150,
    name: "Polyglow",
    epithet: "The Many-Coloured Mind",
    achievement: "Language Explorer",
    powerMove: "Meaning Prism",
    emoji: "🌈",
    rarity: "Epic",
    colors: ["#4c1d95", "#7c3aed", "#22d3ee"],
  },
  {
    id: "fluencyra",
    level: 10,
    unlockXp: 1_500,
    name: "Fluencyra",
    epithet: "The Flow Keeper",
    achievement: "Confident Communicator",
    powerMove: "Fluent Flow",
    emoji: "🦋",
    rarity: "Legend",
    colors: ["#713f12", "#eab308", "#fef08a"],
  },
  {
    id: "wisdomane",
    level: 11,
    unlockXp: 1_950,
    name: "Wisdomane",
    epithet: "The Meaning Guardian",
    achievement: "Meaning Master",
    powerMove: "Context Roar",
    emoji: "🦁",
    rarity: "Legend",
    colors: ["#7f1d1d", "#ef4444", "#fdba74"],
  },
  {
    id: "luminova",
    level: 12,
    unlockXp: 2_500,
    name: "Luminova",
    epithet: "The Quest Light",
    achievement: "Language Quest Legend",
    powerMove: "Guiding Nova",
    emoji: "🌟",
    rarity: "Legend",
    colors: ["#1e1b4b", "#8b5cf6", "#f472b6"],
  },
] as const;

/**
 * Cultural-history rewards supplied by MRLC. The portraits are shown only
 * after unlocking; until then the learner sees a sealed mystery chest.
 */
export const LANGUAGE_QUEST_LEGENDARY_AWARDS: readonly LanguageQuestLegendaryAward[] = [
  {
    id: "king-ukkalapa",
    unlockXp: 3_000,
    name: "King Ukkalapa",
    reign: "BC 6th century",
    achievement: "Sacred Promise",
    virtue: "Heritage Guardian",
    description: "A legendary reward celebrating care for language, history, and shared heritage.",
  },
  {
    id: "king-siha-sudhamma",
    unlockXp: 3_500,
    name: "King Siha Sudhamma",
    reign: "BC 6th century",
    achievement: "Golden Resolve",
    virtue: "Realm Guardian",
    description: "A legendary reward for returning to the quest with focus and resolve.",
  },
  {
    id: "king-samala",
    unlockXp: 4_000,
    name: "King Samala",
    reign: "AD 593–605",
    achievement: "Dawn of Hongsawatoi",
    virtue: "Founding Vision",
    description: "A legendary reward for building strong foundations one lesson at a time.",
  },
  {
    id: "king-wimala",
    unlockXp: 4_500,
    name: "King Wimala",
    reign: "AD 605–612",
    achievement: "Steadfast Crown",
    virtue: "Enduring Discipline",
    description: "A legendary reward for steady practice and patient progress.",
  },
  {
    id: "king-asah",
    unlockXp: 5_000,
    name: "King Asah",
    reign: "AD 612–619",
    achievement: "Strength of the Land",
    virtue: "Persistent Practice",
    description: "A legendary reward for turning daily effort into lasting strength.",
  },
  {
    id: "king-wareru",
    unlockXp: 5_600,
    name: "King Wareru",
    reign: "AD 1281–1306",
    achievement: "Lawgiver's Wisdom",
    virtue: "Rule of Knowledge",
    description: "A legendary reward for learning patterns, meaning, and wise expression.",
  },
  {
    id: "king-rajadhirat",
    unlockXp: 6_200,
    name: "King Rajadhirat",
    reign: "AD 1385–1423",
    achievement: "Unbroken Courage",
    virtue: "Fluency Commander",
    description: "A legendary reward for meeting difficult language challenges with courage.",
  },
  {
    id: "queen-banya-htau",
    unlockXp: 6_900,
    name: "Queen Banya Htau",
    reign: "AD 1454–1472",
    achievement: "Golden Counsel",
    virtue: "Wisdom and Grace",
    description: "A legendary reward for communicating with clarity, wisdom, and grace.",
  },
  {
    id: "king-dhammachedi",
    unlockXp: 7_700,
    name: "King Dhammachedi",
    reign: "AD 1526–1538",
    achievement: "Pagoda Light",
    virtue: "Legendary Scholar",
    description: "The final vault reward, honoring a learner whose knowledge lights the way.",
  },
] as const;

export function languageQuestRewardProgress(points: number): LanguageQuestRewardProgress {
  const xp = Math.max(0, Math.floor(Number.isFinite(points) ? points : 0));
  let currentIndex = 0;
  for (let index = 1; index < LANGUAGE_QUEST_REWARD_CARDS.length; index += 1) {
    if (xp < LANGUAGE_QUEST_REWARD_CARDS[index].unlockXp) break;
    currentIndex = index;
  }

  const current = LANGUAGE_QUEST_REWARD_CARDS[currentIndex];
  const next = LANGUAGE_QUEST_REWARD_CARDS[currentIndex + 1] ?? null;
  const xpForNextLevel = next ? next.unlockXp - current.unlockXp : 0;
  const xpIntoLevel = next ? Math.min(xp - current.unlockXp, xpForNextLevel) : 0;

  return {
    level: current.level,
    title: current.achievement,
    xp,
    levelStartXp: current.unlockXp,
    nextLevelXp: next?.unlockXp ?? null,
    xpIntoLevel,
    xpForNextLevel,
    progressPercent: next && xpForNextLevel > 0
      ? Math.round((xpIntoLevel / xpForNextLevel) * 100)
      : 100,
    unlockedCardIds: LANGUAGE_QUEST_REWARD_CARDS
      .filter((card) => card.unlockXp <= xp)
      .map((card) => card.id),
    currentCardId: current.id,
    nextCardId: next?.id ?? null,
    unlockedLegendaryIds: LANGUAGE_QUEST_LEGENDARY_AWARDS
      .filter((award) => award.unlockXp <= xp)
      .map((award) => award.id),
    currentLegendaryId: [...LANGUAGE_QUEST_LEGENDARY_AWARDS]
      .reverse()
      .find((award) => award.unlockXp <= xp)?.id ?? null,
    nextLegendaryId: LANGUAGE_QUEST_LEGENDARY_AWARDS
      .find((award) => award.unlockXp > xp)?.id ?? null,
  };
}

export function newlyUnlockedLanguageQuestRewardIds(
  previousPoints: number,
  currentPoints: number,
): string[] {
  const previous = Math.max(0, Math.floor(Number.isFinite(previousPoints) ? previousPoints : 0));
  const current = Math.max(
    previous,
    Math.floor(Number.isFinite(currentPoints) ? currentPoints : previous),
  );
  return [...LANGUAGE_QUEST_REWARD_CARDS, ...LANGUAGE_QUEST_LEGENDARY_AWARDS]
    .filter((card) => card.unlockXp > previous && card.unlockXp <= current)
    .map((card) => card.id);
}

export function languageQuestRewardCardById(id: string | null | undefined): LanguageQuestRewardCard | null {
  return LANGUAGE_QUEST_REWARD_CARDS.find((card) => card.id === id) ?? null;
}

export function languageQuestLegendaryAwardById(
  id: string | null | undefined,
): LanguageQuestLegendaryAward | null {
  return LANGUAGE_QUEST_LEGENDARY_AWARDS.find((award) => award.id === id) ?? null;
}
