import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, CheckCircle2, Clock3, Gift, Link2, Sparkles, Target, Users, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { apiGet, apiSend } from '@/src/lib/api';
import type { LanguageQuestCourseSummary } from '@/src/types/languageQuest';
import {
  LANGUAGE_QUEST_REWARD_CARDS,
  languageQuestRewardProgress,
} from '@/shared/languageQuestRewards';
import type { LanguageQuestMissionProgress } from '@/shared/languageQuestEngagement';
import { LanguageQuestRewardReveal } from './LanguageQuestRewards';

interface ClassroomChallenge {
  id: string;
  classroomName: string;
  title: string;
  description: string | null;
  targetXp: number;
  progressXp: number;
  progressPercent: number;
  rewardLabel: string | null;
  endsAt: string;
  complete: boolean;
}

interface EngagementPayload {
  missions: LanguageQuestMissionProgress[];
  classroomChallenges: ClassroomChallenge[];
  masteryDueCount: number;
  masteryWeakCount: number;
}

export function LanguageQuestEngagement({ onXpChanged }: { onXpChanged?: () => void }) {
  const [data, setData] = useState<EngagementPayload | null>(null);
  const [claiming, setClaiming] = useState('');
  const [unlockedAwardId, setUnlockedAwardId] = useState<string | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);

  const load = useCallback(() => {
    apiGet<EngagementPayload>('/api/language-quest/engagement')
      .then(setData)
      .catch((error: any) => toast.error(error?.message || 'Could not load learner missions'));
  }, []);

  useEffect(load, [load]);

  const claim = async (mission: LanguageQuestMissionProgress) => {
    setClaiming(mission.key);
    try {
      const result = await apiSend<{ unlockedRewardIds?: string[] }>(
        `/api/language-quest/missions/${mission.key}/claim`,
        'POST',
      );
      toast.success(`+${mission.rewardXp} XP claimed from ${mission.title}`);
      const newestAwardId = result.unlockedRewardIds?.at(-1);
      if (newestAwardId) {
        setUnlockedAwardId(newestAwardId);
        setRevealOpen(true);
      }
      load();
      onXpChanged?.();
    } catch (error: any) {
      toast.error(error?.message || 'Could not claim this mission');
    } finally {
      setClaiming('');
    }
  };

  if (!data) return null;

  return (
    <>
      <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <div className="rounded-3xl border border-violet-200 bg-white/90 p-5 shadow-sm dark:border-violet-500/20 dark:bg-slate-900/85 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Daily &amp; weekly missions</p>
            <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Small goals, extra XP</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="rounded-xl" render={<Link to="/games/language-quest/mastery" />} nativeButton={false}>
              <Brain className="mr-2 h-4 w-4" /> Mastery {data.masteryDueCount > 0 ? `(${data.masteryDueCount})` : ''}
            </Button>
            {data.masteryWeakCount > 0 && (
              <Button variant="outline" className="rounded-xl border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200" render={<Link to="/games/language-quest/mastery?mode=weak" />} nativeButton={false}>
                <Target className="mr-2 h-4 w-4" /> Weak Areas ({data.masteryWeakCount})
              </Button>
            )}
            {data.masteryDueCount > 0 && (
              <>
                <Button className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" render={<Link to="/games/language-quest/mastery?mode=chain" />} nativeButton={false}>
                  <Link2 className="mr-2 h-4 w-4" /> Daily Chain
                </Button>
                <Button className="rounded-xl bg-orange-600 text-white hover:bg-orange-700" render={<Link to="/games/language-quest/mastery?mode=lightning" />} nativeButton={false}>
                  <Zap className="mr-2 h-4 w-4" /> Lightning Round
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {data.missions.map((mission) => (
            <article key={mission.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/70">
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">{mission.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-black text-slate-900 dark:text-white">{mission.title}</h3>
                    <Badge variant="outline">+{mission.rewardXp} XP</Badge>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{mission.description}</p>
                  <Progress value={mission.progressPercent} className="mt-3" />
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs font-bold text-slate-500">
                    <span>{Math.min(mission.progress, mission.target)}/{mission.target}</span>
                    {mission.claimed ? (
                      <span className="text-emerald-600"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> Claimed</span>
                    ) : mission.claimable ? (
                      <Button size="sm" onClick={() => claim(mission)} disabled={claiming === mission.key} className="h-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                        <Gift className="mr-1 h-3.5 w-3.5" /> {claiming === mission.key ? 'Claiming…' : 'Claim'}
                      </Button>
                    ) : <span>{mission.period === 'daily' ? 'Today' : 'This week'}</span>}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50 p-5 shadow-sm dark:border-sky-500/20 dark:from-sky-950/25 dark:to-cyan-950/20 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-600 text-white"><Users className="h-5 w-5" /></span>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">Classroom team goals</p>
            <h2 className="font-black text-slate-950 dark:text-white">Learn together</h2>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {data.classroomChallenges.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-sky-200 bg-white/60 p-6 text-center text-sm text-slate-500 dark:border-sky-500/25 dark:bg-slate-950/35 dark:text-slate-300">
              Join a classroom to take part in teacher-created XP goals.
            </div>
          ) : data.classroomChallenges.map((challenge) => (
            <article key={challenge.id} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-sky-600 dark:text-sky-300">{challenge.classroomName}</p>
                  <h3 className="mt-0.5 font-black text-slate-900 dark:text-white">{challenge.title}</h3>
                </div>
                {challenge.complete && <Sparkles className="h-5 w-5 text-amber-500" />}
              </div>
              <Progress value={challenge.progressPercent} className="mt-3" />
              <div className="mt-2 flex items-center justify-between gap-2 text-xs font-bold text-slate-500">
                <span>{challenge.progressXp}/{challenge.targetXp} XP</span>
                <span><Clock3 className="mr-1 inline h-3.5 w-3.5" /> {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(challenge.endsAt))}</span>
              </div>
              {challenge.rewardLabel && <p className="mt-2 text-xs font-bold text-amber-700 dark:text-amber-300">Team reward: {challenge.rewardLabel}</p>}
            </article>
          ))}
        </div>
      </div>
      </section>
      <LanguageQuestRewardReveal
        cardId={unlockedAwardId}
        open={revealOpen}
        onOpenChange={setRevealOpen}
      />
    </>
  );
}

export function LanguageQuestLanguageAlbums({ courses }: { courses: LanguageQuestCourseSummary[] }) {
  const albums = useMemo(() => {
    const grouped = new Map<string, { language: string; emoji: string; completed: number; total: number }>();
    courses.forEach((course) => {
      const current = grouped.get(course.language) || {
        language: course.language,
        emoji: course.imageEmoji,
        completed: 0,
        total: 0,
      };
      current.completed += course.completedChallenges;
      current.total += course.challengeCount;
      grouped.set(course.language, current);
    });
    return [...grouped.values()];
  }, [courses]);

  return (
    <section className="rounded-3xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-white to-amber-50 p-5 shadow-sm dark:border-fuchsia-500/20 dark:from-fuchsia-950/20 dark:via-slate-950 dark:to-amber-950/15 sm:p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-700 dark:text-fuchsia-300">Language albums</p>
        <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">A card journey for every language</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Each completed challenge fills that language’s album. No purchases or random packs.</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {albums.map((album) => {
          const progress = languageQuestRewardProgress(album.completed * 10);
          const card = LANGUAGE_QUEST_REWARD_CARDS.find((item) => item.id === progress.currentCardId)
            ?? LANGUAGE_QUEST_REWARD_CARDS[0];
          const hasCompanion = progress.currentCardId !== null;
          const percent = album.total ? Math.round((album.completed / album.total) * 100) : 0;
          return (
            <article key={album.language} className="relative overflow-hidden rounded-2xl border border-white/70 bg-slate-950 p-4 text-white shadow-lg">
              <div className="absolute inset-0 opacity-50" style={{ background: `radial-gradient(circle at 100% 0%, ${card.colors[1]}, transparent 55%)` }} />
              <div className="relative flex items-center gap-4">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-4xl">{hasCompanion ? card.emoji : '❔'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-wider text-white/65">{album.emoji} {album.language}</p>
                  <h3 className="truncate text-lg font-black">{hasCompanion ? card.name : 'First card awaits'}</h3>
                  <p className="text-xs text-white/70">{progress.unlockedCardIds.length}/{LANGUAGE_QUEST_REWARD_CARDS.length} album cards</p>
                </div>
              </div>
              <Progress value={percent} className="relative mt-4 [&_[data-slot=progress-track]]:bg-white/15" />
              <p className="relative mt-2 text-xs font-bold text-white/70">{album.completed}/{album.total} challenges complete</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
