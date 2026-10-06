import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Eye, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiGet } from '../../lib/api';
import MathText from '../../components/MathText';
import { splitDragText } from '../../lib/dragBlanks';

type DragBankItem = { key: string; label: string };
type Q = { id: string; text: string; type: string; points: number; options: { value: string; text: string }[] | null; dragText?: string; dragBank?: DragBankItem[]; passageText?: string | null; imageUrl?: string | null };

const TEXT_ANSWER_TYPES = ['SHORT_ANSWER', 'ESSAY', 'WRITTEN', 'EXTENDED'];

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

  if (loading) return <div className="flex items-center justify-center py-32 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading preview…</div>;
  if (error) return (
    <div className="max-w-md mx-auto mt-24 p-8 rounded-sm border border-amber-200 bg-amber-50 dark:bg-amber-900/10 text-center space-y-3">
      <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
      <h2 className="text-lg font-bold text-foreground">Can't preview this exam</h2>
      <p className="text-sm text-muted-foreground">{error}</p>
      <Button render={<Link to={`/exams/${id}`} />} nativeButton={false}>Back to exam</Button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto pb-24" data-no-i18n>
      <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-muted-foreground" render={<Link to={`/exams/${id}`} />} nativeButton={false}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to exam
      </Button>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-aubergine-200 bg-aubergine-50 dark:bg-aubergine-900/20 px-4 py-2 text-sm text-aubergine-700 dark:text-aubergine-300">
        <Eye className="h-4 w-4" /> Preview mode — this is how students see the exam. Nothing is saved or scored.
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {questions.length} question{questions.length === 1 ? '' : 's'}
          {meta.totalMarks ? ` · ${meta.totalMarks} marks` : ''}
          {meta.durationMinutes ? ` · ${meta.durationMinutes} mins` : ''}
          {meta.status ? ` · ${meta.status}` : ''}
        </p>
      </div>

      {questions.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground border border-dashed border-border rounded-sm">
          No questions yet. Add questions in the editor or author content.
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const isChoice = !TEXT_ANSWER_TYPES.includes(q.type) && Array.isArray(q.options) && q.options.length > 0;
            return (
              <div key={q.id} className="bg-card border border-border rounded-sm p-6 shadow-sm space-y-4">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Question {idx + 1} · {q.points} pts</span>
                {q.passageText && (
                  <div className="rounded-lg bg-muted/50 p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    <MathText>{q.passageText}</MathText>
                  </div>
                )}
                <p className="text-base font-medium text-foreground whitespace-pre-wrap"><MathText>{q.text || ''}</MathText></p>
                {q.imageUrl && <img src={q.imageUrl} alt="Question media" className="max-h-72 rounded-lg border border-border" />}
                {isChoice ? (
                  <div className="space-y-2">
                    {q.options!.map((opt, i) => (
                      <div key={i} className="w-full text-left px-4 py-3 rounded-lg border border-border">
                        <MathText className="text-sm font-medium text-foreground">{opt.text}</MathText>
                      </div>
                    ))}
                  </div>
                ) : q.type === 'DRAG_DROP' ? (
                  <div className="space-y-4">
                    <div className="rounded-sm border border-border bg-card p-5 text-lg leading-loose">
                      {splitDragText(q.dragText || '').map((seg, i) => seg.kind === 'text'
                        ? <span key={i}>{seg.text}</span>
                        : <span key={i} className="mx-1 inline-block min-w-[6rem] rounded-lg border-2 border-dashed border-input bg-muted/50 px-3 py-1 text-center align-middle">&nbsp;</span>)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(q.dragBank || []).map((chip) => (
                        <span key={chip.key} className="rounded-full border-2 border-aubergine-300 bg-aubergine-50 px-4 py-2 text-sm font-bold text-aubergine-800 shadow-sm dark:border-aubergine-700 dark:bg-aubergine-900/30 dark:text-aubergine-200">{chip.label}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="w-full min-h-[100px] rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
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
