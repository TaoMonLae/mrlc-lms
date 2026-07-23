import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Flame, Loader2, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiGet } from '@/src/lib/api';
import type { DailyQuestPayload } from '@/src/types/dailyQuest';

export function DailyQuestCard() {
  const [data, setData] = useState<DailyQuestPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<DailyQuestPayload>('/api/daily-quest')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && !data) return null;

  const session = data?.session;
  const complete = session?.status === 'COMPLETED';
  const inProgress = session?.status === 'IN_PROGRESS';
  const title = complete
    ? 'Daily Quest complete!'
    : inProgress
      ? 'Continue your Daily Quest'
      : 'Your Daily Quest is ready';
  const description = complete
    ? `${session.correctCount}/${session.totalQuestions} correct · +${session.pointsEarned} XP earned today`
    : inProgress
      ? `Question ${session.currentIndex + 1} of ${session.totalQuestions} is waiting for you.`
      : 'Build your streak with five minutes of focused English word practice.';

  return (
    <Card className="relative overflow-hidden rounded-2xl border-0 bg-gradient-to-r from-violet-700 via-indigo-700 to-sky-700 p-5 text-white shadow-lg shadow-violet-950/10">
      <div aria-hidden="true" className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            {loading
              ? <Loader2 className="h-6 w-6 animate-spin" />
              : complete
                ? <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                : <Target className="h-6 w-6 text-amber-300" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black">{loading ? 'Loading today’s quest…' : title}</h2>
              {data && data.stats.currentStreak > 0 && (
                <Badge className="border-white/15 bg-white/15 text-white">
                  <Flame className="mr-1 h-3.5 w-3.5 text-orange-300" />
                  {data.stats.currentStreak}-day streak
                </Badge>
              )}
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-violet-100">
              {loading ? 'Preparing today’s English vocabulary practice.' : description}
            </p>
          </div>
        </div>
        {!loading && (
          <Button
            className="shrink-0 bg-white font-bold text-violet-700 hover:bg-violet-50"
            render={<Link to="/daily-quest" />}
            nativeButton={false}
          >
            {complete ? <Sparkles className="h-4 w-4" /> : null}
            {complete ? 'View results' : inProgress ? 'Continue' : 'Start quest'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
