import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Brain, SpellCheck, Grid3x3, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '../../lib/api';

interface AttemptSummary { score: number; total: number; durationMs: number | null; createdAt: string }
interface StudentProgress {
  id: string; name: string; studentCode: string;
  known: number;
  bestByMode: { QUIZ?: AttemptSummary; SPELL?: AttemptSummary; MATCH?: AttemptSummary };
  lastActivity: string | null;
}
interface ProgressResponse { totalCards: number; students: StudentProgress[] }

function pct(a: AttemptSummary | undefined): string {
  if (!a || !a.total) return '—';
  return `${Math.round((a.score / a.total) * 100)}%`;
}

export default function FlashcardDeckProgress() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiGet<ProgressResponse>(`/api/flashcards/decks/${id}/progress`)
      .then(setData)
      .catch((e: any) => toast.error(e?.message || 'Failed to load progress'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="animate-spin rounded-full h-6 w-6 border-2 border-aubergine-600 border-t-transparent mr-2"></span>
        <span className="text-slate-500">Loading progress…</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>Couldn't load progress for this deck.</p>
        <Button variant="outline" className="mt-4" render={<Link to="/flashcards" />}>Back to Flashcards</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link to="/flashcards" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-aubergine-600" /> Student Progress
        </h1>
      </div>

      {data.students.length === 0 ? (
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-12 text-center text-slate-500">
          <Users className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <p>No students yet -- assign this deck to a class to see progress here.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-surface-raised/50 border-b border-slate-100 dark:border-surface-raised">
                <tr className="text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Mastery</th>
                  <th className="px-4 py-3"><Brain className="inline h-3.5 w-3.5 mr-1" />Quiz</th>
                  <th className="px-4 py-3"><SpellCheck className="inline h-3.5 w-3.5 mr-1" />Spelling</th>
                  <th className="px-4 py-3"><Grid3x3 className="inline h-3.5 w-3.5 mr-1" />Match</th>
                  <th className="px-4 py-3">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{s.name || s.studentCode}</td>
                    <td className="px-4 py-3">
                      {data.totalCards > 0 ? (
                        <Badge variant="outline">{s.known} / {data.totalCards} ({Math.round((s.known / data.totalCards) * 100)}%)</Badge>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">{pct(s.bestByMode.QUIZ)}</td>
                    <td className="px-4 py-3">{pct(s.bestByMode.SPELL)}</td>
                    <td className="px-4 py-3">
                      {s.bestByMode.MATCH ? `${s.bestByMode.MATCH.total - s.bestByMode.MATCH.score} mistakes` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {s.lastActivity ? new Date(s.lastActivity).toLocaleString() : 'No activity yet'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
