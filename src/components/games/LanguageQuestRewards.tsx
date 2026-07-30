import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Lock, Sparkles, Star, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  LANGUAGE_QUEST_REWARD_CARDS,
  languageQuestLegendaryAwardById,
  languageQuestRewardCardById,
  languageQuestStreakFrame,
  type LanguageQuestRewardCard,
  type LanguageQuestRewardProgress,
  type LanguageQuestStreakFrame,
} from '@/shared/languageQuestRewards';
import { LanguageQuestLegendaryReveal } from './LanguageQuestLegendaryRewards';

const RARITY_STYLES: Record<LanguageQuestRewardCard['rarity'], string> = {
  Starter: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  Bright: 'border-cyan-300 bg-cyan-50 text-cyan-800',
  Rare: 'border-violet-300 bg-violet-50 text-violet-800',
  Epic: 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800',
  Legend: 'border-amber-300 bg-amber-50 text-amber-900',
};

const QUEST_CARD_CHAPTERS = [
  { id: 'trailhead', name: 'Trailhead', subtitle: 'Build the habit', startLevel: 1, endLevel: 4, tone: 'from-emerald-500 to-cyan-500' },
  { id: 'skillforge', name: 'Skillforge', subtitle: 'Strengthen the basics', startLevel: 5, endLevel: 8, tone: 'from-cyan-500 to-violet-500' },
  { id: 'explorers-rise', name: 'Explorer’s Rise', subtitle: 'Connect languages', startLevel: 9, endLevel: 12, tone: 'from-violet-500 to-fuchsia-500' },
  { id: 'scholars-ascent', name: 'Scholar’s Ascent', subtitle: 'Master deeper meaning', startLevel: 13, endLevel: 16, tone: 'from-fuchsia-500 to-rose-500' },
  { id: 'vaultbound', name: 'Vaultbound', subtitle: 'Prove legendary focus', startLevel: 17, endLevel: 20, tone: 'from-rose-500 to-amber-400' },
] as const;

export function LanguageQuestRewardCardView({
  card,
  unlocked,
  featured = false,
  frame,
}: {
  card: LanguageQuestRewardCard;
  unlocked: boolean;
  featured?: boolean;
  frame?: LanguageQuestStreakFrame;
}) {
  return (
    <article
      aria-label={unlocked ? `${card.name}, ${card.achievement}` : `Locked reward at level ${card.level}`}
      className={`group relative isolate aspect-[5/7] min-h-0 overflow-hidden rounded-[1.35rem] border-[3px] p-2 shadow-xl transition duration-300 [transform-style:preserve-3d] ${
        unlocked
          ? 'border-white/80 hover:z-10 hover:[transform:perspective(900px)_rotateX(3deg)_rotateY(-5deg)_translateY(-7px)_scale(1.02)]'
          : 'border-slate-400 bg-slate-300 dark:border-slate-600 dark:bg-slate-900'
      } ${featured ? 'ring-4 ring-amber-300/55' : ''}`}
      style={unlocked ? {
        background: `linear-gradient(145deg, ${card.colors[0]}, ${card.colors[1]} 58%, ${card.colors[2]})`,
        borderColor: frame?.colors[0],
        boxShadow: frame
          ? `0 0 0 3px ${frame.colors[1]}66, 0 22px 45px -24px ${card.colors[1]}`
          : `0 22px 45px -24px ${card.colors[1]}`,
      } : undefined}
    >
      {unlocked && (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-20 opacity-0 mix-blend-screen transition-opacity duration-300 group-hover:opacity-55"
            style={{
              backgroundImage: 'linear-gradient(115deg, transparent 18%, rgba(255,255,255,.75) 35%, rgba(103,232,249,.55) 43%, rgba(244,114,182,.55) 52%, transparent 68%)',
              backgroundSize: '220% 220%',
            }}
          />
          <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/20 blur-xl" />
        </>
      )}

      <div className={`relative z-10 flex h-full flex-col overflow-hidden rounded-[1rem] border ${unlocked ? 'border-white/35 bg-slate-950/25 text-white backdrop-blur-[2px]' : 'border-slate-400 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-300'}`}>
        <header className="flex items-center justify-between gap-2 border-b border-current/15 px-3 py-2">
          <span className="truncate text-[10px] font-black uppercase tracking-[0.16em]">
            {unlocked ? card.rarity : 'Mystery'}
          </span>
          <span className="shrink-0 text-[10px] font-black">LV {card.level}</span>
        </header>

        <div className={`relative mx-2 mt-2 grid flex-1 place-items-center overflow-hidden rounded-xl border ${unlocked ? 'border-white/25 bg-white/12' : 'border-dashed border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-900'}`}>
          <div className={`absolute inset-0 ${unlocked ? 'bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,.35),transparent_60%)]' : ''}`} />
          <span className={`relative select-none drop-shadow-lg ${unlocked ? 'text-6xl sm:text-7xl' : 'text-5xl grayscale'}`} aria-hidden="true">
            {unlocked ? card.emoji : '❔'}
          </span>
          {featured && unlocked && (
            <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-amber-300 text-amber-950 shadow-lg" title="Current companion">
              <Crown className="h-4 w-4" />
            </span>
          )}
        </div>

        <div className="px-3 pb-3 pt-2">
          <h3 className="truncate text-base font-black leading-tight sm:text-lg">{unlocked ? card.name : 'Locked companion'}</h3>
          <p className={`mt-0.5 truncate text-[10px] font-bold ${unlocked ? 'text-white/75' : 'text-slate-600 dark:text-slate-400'}`}>
            {unlocked ? card.epithet : `Reach ${card.unlockXp} XP`}
          </p>
          <div className={`mt-2 rounded-lg border px-2 py-1.5 ${unlocked ? 'border-white/20 bg-black/15' : 'border-slate-300 bg-white/50 dark:border-slate-700 dark:bg-slate-900'}`}>
            <p className="text-[9px] font-black uppercase tracking-wider opacity-70">Achievement</p>
            <p className="mt-0.5 truncate text-[11px] font-black">{unlocked ? card.achievement : 'Keep learning to reveal'}</p>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-wide opacity-80">
            <span>{unlocked ? card.powerMove : '???'}</span>
            <span>{card.unlockXp} XP</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function LanguageQuestRewardTrack({
  rewards,
  bestStreak = 0,
}: {
  rewards: LanguageQuestRewardProgress;
  bestStreak?: number;
}) {
  const current = languageQuestRewardCardById(rewards.currentCardId);
  const next = languageQuestRewardCardById(rewards.nextCardId);
  const featuredCard = current ?? next;
  const remaining = rewards.nextLevelXp === null ? 0 : rewards.nextLevelXp - rewards.xp;
  const frame = languageQuestStreakFrame(bestStreak);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-950 p-5 text-white shadow-xl sm:p-6 dark:border-violet-500/25">
      <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-fuchsia-400/15 blur-2xl" />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-amber-300/25 bg-amber-300/15 text-amber-200 hover:bg-amber-300/15">
              <Trophy className="h-3 w-3" /> {rewards.level === 0 ? 'Level 0' : `Level ${rewards.level}`}
            </Badge>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-violet-200">{rewards.title}</span>
          </div>
          <h2 className="mt-4 text-2xl font-black sm:text-3xl">
            {current ? `${current.name} joined your quest!` : 'Earn your first Quest Card'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-100/80">
            Every correct first answer earns XP. Your first companion unlocks at 100 XP, and every later card demands a bigger learning milestone.
          </p>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-4 text-xs font-bold">
              <span>{rewards.xp.toLocaleString()} XP</span>
              <span>{next ? `${remaining} XP to ${next.name}` : 'All current cards unlocked'}</span>
            </div>
            <Progress value={rewards.progressPercent} className="mt-2 [&_[data-slot=progress-track]]:h-3 [&_[data-slot=progress-track]]:bg-white/15 [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-amber-300 [&_[data-slot=progress-indicator]]:to-fuchsia-400" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {QUEST_CARD_CHAPTERS.map((chapter) => {
              const complete = rewards.level >= chapter.endLevel;
              const active = rewards.level < chapter.startLevel
                ? chapter.startLevel === Math.max(1, rewards.level + 1)
                : rewards.level <= chapter.endLevel;
              return (
                <div key={chapter.id} className={`rounded-xl border px-2.5 py-2 ${complete ? 'border-emerald-300/40 bg-emerald-300/15' : active ? 'border-amber-300/50 bg-white/10' : 'border-white/10 bg-black/10 opacity-60'}`}>
                  <p className="truncate text-[10px] font-black uppercase tracking-wider">{chapter.name}</p>
                  <p className="mt-0.5 text-[9px] font-bold text-white/60">LV {chapter.startLevel}–{chapter.endLevel}{complete ? ' • ✓' : ''}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button className="bg-white font-black text-violet-950 hover:bg-violet-50" render={<Link to="/games/language-quest/profile#quest-cards" />} nativeButton={false}>
              <Sparkles className="mr-2 h-4 w-4" /> View my collection
            </Button>
            <span className="text-xs font-semibold text-violet-200">
              {rewards.unlockedCardIds.length}/{LANGUAGE_QUEST_REWARD_CARDS.length} cards unlocked
            </span>
            <span className="text-xs font-semibold text-amber-200">
              {frame.emoji} {frame.name} frame
            </span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[230px]">
          {featuredCard && (
            <LanguageQuestRewardCardView
              card={featuredCard}
              unlocked={Boolean(current)}
              featured={Boolean(current)}
              frame={current ? frame : undefined}
            />
          )}
        </div>
      </div>
    </section>
  );
}

export function LanguageQuestRewardCollection({
  rewards,
  bestStreak = 0,
}: {
  rewards: LanguageQuestRewardProgress;
  bestStreak?: number;
}) {
  const unlocked = new Set(rewards.unlockedCardIds);
  const frame = languageQuestStreakFrame(bestStreak);
  const currentChapter = QUEST_CARD_CHAPTERS.find((chapter) =>
    rewards.level >= chapter.startLevel && rewards.level <= chapter.endLevel)
    ?? (rewards.level === 0 ? QUEST_CARD_CHAPTERS[0] : QUEST_CARD_CHAPTERS.at(-1)!);
  const [activeChapterId, setActiveChapterId] = useState(currentChapter.id);
  const activeChapter = QUEST_CARD_CHAPTERS.find((chapter) => chapter.id === activeChapterId)
    ?? currentChapter;
  const activeChapterIndex = QUEST_CARD_CHAPTERS.findIndex((chapter) => chapter.id === activeChapter.id);
  const activeCards = LANGUAGE_QUEST_REWARD_CARDS.filter((card) =>
    card.level >= activeChapter.startLevel && card.level <= activeChapter.endLevel);
  const activeUnlocked = activeCards.filter((card) => unlocked.has(card.id)).length;

  return (
    <section id="quest-cards" className="scroll-mt-28 rounded-3xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white p-5 shadow-sm dark:border-violet-500/20 dark:from-violet-950/30 dark:to-slate-950/70 sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-fuchsia-500 text-white shadow-lg"><Sparkles className="h-5 w-5" /></span>
            <div>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">My Quest Cards</h2>
              <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Level {rewards.level} • {rewards.title}</p>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            These original MRLC learning companions must be earned through study. The milestones become harder as you climb toward Level {LANGUAGE_QUEST_REWARD_CARDS.length} and the Legendary Vault.
          </p>
        </div>
        <Badge className="w-fit border-violet-200 bg-white text-violet-800 hover:bg-white dark:border-violet-500/25 dark:bg-slate-900 dark:text-violet-200">
          <Star className="h-3 w-3 fill-current" /> {rewards.xp.toLocaleString()} XP • {frame.emoji} {frame.name}
        </Badge>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-5" role="tablist" aria-label="Quest Card chapters">
        {QUEST_CARD_CHAPTERS.map((chapter, chapterIndex) => {
          const chapterCards = LANGUAGE_QUEST_REWARD_CARDS.filter((card) =>
            card.level >= chapter.startLevel && card.level <= chapter.endLevel);
          const chapterUnlocked = chapterCards.filter((card) => unlocked.has(card.id)).length;
          const selected = chapter.id === activeChapter.id;
          return (
            <button
              key={chapter.id}
              type="button"
              role="tab"
              id={`quest-chapter-tab-${chapter.id}`}
              aria-selected={selected}
              aria-controls="quest-chapter-panel"
              onClick={() => setActiveChapterId(chapter.id)}
              className={`relative overflow-hidden rounded-2xl border p-3 text-left outline-none transition hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-violet-300/50 ${
                selected
                  ? 'border-violet-500 bg-white shadow-lg ring-2 ring-violet-200 dark:bg-slate-900 dark:ring-violet-500/20'
                  : 'border-violet-100 bg-white/60 hover:border-violet-300 dark:border-violet-500/15 dark:bg-slate-950/40'
              }`}
            >
              <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${chapter.tone}`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chapter {chapterIndex + 1}</span>
              <span className="mt-1 block truncate text-xs font-black text-slate-950 dark:text-white">{chapter.name}</span>
              <span className="mt-1 block text-[10px] font-bold text-violet-700 dark:text-violet-300">{chapterUnlocked}/{chapterCards.length} earned</span>
            </button>
          );
        })}
      </div>

      <section
        id="quest-chapter-panel"
        role="tabpanel"
        aria-labelledby={`quest-chapter-tab-${activeChapter.id}`}
        className="mt-6 rounded-3xl border border-violet-100 bg-white/55 p-4 dark:border-violet-500/15 dark:bg-slate-950/35 sm:p-5"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${activeChapter.tone} text-sm font-black text-white shadow-lg`}>{activeChapterIndex + 1}</span>
            <div>
              <h3 className="font-black text-slate-950 dark:text-white">{activeChapter.name}</h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{activeChapter.subtitle} • Levels {activeChapter.startLevel}–{activeChapter.endLevel}</p>
            </div>
          </div>
          <span className="text-xs font-black text-violet-700 dark:text-violet-300">{activeUnlocked}/{activeCards.length} earned</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {activeCards.map((card) => (
            <LanguageQuestRewardCardView
              key={card.id}
              card={card}
              unlocked={unlocked.has(card.id)}
              featured={card.id === rewards.currentCardId}
              frame={unlocked.has(card.id) ? frame : undefined}
            />
          ))}
        </div>
      </section>
    </section>
  );
}

export function LanguageQuestRewardReveal({
  cardId,
  open,
  onOpenChange,
}: {
  cardId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const legendary = languageQuestLegendaryAwardById(cardId);
  if (legendary) {
    return (
      <LanguageQuestLegendaryReveal
        awardId={legendary.id}
        open={open}
        onOpenChange={onOpenChange}
      />
    );
  }
  const card = languageQuestRewardCardById(cardId);
  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-0 bg-gradient-to-b from-violet-950 to-slate-950 p-5 text-white sm:max-w-md" showCloseButton={false}>
        <DialogHeader className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-300 text-amber-950 shadow-lg shadow-amber-300/30">
            <Trophy className="h-6 w-6" />
          </div>
          <DialogTitle className="mt-2 text-2xl font-black text-white">New Quest Card unlocked!</DialogTitle>
          <DialogDescription className="text-violet-200">
            Level {card.level} reached • Achievement: {card.achievement}
          </DialogDescription>
        </DialogHeader>
        <div className="mx-auto w-full max-w-[240px] py-2">
          <LanguageQuestRewardCardView card={card} unlocked featured />
        </div>
        <Button className="h-12 bg-white font-black text-violet-950 hover:bg-violet-50" onClick={() => onOpenChange(false)}>
          Add to my collection
        </Button>
      </DialogContent>
    </Dialog>
  );
}
