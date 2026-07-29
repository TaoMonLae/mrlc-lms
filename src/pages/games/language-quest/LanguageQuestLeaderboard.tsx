import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Flame, Medal, Sparkles, Star, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LanguageQuestAvatar } from '@/src/components/games/LanguageQuestAvatar';
import { apiGet } from '@/src/lib/api';
import { languageQuestRewardCardById } from '@/shared/languageQuestRewards';

interface LeaderboardPayload {
  currentUserId: string;
  currentUserRank: number;
  monthlyShowcase: {
    rank: number;
    userId: string;
    name: string;
    avatarId: string;
    monthXp: number;
    currentCardId: string;
    monthKey: string;
  }[];
  leaders: {
    rank: number;
    userId: string;
    name: string;
    role: string;
    avatarId: string;
    points: number;
    currentStreak: number;
  }[];
}

const rankTone: Record<number, string> = {
  1: 'bg-amber-400 text-amber-950',
  2: 'bg-slate-300 text-slate-700',
  3: 'bg-orange-300 text-orange-900',
};

export default function LanguageQuestLeaderboard() {
  const [data, setData] = useState<LeaderboardPayload | null>(null);

  useEffect(() => {
    apiGet<LeaderboardPayload>('/api/language-quest/leaderboard')
      .then(setData)
      .catch((error: any) => toast.error(error?.message || 'Could not load the leaderboard'));
  }, []);

  if (!data) return <div className="grid min-h-[420px] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <Button variant="ghost" className="-ml-2" render={<Link to="/games/language-quest" />} nativeButton={false}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Language Quest
      </Button>

      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-7 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/25"><Trophy className="h-8 w-8" /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">School-wide challenge</p>
            <h1 className="mt-1 text-3xl font-black">Language Leaderboard</h1>
            <p className="mt-1 text-sm text-white/80">Your current rank is #{data.currentUserRank}. Keep practising!</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-fuchsia-200 bg-gradient-to-br from-violet-950 via-fuchsia-950 to-slate-950 p-5 text-white shadow-lg dark:border-fuchsia-500/20 sm:p-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-amber-300" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-200">Monthly learner showcase</p>
            <h2 className="text-xl font-black">Celebrating consistent learning</h2>
          </div>
        </div>
        <p className="mt-2 text-xs leading-5 text-white/65">Top learning XP this month. This showcase has no comments, direct messages, or public profile links.</p>
        {data.monthlyShowcase.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-white/60">The month’s first learner can still take this spot.</p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {data.monthlyShowcase.map((learner) => {
              const card = languageQuestRewardCardById(learner.currentCardId);
              return (
                <article key={learner.userId} className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-3xl">{card?.emoji || '🌟'}</span>
                  <LanguageQuestAvatar avatarId={learner.avatarId} name={learner.name} className="mx-auto -mt-3 h-10 w-10 text-xl ring-2 ring-fuchsia-300" />
                  <p className="mt-2 truncate font-black">{learner.name}</p>
                  <p className="mt-1 text-xs font-bold text-amber-200">#{learner.rank} • {learner.monthXp} XP</p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
        {data.leaders.length === 0 ? (
          <div className="p-12 text-center">
            <Medal className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900 dark:text-white">No scores yet</p>
            <p className="mt-1 text-sm text-slate-500">Complete a lesson to take the first spot.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-surface-raised">
            {data.leaders.map((leader) => {
              const mine = leader.userId === data.currentUserId;
              return (
                <div key={leader.userId} className={`flex items-center gap-3 px-4 py-4 sm:px-6 ${mine ? 'bg-violet-50 dark:bg-violet-500/10' : ''}`}>
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black ${rankTone[leader.rank] || 'bg-slate-100 text-slate-500 dark:bg-surface-raised dark:text-slate-300'}`}>
                    {leader.rank <= 3 ? <Medal className="h-5 w-5" /> : leader.rank}
                  </div>
                  <LanguageQuestAvatar avatarId={leader.avatarId} name={leader.name} className="h-10 w-10 text-xl shadow-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-slate-900 dark:text-white">{leader.name}</p>
                      {mine && <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-300">You</Badge>}
                    </div>
                    <p className="text-xs capitalize text-slate-400">{leader.role.toLowerCase().replace('_', ' ')}</p>
                  </div>
                  <div className="hidden items-center gap-1 text-sm font-bold text-orange-500 sm:flex"><Flame className="h-4 w-4 fill-current" /> {leader.currentStreak}</div>
                  <div className="flex min-w-20 items-center justify-end gap-1 text-sm font-black text-amber-500"><Star className="h-4 w-4 fill-current" /> {leader.points}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
