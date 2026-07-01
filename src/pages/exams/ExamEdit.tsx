import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Save, Trash2, Copy, ArrowUp, ArrowDown, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MathField from '../../components/MathField';
import QuestionImageField from '../../components/QuestionImageField';
import { type ExamQuestion, type ExamSettings } from '../../types/exam';

const isChoiceType = (type: string) => type === 'MCQ' || type.startsWith('GED_');

interface LoadedExam {
  id: string;
  title: string;
  classId: string;
  subjectId: string;
  type: string;
  durationMinutes?: number | null;
  totalMarks?: number | null;
  status?: string | null;
  settings?: ExamSettings | null;
  questions: Array<{
    id: string;
    text: string;
    type: ExamQuestion['type'];
    points: number;
    options?: string[] | null;
    correctAnswer?: string | null;
    passageText?: string | null;
    explanation?: string | null;
    imageUrl?: string | null;
  }>;
  attempts?: any[];
}

export default function ExamEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [examType, setExamType] = useState('FINAL');
  const [duration, setDuration] = useState('60');
  const [status, setStatus] = useState('PUBLISHED');
  const [settings, setSettings] = useState<ExamSettings | null>(null);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [hasAttempts, setHasAttempts] = useState(false);
  const [passageOpen, setPassageOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      apiGet<any[]>('/api/classes').then((rows) => setClasses(rows.map((c) => ({ id: c.id, name: c.name })))),
      apiGet<any[]>('/api/subjects').then((rows) => setSubjects(rows.map((s) => ({ id: s.id, name: s.name })))),
    ]).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiGet<LoadedExam>(`/api/exams/${id}`)
      .then((exam) => {
        setTitle(exam.title || '');
        setClassId(exam.classId || '');
        setSubjectId(exam.subjectId || '');
        setExamType(exam.type || 'FINAL');
        setDuration(String(exam.durationMinutes || 60));
        setStatus(exam.status || 'PUBLISHED');
        setSettings(exam.settings || null);
        setHasAttempts(Boolean(exam.attempts?.length));
        setQuestions((exam.questions || []).map((q, index) => ({
          id: q.id || `q_${Date.now()}_${index}`,
          type: q.type || 'MCQ',
          questionText: q.text || '',
          passageText: q.passageText || '',
          imageUrl: q.imageUrl ?? null,
          explanation: q.explanation || '',
          choices: Array.isArray(q.options) ? q.options : ['', '', '', ''],
          correctAnswer: q.correctAnswer ?? '0',
          points: Number(q.points) || 5,
          order: index,
        })));
      })
      .catch((error: any) => {
        toast.error(error.message || 'Failed to load exam.');
        navigate('/exams');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const selectedClassName = classes.find((c) => c.id === classId)?.name ?? '';
  const selectedSubjectName = subjects.find((s) => s.id === subjectId)?.name ?? '';
  const isMathSubject = /math/i.test(selectedSubjectName);
  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  const addQuestion = (kind: string = 'MCQ') => {
    const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const base: ExamQuestion = { id, type: 'MCQ', questionText: '', passageText: '', explanation: '', choices: undefined, correctAnswer: undefined, points: 5, order: questions.length };
    if (kind === 'TRUE_FALSE') { base.type = 'MCQ'; base.choices = ['True', 'False']; base.correctAnswer = '0'; }
    else if (kind === 'MCQ') { base.type = 'MCQ'; base.choices = ['', '', '', '']; base.correctAnswer = '0'; }
    else { base.type = kind as ExamQuestion['type']; }
    setQuestions((prev) => [...prev, base]);
  };

  const updateQuestion = (questionId: string, updates: Partial<ExamQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, ...updates } : q)));
  };

  const removeQuestion = (questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

  const duplicateQuestion = (questionId: string) => {
    setQuestions((prev) => {
      const i = prev.findIndex((q) => q.id === questionId);
      if (i < 0) return prev;
      const copy = { ...prev[i], id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, choices: prev[i].choices ? [...prev[i].choices!] : undefined };
      const next = [...prev]; next.splice(i + 1, 0, copy); return next;
    });
  };

  const moveQuestion = (questionId: string, dir: -1 | 1) => {
    setQuestions((prev) => {
      const i = prev.findIndex((q) => q.id === questionId); const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev]; [next[i], next[j]] = [next[j], next[i]]; return next;
    });
  };

  const setCorrect = (q: ExamQuestion, cIndex: number) => updateQuestion(q.id, { correctAnswer: String(cIndex) });
  const addChoice = (q: ExamQuestion) => updateQuestion(q.id, { choices: [...(q.choices || []), ''] });
  const removeChoice = (q: ExamQuestion, cIndex: number) => {
    const choices = (q.choices || []).filter((_, i) => i !== cIndex);
    let correct = Number(q.correctAnswer ?? 0);
    if (cIndex === correct) correct = 0; else if (cIndex < correct) correct -= 1;
    updateQuestion(q.id, { choices, correctAnswer: String(Math.max(0, correct)) });
  };
  const typeLabel = (t: string) => t === 'MCQ' ? 'Multiple Choice' : t === 'SHORT_ANSWER' ? 'Short Answer' : t === 'WRITTEN' ? 'Written / Essay' : t.startsWith('GED_') ? t.replace('GED_', 'GED ').replace('_', ' ') : t;

  const handleSave = async () => {
    if (!id) return;
    if (!title.trim()) { toast.error('Please enter an exam title.'); return; }
    if (!classId) { toast.error('Please select a class.'); return; }
    if (!subjectId) { toast.error('Please select a subject.'); return; }
    if (!hasAttempts) {
      if (questions.length === 0) { toast.error('Please add at least one question.'); return; }
      const invalidQuestion = questions.find((q) => !q.questionText.trim());
      if (invalidQuestion) { toast.error('Every question needs question text.'); return; }
      const invalidMcq = questions.find((q) => {
        if (!isChoiceType(q.type)) return false;
        const filled = (q.choices || []).filter((c) => c.trim());
        return filled.length < 2 || (q.choices || []).some((c) => !c.trim()) || q.correctAnswer == null;
      });
      if (invalidMcq) { toast.error('Multiple-choice questions need at least two filled options and one correct answer.'); return; }
    }

    setSaving(true);
    try {
      await apiSend(`/api/exams/${id}`, 'PUT', {
        title: title.trim(),
        classId,
        subjectId,
        examType,
        status,
        duration: Number(duration) || null,
        totalMarks: totalPoints,
        settings,
        questions: questions.map((q) => ({
          questionText: q.questionText,
          type: q.type,
          points: Number(q.points) || 5,
          choices: isChoiceType(q.type) ? q.choices || [] : null,
          correctAnswer: q.correctAnswer,
          passageText: q.passageText?.trim() ? q.passageText : null,
          explanation: q.explanation || null,
          imageUrl: q.imageUrl || null,
        })),
      });
      toast.success(hasAttempts ? 'Exam details updated. Questions are locked because students have attempts.' : 'Exam updated successfully.');
      navigate(`/exams/${id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update exam.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to={`/exams/${id}`} />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Exam Dashboard
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Edit Exam</h1>
      </div>

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-6">
        {hasAttempts && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Students have already attempted this exam. Exam details can be updated, but questions are locked to protect submitted results.
          </div>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Exam Details</h2>
          <div className="space-y-2">
            <Label>Exam Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Exam title" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="Select class">{selectedClassName || 'Select class'}</SelectValue></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger><SelectValue placeholder="Select subject">{selectedSubjectName || 'Select subject'}</SelectValue></SelectTrigger>
                <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Exam Type</Label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUIZ">Quiz</SelectItem>
                  <SelectItem value="MIDTERM">Midterm</SelectItem>
                  <SelectItem value="FINAL">Final</SelectItem>
                  <SelectItem value="MOCK">Mock Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration (Minutes)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Questions</h2>
            <div className="text-sm font-medium bg-slate-100 dark:bg-surface-raised px-3 py-1 rounded-full">
              Total Points: {totalPoints}
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-surface-raised rounded-xl">
              <p className="text-slate-500 mb-4">No questions added yet.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => addQuestion('MCQ')} variant="outline" disabled={hasAttempts}><Plus className="mr-1 h-4 w-4" /> Multiple choice</Button>
                <Button onClick={() => addQuestion('TRUE_FALSE')} variant="outline" disabled={hasAttempts}>True / False</Button>
                <Button onClick={() => addQuestion('SHORT_ANSWER')} variant="outline" disabled={hasAttempts}>Short answer</Button>
                <Button onClick={() => addQuestion('WRITTEN')} variant="outline" disabled={hasAttempts}>Written</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((q, index) => (
                <div key={q.id} className="p-4 border border-slate-200 dark:border-surface-raised rounded-lg space-y-4 bg-slate-50/50 dark:bg-surface-raised/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-aubergine-600 text-xs font-bold text-white">{index + 1}</span>
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{typeLabel(q.type)}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Move up" disabled={hasAttempts || index === 0} onClick={() => moveQuestion(q.id, -1)}><ArrowUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Move down" disabled={hasAttempts || index === questions.length - 1} onClick={() => moveQuestion(q.id, 1)}><ArrowDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Duplicate" disabled={hasAttempts} onClick={() => duplicateQuestion(q.id)}><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" title="Delete" disabled={hasAttempts} onClick={() => removeQuestion(q.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={q.type}
                        disabled={hasAttempts}
                        onValueChange={(val: any) => {
                          const updates: Partial<ExamQuestion> = { type: val };
                          if (val === 'GED_RLA_PASSAGE') setPassageOpen((p) => ({ ...p, [q.id]: true }));
                          if (isChoiceType(val) && (!q.choices || q.choices.length === 0)) {
                            updates.choices = ['', '', '', ''];
                            updates.correctAnswer = '0';
                          }
                          updateQuestion(q.id, updates);
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MCQ">Multiple Choice (MCQ)</SelectItem>
                          <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                          <SelectItem value="WRITTEN">Written / Essay</SelectItem>
                          <SelectItem value="GED_RLA_PASSAGE">GED RLA (with Passage)</SelectItem>
                          <SelectItem value="GED_MATH">GED Mathematical Reasoning</SelectItem>
                          <SelectItem value="GED_SCIENCE">GED Science</SelectItem>
                          <SelectItem value="GED_SOCIAL_STUDIES">GED Social Studies</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Points</Label>
                      <Input type="number" value={q.points} disabled={hasAttempts} onChange={(e) => updateQuestion(q.id, { points: Number(e.target.value) })} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Question Text</Label>
                    <MathField value={q.questionText} onChange={(val) => updateQuestion(q.id, { questionText: val })} multiline rows={3} enabled={isMathSubject && !hasAttempts} showToolbar={isMathSubject && !hasAttempts} placeholder="Type the question text" />
                  </div>

                  <div className="space-y-2">
                    <Label>Image (optional)</Label>
                    <QuestionImageField value={q.imageUrl} onChange={(url) => updateQuestion(q.id, { imageUrl: url })} disabled={hasAttempts} />
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id={`has_passage_${q.id}`}
                      disabled={hasAttempts}
                      checked={!!passageOpen[q.id] || !!q.passageText?.trim()}
                      onChange={(e) => { setPassageOpen((p) => ({ ...p, [q.id]: e.target.checked })); if (!e.target.checked) updateQuestion(q.id, { passageText: '' }); }}
                      className="rounded border-slate-300 text-aubergine-600 focus:ring-aubergine-500 h-4 w-4"
                    />
                    <label htmlFor={`has_passage_${q.id}`} className="text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                      Include passage / stimulus text (split layout)
                    </label>
                  </div>

                  {(passageOpen[q.id] || !!q.passageText?.trim()) && (
                    <div className="space-y-2">
                      <Label>Passage / Stimulus Text</Label>
                      <Textarea
                        value={q.passageText || ''}
                        disabled={hasAttempts}
                        onChange={(e) => updateQuestion(q.id, { passageText: e.target.value })}
                        rows={4}
                        placeholder="Type or paste the passage here. It will be shown on the left pane in a split layout."
                        className="bg-white dark:bg-canvas text-sm border-slate-200 dark:border-surface-raised"
                      />
                    </div>
                  )}

                  {isChoiceType(q.type) && q.choices && (
                    <div className="space-y-2">
                      <Label>Options <span className="font-normal text-slate-400">— tap the circle to mark the correct answer</span></Label>
                      {q.choices.map((choice, choiceIndex) => {
                        const correct = q.correctAnswer === String(choiceIndex);
                        return (
                          <div key={choiceIndex} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors ${correct ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-900/15' : 'border-slate-200 dark:border-surface-raised'}`}>
                            <button type="button" title="Mark correct" disabled={hasAttempts} onClick={() => setCorrect(q, choiceIndex)}
                              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors disabled:opacity-50 ${correct ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-400'}`}>
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <div className="flex-1">
                              <MathField
                                value={choice}
                                enabled={isMathSubject && !hasAttempts}
                                showToolbar={isMathSubject && !hasAttempts}
                                onChange={(val) => { const c = [...q.choices!]; c[choiceIndex] = val; updateQuestion(q.id, { choices: c }); }}
                                placeholder={`Option ${choiceIndex + 1}`}
                              />
                            </div>
                            <button type="button" title="Remove option" disabled={hasAttempts || (q.choices?.length || 0) <= 2} onClick={() => removeChoice(q, choiceIndex)}
                              className="shrink-0 text-slate-300 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-30">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                      {!hasAttempts && (q.choices?.length || 0) < 6 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => addChoice(q)} className="text-aubergine-600"><Plus className="mr-1 h-4 w-4" /> Add option</Button>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Explanation / Rationale</Label>
                    <Textarea
                      value={q.explanation || ''}
                      disabled={hasAttempts}
                      onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                      rows={2}
                      placeholder="Explain the correct answer. This will be shown to students after results are released."
                      className="bg-white dark:bg-canvas text-sm border-slate-200 dark:border-surface-raised"
                    />
                  </div>
                </div>
              ))}
              {!hasAttempts && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-200 dark:border-surface-raised p-3">
                  <span className="self-center text-xs font-medium text-slate-400">Add question:</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('MCQ')}><Plus className="mr-1 h-4 w-4" /> Multiple choice</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('TRUE_FALSE')}>True / False</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('SHORT_ANSWER')}>Short answer</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('WRITTEN')}>Written</Button>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="flex justify-end border-t border-slate-200 pt-6 dark:border-surface-raised">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
