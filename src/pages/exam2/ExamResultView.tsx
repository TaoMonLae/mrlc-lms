import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { apiGet } from '../../lib/api';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

export default function ExamResultView() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    apiGet(`/api/attempts/${attemptId}/result`, { signal: controller.signal })
      .then(d => { if (!controller.signal.aborted) setData(d); })
      .catch(() => { if (!controller.signal.aborted) setError('Could not load your result. Check your connection and retry.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attemptId, retry]);

  if (loading) return <div className="py-20 text-center text-slate-500">Loading…</div>;

  if (error) return <div role="alert" className="max-w-lg mx-auto space-y-4 border border-border bg-card p-6"><h1 className="text-lg font-semibold">Result unavailable</h1><p>{error}</p><Button onClick={() => setRetry(n => n + 1)}>Retry</Button><Button variant="ghost" onClick={() => navigate('/student/exams')}>Back to my exams</Button></div>;

  if (!data?.released) return (
    <div className="max-w-lg mx-auto mt-16 p-8 rounded-xl border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo text-center space-y-3">
      <Clock className="h-10 w-10 text-slate-400 mx-auto" />
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Results not available yet</h2>
      <p className="text-sm text-slate-500">{data?.message || 'Your teacher has not released results for this exam.'}</p>
      <p className="text-xs text-slate-400">
        {['SUBMITTED', 'AUTO_SUBMITTED', 'PENDING_GRADING', 'FINALIZED', 'RELEASED'].includes(data?.state)
          ? 'Your answers are submitted. Results appear here once marking and release are complete.'
          : 'Return to your exams to check the status of this attempt.'}
      </p>
      <Button onClick={() => navigate('/student/exams')}>Back to my exams</Button>
    </div>
  );

  const pass = data.passFail === 'PASS';
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate('/student/exams')}>Back to my exams</Button>
      <h1 className="text-2xl font-semibold">Exam result</h1>
      <div className="rounded-xl border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo p-8 text-center">
        {data.passFail && (pass ? <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" /> : <XCircle className="h-12 w-12 text-red-500 mx-auto" />)}
        {data.score != null && <div className="text-4xl font-black text-slate-900 dark:text-white mt-3">{data.score}{data.totalMarks ? ` / ${data.totalMarks}` : ''}</div>}
        {data.passFail && <p className={`mt-2 font-bold uppercase tracking-widest text-sm ${pass ? 'text-emerald-600' : 'text-red-600'}`}>{data.passFail}</p>}
      </div>
      {Array.isArray(data.questions) && data.questions.length > 0 && (
        <div className="space-y-3">
          {data.questions.map((q: any) => (
            <div key={q.id} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-5">
              {q.passageText && (
                <div className="mb-4 p-3 bg-slate-50 dark:bg-canvas rounded-lg border border-slate-100 dark:border-surface-raised max-h-48 overflow-y-auto text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                  <span className="font-bold block mb-1 uppercase tracking-wider text-[10px] text-slate-400">Passage</span>
                  {q.passageText}
                </div>
              )}
              <p className="font-medium text-slate-900 dark:text-white">{q.text}</p>
              {Array.isArray(q.dragDropRows) && q.dragDropRows.length > 0 ? (
                <div className="mt-3 flex flex-col gap-2">
                  {q.dragDropRows.map((row: any, i: number) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className={row.isCorrect ? 'font-black text-emerald-600' : 'font-black text-red-500'}>{row.isCorrect ? '✓' : '✕'}</span>
                      <span className="min-w-[70px] text-slate-500">{row.label}</span>
                      <span className={row.isCorrect ? 'font-semibold text-emerald-600' : row.your ? 'font-semibold text-red-500' : 'font-semibold text-slate-400'}>{row.your || '—'}</span>
                      {!row.isCorrect && <><span className="text-slate-400">→ correct:</span><span className="font-bold text-emerald-600">{row.correct}</span></>}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-500 mt-2">Your answer: <span className="font-semibold">{q.yourAnswer || '—'}</span></p>
                  {q.correctAnswer != null && <p className="text-sm text-emerald-600 mt-1">Correct: {q.correctAnswer}</p>}
                </>
              )}
              {q.explanation && <p className="text-xs text-slate-500 mt-2 italic">{q.explanation}</p>}
              {q.feedback && <p className="text-xs text-aubergine-600 mt-2">Teacher: {q.feedback}</p>}
              {q.pointsAwarded != null && <p className="text-xs font-bold text-slate-400 mt-2">{q.pointsAwarded} pts</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
