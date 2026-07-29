import { Crown, Gem, LockKeyhole, Sparkles, Star, Trophy } from 'lucide-react';
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
  LANGUAGE_QUEST_LEGENDARY_AWARDS,
  LANGUAGE_QUEST_REWARD_CARDS,
  languageQuestLegendaryAwardById,
  type LanguageQuestLegendaryAward,
  type LanguageQuestRewardProgress,
} from '@/shared/languageQuestRewards';

import renownedKingsArt from '@/Mon_Kings_Cards/Renowned Mon Kings in History.jpg';
import kingUkkalapaArt from '@/Mon_Kings_Cards/King Ukkalapa.jpg';
import kingSihaSudhammaArt from '@/Mon_Kings_Cards/Kng Siha Sudhamma.jpg';
import kingSamalaArt from '@/Mon_Kings_Cards/King Samala.jpg';
import kingWimalaArt from '@/Mon_Kings_Cards/King Wimala .jpg';
import kingAsahArt from '@/Mon_Kings_Cards/King Asah.jpg';
import kingWareruArt from '@/Mon_Kings_Cards/Wareru.jpg';
import kingRajadhiratArt from '@/Mon_Kings_Cards/rajadhirat.jpg';
import queenBanyaHtauArt from '@/Mon_Kings_Cards/Queen Banya Htau.jpg';
import kingDhammachediArt from '@/Mon_Kings_Cards/634661279_2722801658071987_7324200782209241142_n.jpg';

const LEGENDARY_ART: Record<string, string> = {
  'king-ukkalapa': kingUkkalapaArt,
  'king-siha-sudhamma': kingSihaSudhammaArt,
  'king-samala': kingSamalaArt,
  'king-wimala': kingWimalaArt,
  'king-asah': kingAsahArt,
  'king-wareru': kingWareruArt,
  'king-rajadhirat': kingRajadhiratArt,
  'queen-banya-htau': queenBanyaHtauArt,
  'king-dhammachedi': kingDhammachediArt,
};

function LegendaryMysteryChest({ small = false }: { small?: boolean }) {
  return (
    <div className={`lq-legendary-chest relative ${small ? 'scale-75' : ''}`} aria-hidden="true">
      <div className="lq-legendary-chest-glow" />
      <div className="lq-legendary-chest-lid">
        <span className="lq-legendary-chest-band" />
      </div>
      <div className="lq-legendary-chest-base">
        <span className="lq-legendary-chest-lock"><LockKeyhole className="h-5 w-5" /></span>
      </div>
    </div>
  );
}

function LegendaryAwardCard({
  award,
  unlocked,
  featured,
}: {
  award: LanguageQuestLegendaryAward;
  unlocked: boolean;
  featured: boolean;
}) {
  return (
    <article
      aria-label={unlocked ? `${award.name}, legendary award` : `Mystery legendary award at ${award.unlockXp} XP`}
      className={`group relative overflow-hidden rounded-[1.6rem] border-2 p-2 shadow-xl ${
        unlocked
          ? 'border-amber-300 bg-gradient-to-br from-amber-200 via-yellow-500 to-amber-800'
          : 'border-amber-700/40 bg-gradient-to-b from-slate-900 to-amber-950/60'
      } ${featured ? 'ring-4 ring-yellow-300/45' : ''}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_0%,rgba(255,255,255,.8),transparent_30%)] opacity-50" />
      <div className="relative overflow-hidden rounded-[1.15rem] border border-amber-100/50 bg-slate-950">
        {unlocked ? (
          <>
            <img
              src={LEGENDARY_ART[award.id]}
              alt={`Historical portrait card of ${award.name}`}
              className="aspect-[3/4] w-full object-cover object-top transition duration-500 group-hover:scale-[1.025]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent px-4 pb-4 pt-16 text-white">
              <Badge className="border-amber-300/30 bg-amber-300/20 text-amber-100 hover:bg-amber-300/20">
                <Crown className="h-3 w-3" /> Legendary
              </Badge>
              <h3 className="mt-2 text-lg font-black leading-tight">{award.name}</h3>
              <p className="mt-0.5 text-xs font-bold text-amber-200">{award.reign}</p>
              <p className="mt-2 text-xs font-black uppercase tracking-wider text-white/80">{award.achievement}</p>
            </div>
          </>
        ) : (
          <div className="grid aspect-[3/4] place-items-center bg-[radial-gradient(circle_at_50%_45%,rgba(245,158,11,.22),transparent_45%)] p-5 text-center">
            <div>
              <LegendaryMysteryChest small />
              <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-amber-200">Sealed legend</p>
              <p className="mt-1 text-xs font-bold text-amber-100/60">Reach {award.unlockXp.toLocaleString()} XP</p>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export function LanguageQuestLegendaryVault({
  rewards,
  expanded = false,
}: {
  rewards: LanguageQuestRewardProgress;
  expanded?: boolean;
}) {
  const unlocked = new Set(rewards.unlockedLegendaryIds);
  const current = languageQuestLegendaryAwardById(rewards.currentLegendaryId);
  const next = languageQuestLegendaryAwardById(rewards.nextLegendaryId);
  const questCardGateXp = LANGUAGE_QUEST_REWARD_CARDS.at(-1)!.unlockXp;
  const previousThreshold = current?.unlockXp ?? questCardGateXp;
  const nextThreshold = next?.unlockXp ?? LANGUAGE_QUEST_LEGENDARY_AWARDS.at(-1)!.unlockXp;
  const progress = next
    ? Math.max(0, Math.min(100, Math.round(((rewards.xp - previousThreshold) / (nextThreshold - previousThreshold)) * 100)))
    : 100;

  return (
    <section id="legendary-vault" className="relative scroll-mt-28 overflow-hidden rounded-3xl border border-amber-400/40 bg-gradient-to-br from-[#120b02] via-[#301b05] to-[#090601] p-5 text-white shadow-2xl sm:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_20%_15%,#fef3c7_0,transparent_18%),radial-gradient(circle_at_85%_5%,#f59e0b_0,transparent_24%)]" />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_280px] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-amber-300/30 bg-amber-300/15 text-amber-100 hover:bg-amber-300/15">
              <Crown className="h-3 w-3" /> Legendary Vault
            </Badge>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-amber-200/70">
              {unlocked.size}/{LANGUAGE_QUEST_LEGENDARY_AWARDS.length} historical cards
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-black text-amber-50 sm:text-3xl">
            {current ? `${current.name} has entered your legend.` : `A golden mystery waits beyond Level ${LANGUAGE_QUEST_REWARD_CARDS.length}.`}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-100/70">
            Complete the full Quest Card path, then continue earning learning XP to open sealed golden chests and reveal MRLC’s Mon history collection. Every portrait stays hidden until its milestone is reached.
          </p>
          <div className="mt-5 max-w-xl">
            <div className="flex justify-between gap-3 text-xs font-bold text-amber-100/75">
              <span>{rewards.xp.toLocaleString()} XP</span>
              <span>{next ? `${Math.max(0, next.unlockXp - rewards.xp).toLocaleString()} XP to next chest` : 'Legendary collection complete'}</span>
            </div>
            <Progress value={progress} className="mt-2 [&_[data-slot=progress-track]]:bg-white/10 [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-amber-600 [&_[data-slot=progress-indicator]]:via-yellow-300 [&_[data-slot=progress-indicator]]:to-amber-500" />
          </div>
        </div>
        <div className="relative mx-auto h-52 w-full max-w-[280px] overflow-hidden rounded-2xl border border-amber-300/35 bg-black shadow-xl shadow-amber-600/10">
          <img src={renownedKingsArt} alt="Renowned Mon Kings in History collection overview" className="h-full w-full object-cover object-top opacity-75" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-amber-200/10" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className="font-black text-amber-50">Renowned Mon Kings in History</p>
            <p className="mt-1 text-xs text-amber-100/70">Mystery • Heritage • Achievement</p>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="relative mt-7 border-t border-amber-300/15 pt-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300 text-amber-950"><Gem className="h-5 w-5" /></span>
            <div>
              <h3 className="font-black text-amber-50">My legendary history collection</h3>
              <p className="text-xs text-amber-100/60">Locked portraits stay secret until their golden chest opens.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {LANGUAGE_QUEST_LEGENDARY_AWARDS.map((award) => (
              <LegendaryAwardCard
                key={award.id}
                award={award}
                unlocked={unlocked.has(award.id)}
                featured={award.id === rewards.currentLegendaryId}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function LanguageQuestLegendaryReveal({
  awardId,
  open,
  onOpenChange,
}: {
  awardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const award = languageQuestLegendaryAwardById(awardId);
  if (!award) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border border-amber-300/40 bg-[#080501] p-0 text-white shadow-[0_0_120px_rgba(245,158,11,.32)] sm:max-w-xl" showCloseButton={false}>
        <div className="relative min-h-[650px] overflow-hidden px-5 pb-6 pt-8 sm:min-h-[700px]">
          <div className="lq-legendary-rays pointer-events-none absolute left-1/2 top-[42%] h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2" />
          <div className="lq-legendary-spark lq-legendary-spark-a" />
          <div className="lq-legendary-spark lq-legendary-spark-b" />
          <div className="lq-legendary-spark lq-legendary-spark-c" />

          <DialogHeader className="relative z-20 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-yellow-200 to-amber-500 text-amber-950 shadow-lg shadow-amber-400/30">
              <Trophy className="h-6 w-6" />
            </div>
            <DialogTitle className="mt-2 text-2xl font-black text-amber-50">Legendary chest unlocked!</DialogTitle>
            <DialogDescription className="text-amber-200/80">
              {award.unlockXp.toLocaleString()} XP milestone • {award.achievement}
            </DialogDescription>
          </DialogHeader>

          <div className="relative z-10 mx-auto mt-2 h-[410px] max-w-[280px]">
            <div className="lq-legendary-card-rise absolute inset-x-7 top-0 overflow-hidden rounded-2xl border-4 border-yellow-300 bg-amber-200 shadow-[0_0_55px_rgba(250,204,21,.65)]">
              <img src={LEGENDARY_ART[award.id]} alt={`Historical portrait card of ${award.name}`} className="aspect-[3/4] w-full object-cover object-top" />
            </div>
            <div className="lq-reveal-chest absolute inset-x-0 bottom-2 h-40">
              <div className="lq-reveal-chest-lid" />
              <div className="lq-reveal-chest-base">
                <span><Star className="h-7 w-7 fill-current" /></span>
              </div>
            </div>
          </div>

          <div className="relative z-20 -mt-1 text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">{award.virtue}</p>
            <h3 className="mt-1 text-2xl font-black text-white">{award.name}</h3>
            <p className="mt-1 text-sm font-bold text-amber-200">{award.reign}</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-amber-50/70">{award.description}</p>
            <Button onClick={() => onOpenChange(false)} className="mt-5 bg-gradient-to-r from-amber-500 to-yellow-300 font-black text-amber-950 shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-yellow-200">
              <Sparkles className="mr-2 h-4 w-4" /> Add to my legendary vault
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
