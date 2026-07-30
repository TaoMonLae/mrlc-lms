import type { LanguageQuestRewardProgress } from '@/shared/languageQuestRewards';
import { languageQuestRewardCardById } from '@/shared/languageQuestRewards';

export type LanguageQuestCompanionReaction = 'idle' | 'correct' | 'incorrect';

interface LanguageQuestCompanionProps {
  rewards: LanguageQuestRewardProgress | null | undefined;
  reaction: LanguageQuestCompanionReaction;
  reducedMotion: boolean;
  size?: 'sm' | 'md';
}

const SIZE_CLASSES = {
  sm: 'h-10 w-10 text-xl',
  md: 'h-14 w-14 text-3xl',
} as const;

/**
 * A small persistent companion badge built from the learner's own unlocked
 * reward card (no separate mascot art to maintain -- it just reuses the
 * emoji and colors from whichever card is currently active). Reacts with a
 * quick cheer or shake so quiz feedback has a friendly face attached to it,
 * and falls back to a generic sparkle before the first card unlocks at 100 XP.
 */
export function LanguageQuestCompanion({ rewards, reaction, reducedMotion, size = 'md' }: LanguageQuestCompanionProps) {
  const card = languageQuestRewardCardById(rewards?.currentCardId);
  const emoji = card?.emoji ?? '✨';
  const colors = card?.colors ?? ['#7c3aed', '#a855f7', '#c084fc'];
  const animationClass = reducedMotion
    ? ''
    : reaction === 'correct'
      ? 'lq-companion-cheer'
      : reaction === 'incorrect'
        ? 'lq-companion-shake'
        : '';

  return (
    <span
      role="img"
      aria-label={card ? `${card.name}, your Language Quest companion` : 'Your Language Quest companion'}
      title={card?.name ?? 'Your companion'}
      className={`grid shrink-0 place-items-center rounded-full shadow-md ring-2 ring-white dark:ring-slate-900 ${SIZE_CLASSES[size]} ${animationClass}`}
      style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]})` }}
    >
      {emoji}
    </span>
  );
}
