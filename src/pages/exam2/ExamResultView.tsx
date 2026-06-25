import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { apiGet } from '../../lib/api';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

export default function ExamResultView() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { apiGet(`/api/attempts/${attemptId}/result`).then(setData).catch(() => setData({ released: false, message: 'Could not load result.' })).finally(() => setLoading(false)); }, [attemptId]);

  if (loading) return <div className="py-20 text-center text-slate-500">Loading…</div>;

  if (!data?.released) return (
    <div className="max-w-lg mx-auto mt-16 p-8 rounded-xl border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo text-center space-y-3">
      <Clock className="h-10 w-10 text-slate-400 mx-auto" />
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Results not available yet</h2>
      <p className="text-sm text-slate-500">{data?.message || 'Your teacher has not released results for this exam.'}</p>
      <Button onClick={() => navigate('/exam2/resume')}>Back to my exams</Button>
    </div>
  );

  const pass = data.passFail === 'PASS';
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo p-8 text-center">
        {data.passFail && (pass ? <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" /> : <XCircle className="h-12 w-12 text-red-500 mx-auto" />)}
        {data.score != null && <div className="text-4xl font-black text-slate-900 dark:text-white mt-3">{data.score}{data.totalMarks ? ` / ${data.totalMarks}` : ''}</div>}
        {data.passFail && <p className={`mt-2 font-bold uppercase tracking-widest text-sm ${pass ? 'text-emerald-600' : 'text-red-600'}`}>{data.passFail}</p>}
      </div>
      {Array.isArray(data.questions) && data.questions.length > 0 && (
        <div className="space-y-3">
          {data.questions.map((q: any) => (
            <div key={q.id} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-5">
              <p className="font-medium text-slate-900 dark:text-white">{q.text}</p>
              <p className="text-sm text-slate-500 mt-2">Your answer: <span className="font-semibold">{q.yourAnswer || '—'}</span></p>
              {q.correctAnswer != null && <p className="text-sm text-emerald-600 mt-1">Correct: {q.correctAnswer}</p>}
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
