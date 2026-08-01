import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Flame, Globe2, Layers3, Medal, Shield, Sparkles, Star, Trophy, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LanguageQuestAvatar } from '@/src/components/games/LanguageQuestAvatar';
import { apiGet, qs } from '@/src/lib/api';
import { languageQuestRewardCardById } from '@/shared/languageQuestRewards';
import type { LanguageQuestLeaderboardScope, LanguageQuestLeague } from '@/shared/languageQuestLeaderboard';

interface LeaderboardPayload {
  currentUserId: string;
  currentUserRank: number | null;
  scope: LanguageQuestLeaderboardScope;
  selection: { label: string; metricLabel: string; periodStart: string | null };
  filters: {
    courses: { id: string; title: string; category: string; imageEmoji: string }[];
    categories: string[];
    classrooms: { id: string; name: string; focusCourseTitle: string | null }[];
  };
  league: LanguageQuestLeague | null;
  monthlyShowcase: {
    rank: number;
    userId: string;
    name: string;
    avatarId: string;
    monthXp: number;
    currentCardId: string | null;
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

interface LeaderboardQuery {
  scope: LanguageQuestLeaderboardScope;
  courseId: string;
  category: string;
  classroomId: string;
}

const rankTone: Record<number, string> = {
  1: 'bg-amber-400 text-amber-950',
  2: 'bg-slate-300 text-slate-700',
  3: 'bg-orange-300 text-orange-900',
};

const scopes: { value: LanguageQuestLeaderboardScope; label: string; icon: typeof Globe2 }[] = [
  { value: 'global', label: 'Global', icon: Globe2 },
  { value: 'league', label: 'My League', icon: Shield },
  { value: 'course', label: 'Course', icon: BookOpen },
  { value: 'category', label: 'Category', icon: Layers3 },
  { value: 'classroom', label: 'Classroom', icon: Users },
];

export default function LanguageQuestLeaderboard() {
  const [data, setData] = useState<LeaderboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState<LeaderboardQuery>({ scope: 'global', courseId: '', category: '', classroomId: '' });

  useEffect(() => {
    setLoading(true);
    apiGet<LeaderboardPayload>(`/api/language-quest/leaderboard${qs({
      scope: query.scope,
      courseId: query.scope === 'course' ? query.courseId : null,
      category: query.scope === 'category' ? query.category : null,
      classroomId: query.scope === 'classroom' ? query.classroomId : null,
    })}`)
      .then(setData)
      .catch((error: any) => toast.error(error?.message || 'Could not load the leaderboard'))
      .finally(() => setLoading(false));
  }, [query]);

  const changeScope = (scope: LanguageQuestLeaderboardScope) => {
    setQuery((current) => ({
      ...current,
      scope,
      courseId: scope === 'course' ? (current.courseId || data?.filters.courses[0]?.id || '') : current.courseId,
      category: scope === 'category' ? (current.category || data?.filters.categories[0] || '') : current.category,
      classroomId: scope === 'classroom' ? (current.classroomId || data?.filters.classrooms[0]?.id || '') : current.classroomId,
    }));
  };

  if (!data) return <div className="grid min-h-[420px] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" /></div>;

  const rankMessage = data.currentUserRank
    ? `Your current rank in this view is #${data.currentUserRank}.`
    : 'Earn XP in this view to join the ranking.';

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <Button variant="ghost" className="-ml-2" render={<Link to="/games/language-quest" />} nativeButton={false}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Language Quest
      </Button>

      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-7 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/25"><Trophy className="h-8 w-8" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Fair ways to compete</p>
              <h1 className="mt-1 text-3xl font-black">Language Leaderboard</h1>
              <p className="mt-1 text-sm text-white/85">{rankMessage}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-3 text-right ring-1 ring-white/20">
            <p className="text-xs font-black uppercase tracking-wide text-white/70">Current view</p>
            <p className="mt-1 font-black">{data.selection.label}</p>
            <p className="text-xs text-white/75">{data.selection.metricLabel}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-500/20 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {scopes.map(({ value, label, icon: Icon }) => {
            const selected = query.scope === value;
            const unavailable = value === 'classroom' && data.filters.classrooms.length === 0;
            return (
              <Button
                key={value}
                size="sm"
                variant={selected ? 'default' : 'outline'}
                disabled={unavailable}
                className={selected ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950' : ''}
                onClick={() => changeScope(value)}
              >
                <Icon className="mr-1.5 h-3.5 w-3.5" /> {label}
              </Button>
            );
          })}
        </div>

        {query.scope === 'course' && (
          <label className="mt-4 block text-sm font-bold text-slate-700 dark:text-slate-200">
            Course
            <select
              value={query.courseId || data.filters.courses[0]?.id || ''}
              onChange={(event) => setQuery((current) => ({ ...current, courseId: event.target.value }))}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 sm:max-w-md dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {data.filters.courses.map((course) => <option key={course.id} value={course.id}>{course.imageEmoji} {course.title}</option>)}
            </select>
          </label>
        )}
        {query.scope === 'category' && (
          <label className="mt-4 block text-sm font-bold text-slate-700 dark:text-slate-200">
            Course category
            <select
              value={query.category || data.filters.categories[0] || ''}
              onChange={(event) => setQuery((current) => ({ ...current, category: event.target.value }))}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 sm:max-w-md dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {data.filters.categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
        )}
        {query.scope === 'classroom' && (
          <label className="mt-4 block text-sm font-bold text-slate-700 dark:text-slate-200">
            Classroom
            <select
              value={query.classroomId || data.filters.classrooms[0]?.id || ''}
              onChange={(event) => setQuery((current) => ({ ...current, classroomId: event.target.value }))}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 sm:max-w-md dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {data.filters.classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>{classroom.name}{classroom.focusCourseTitle ? ` · ${classroom.focusCourseTitle}` : ''}</option>
              ))}
            </select>
          </label>
        )}
        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Global keeps the original lifetime ranking. Every focused view uses learning XP from the last 30 days, excluding mission bonuses.
        </p>
      </section>

      {data.league && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-5 shadow-sm dark:border-violet-500/25 dark:from-violet-950/30 dark:to-fuchsia-950/20">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-3xl shadow-sm dark:bg-slate-900">{data.league.emoji}</span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Your recent-XP bracket</p>
              <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{data.league.title}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">Compete with learners building at a similar recent pace.</p>
            </div>
          </div>
          <Badge className="bg-violet-700 text-white">
            {data.league.maxXp === null ? `${data.league.minXp}+ XP` : `${data.league.minXp}–${data.league.maxXp} XP`}
          </Badge>
        </section>
      )}

      {data.scope === 'global' && (
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
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-4 dark:border-surface-raised sm:px-6">
          <div>
            <h2 className="font-black text-slate-950 dark:text-white">{data.selection.label}</h2>
            <p className="text-xs text-slate-500">{data.selection.metricLabel}</p>
          </div>
          {loading && <span className="text-xs font-bold text-amber-600">Updating…</span>}
        </div>
        {data.leaders.length === 0 ? (
          <div className="p-12 text-center">
            <Medal className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900 dark:text-white">No scores in this view yet</p>
            <p className="mt-1 text-sm text-slate-500">Complete a matching lesson to take the first spot.</p>
          </div>
        ) : (
          <div className={`divide-y divide-slate-100 transition-opacity dark:divide-surface-raised ${loading ? 'opacity-60' : ''}`}>
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
