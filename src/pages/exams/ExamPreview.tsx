import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiGet } from '../../lib/api';
import MathText from '../../components/MathText';

type Q = { id: string; text: string; type: string; points: number; options: { value: string; text: string }[] | null; passageText?: string | null; imageUrl?: string | null };

const TEXT_ANSWER_TYPES = ['SHORT_ANSWER', 'ESSAY', 'WRITTEN'];

/**
 * Read-only teacher preview of an exam — shows questions, passages and options
 * exactly as a student sees them (math rendered), without creating an attempt
 * or recording anything. No timer, no scoring, correct answers hidden.
 */
export default function ExamPreview() {
  const { id } = useParams<{ id: string }>();
  const [questions, setQuestions] = useState<Q[]>([]);
  const [title, setTitle] = useState('');
  const [meta, setMeta] = useState<{ durationMinutes?: number | null; totalMarks?: number | null; status?: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet(`/api/exams/${id}/preview`)
      .then((d) => { setQuestions(d.questions || []); setTitle(d.exam?.title || 'Exam'); setMeta(d.exam || {}); })
      .catch((e) => setError(e.message || 'Could not load preview'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center py-32 text-slate-500"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading preview…</div>;
  if (error) return (
    <div className="max-w-md mx-auto mt-24 p-8 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 text-center space-y-3">
      <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Can't preview this exam</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
      <Button render={<Link to={`/exams/${id}`} />} nativeButton={false}>Back to exam</Button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto pb-24" data-no-i18n>
      <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500" render={<Link to={`/exams/${id}`} />} nativeButton={false}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to exam
      </Button>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-aubergine-200 bg-aubergine-50 dark:bg-aubergine-900/20 px-4 py-2 text-sm text-aubergine-700 dark:text-aubergine-300">
        <Eye className="h-4 w-4" /> Preview mode — this is how students see the exam. Nothing is saved or scored.
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {questions.length} question{questions.length === 1 ? '' : 's'}
          {meta.totalMarks ? ` · ${meta.totalMarks} marks` : ''}
          {meta.durationMinutes ? ` · ${meta.durationMinutes} mins` : ''}
          {meta.status ? ` · ${meta.status}` : ''}
        </p>
      </div>

      {questions.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-400 border border-dashed border-slate-200 dark:border-surface-raised rounded-xl">
          No questions yet. Add questions in the editor or author content.
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const isChoice = !TEXT_ANSWER_TYPES.includes(q.type) && Array.isArray(q.options) && q.options.length > 0;
            return (
              <div key={q.id} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question {idx + 1} · {q.points} pts</span>
                {q.passageText && (
                  <div className="rounded-lg bg-slate-50 dark:bg-surface-raised/40 p-4 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    <MathText>{q.passageText}</MathText>
                  </div>
                )}
                <p className="text-base font-medium text-slate-900 dark:text-white whitespace-pre-wrap"><MathText>{q.text || ''}</MathText></p>
                {q.imageUrl && <img src={q.imageUrl} alt="Question media" className="max-h-72 rounded-lg border border-slate-200 dark:border-surface-raised" />}
                {isChoice ? (
                  <div className="space-y-2">
                    {q.options!.map((opt, i) => (
                      <div key={i} className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 dark:border-surface-raised">
                        <MathText className="text-sm font-medium text-slate-800 dark:text-slate-200">{opt.text}</MathText>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full min-h-[100px] rounded-lg border border-dashed border-slate-200 dark:border-surface-raised bg-slate-50/50 dark:bg-canvas/40 p-3 text-sm text-slate-400">
                    Student writes their answer here…
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
