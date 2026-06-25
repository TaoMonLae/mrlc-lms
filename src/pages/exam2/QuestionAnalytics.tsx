import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiGet } from '../../lib/api';

export default function QuestionAnalytics() {
  const { examId, qid } = useParams();
  const [s, setS] = useState<any>(null);
  useEffect(() => { apiGet(`/api/exams/${examId}/questions/${qid}/analytics`).then(setS).catch(() => setS(null)); }, [examId, qid]);

  if (s === null) return <div className="py-20 text-center text-slate-500">No statistics for this question yet.</div>;
  const r = (n: any) => n == null ? '—' : Math.round(n * 100) / 100;
  const metrics: [string, any][] = [
    ['Attempts', s.attempts], ['Correct', s.correctCount], ['Incorrect', s.incorrectCount], ['Blank', s.blankCount],
    ['Difficulty (p)', r(s.difficultyIndex)], ['Discrimination', r(s.discriminationIndex)],
    ['Avg time', s.avgResponseSeconds ? `${Math.round(s.avgResponseSeconds)}s` : '—'],
    ['Avg score', r(s.avgScore)], ['Median', r(s.medianScore)], ['Std dev', r(s.stdDev)],
  ];
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Question Analytics</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">{s.question?.text}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map(([l, v]) => (
          <div key={l} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4 text-center">
            <div className="text-xl font-black text-slate-900 dark:text-white">{v}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{l}</div>
          </div>
        ))}
      </div>
      {s.distractorRates && Object.keys(s.distractorRates).length > 0 && (
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-5">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3">Distractor selection</h3>
          {Object.entries(s.distractorRates).map(([k, v]: any) => (
            <div key={k} className="flex items-center gap-3 mb-2">
              <span className="text-sm w-40 truncate">{k}</span>
              <div className="flex-1 h-2 bg-slate-100 dark:bg-surface-raised rounded-full overflow-hidden"><div className="h-full bg-aubergine-500" style={{ width: `${Math.round(v * 100)}%` }} /></div>
              <span className="text-xs font-bold text-slate-500">{Math.round(v * 100)}%</span>
            </div>
          ))}
        </div>
      )}
      {(s.flags || []).length > 0 && <div className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3">Flags: {s.flags.join(', ')}</div>}
    </div>
  );
}
