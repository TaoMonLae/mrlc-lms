import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, CheckCircle2, Loader2, Copy, ArrowUp, ArrowDown, X, Check } from 'lucide-react';
import { apiGet, apiSend } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { type Exam, type ExamQuestion, type ExamSettings } from '../../types/exam';
import MathField from '../../components/MathField';
import QuestionImageField from '../../components/QuestionImageField';

const INITIAL_SETTINGS: ExamSettings = {
  enableTimer: true,
  autoSubmit: true,
  shuffleQuestions: false,
  shuffleChoices: false,
  showScoreAfterSubmit: true,
  showCorrectAnswers: false,
  allowedAttempts: 1,
};

const isChoiceType = (type: string) => type === 'MCQ' || type.startsWith('GED_');

export default function ExamNew() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  // Setup data
  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [examType, setExamType] = useState('FINAL');
  const [duration, setDuration] = useState('60');

  // Reference data for the dropdowns
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<any[]>('/api/classes').then((cs) => setClasses(cs.map((c) => ({ id: c.id, name: c.name })))).catch(() => {});
    apiGet<any[]>('/api/subjects').then((ss) => setSubjects(ss.map((s) => ({ id: s.id, name: s.name })))).catch(() => {});
  }, []);

  // Questions data
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [passageOpen, setPassageOpen] = useState<Record<string, boolean>>({});

  // Settings data
  const [settings, setSettings] = useState<ExamSettings>(INITIAL_SETTINGS);

  // Whether the exam is visible to students immediately. When off it is saved as
  // a DRAFT so the teacher can finish authoring/scheduling before publishing.
  const [publishNow, setPublishNow] = useState(true);

  // Math equation tools only make sense for Math subjects, so show them only
  // when the selected subject looks like Mathematics (e.g. "Math",
  // "Mathematics", "Mathematical Reasoning", "GED Math").
  const selectedClassName = classes.find((c) => c.id === classId)?.name ?? '';
  const selectedSubjectName = subjects.find((s) => s.id === subjectId)?.name ?? '';
  const isMathSubject = /math/i.test(selectedSubjectName);

  // kind: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'WRITTEN' (TRUE_FALSE is an MCQ with two options)
  const addQuestion = (kind: string = 'MCQ') => {
    const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const base: ExamQuestion = {
      id, type: 'MCQ', questionText: '', passageText: '', explanation: '',
      choices: undefined, correctAnswer: undefined, points: 5, order: questions.length,
    };
    if (kind === 'TRUE_FALSE') { base.type = 'MCQ'; base.choices = ['True', 'False']; base.correctAnswer = '0'; }
    else if (kind === 'MCQ') { base.type = 'MCQ'; base.choices = ['', '', '', '']; base.correctAnswer = '0'; }
    else { base.type = kind as ExamQuestion['type']; }
    setQuestions((qs) => [...qs, base]);
  };

  const updateQuestion = (id: string, updates: Partial<ExamQuestion>) => {
    setQuestions((qs) => qs.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const removeQuestion = (id: string) => {
    setQuestions((qs) => qs.filter(q => q.id !== id));
  };

  const duplicateQuestion = (id: string) => {
    setQuestions((qs) => {
      const i = qs.findIndex(q => q.id === id);
      if (i < 0) return qs;
      const copy = { ...qs[i], id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, choices: qs[i].choices ? [...qs[i].choices!] : undefined };
      const next = [...qs];
      next.splice(i + 1, 0, copy);
      return next;
    });
  };

  const moveQuestion = (id: string, dir: -1 | 1) => {
    setQuestions((qs) => {
      const i = qs.findIndex(q => q.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= qs.length) return qs;
      const next = [...qs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const setCorrect = (q: ExamQuestion, cIndex: number) => updateQuestion(q.id, { correctAnswer: String(cIndex) });

  const addChoice = (q: ExamQuestion) => updateQuestion(q.id, { choices: [...(q.choices || []), ''] });

  const removeChoice = (q: ExamQuestion, cIndex: number) => {
    const choices = (q.choices || []).filter((_, i) => i !== cIndex);
    let correct = Number(q.correctAnswer ?? 0);
    if (cIndex === correct) correct = 0;
    else if (cIndex < correct) correct -= 1;
    updateQuestion(q.id, { choices, correctAnswer: String(Math.max(0, correct)) });
  };

  const calculateTotalPoints = () => questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  const typeLabel = (t: string) =>
    t === 'MCQ' ? 'Multiple Choice'
    : t === 'SHORT_ANSWER' ? 'Short Answer'
    : t === 'WRITTEN' ? 'Written / Essay'
    : t.startsWith('GED_') ? t.replace('GED_', 'GED ').replace('_', ' ')
    : t;

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Please enter an exam title.'); setStep(1); return; }
    if (!classId) { toast.error('Please select a class.'); setStep(1); return; }
    if (!subjectId) { toast.error('Please select a subject.'); setStep(1); return; }
    if (questions.length === 0) { toast.error('Please add at least one question.'); setStep(2); return; }
    const invalidQuestion = questions.find((q) => !q.questionText.trim());
    if (invalidQuestion) { toast.error('Every question needs question text.'); setStep(2); return; }
    const invalidMcq = questions.find((q) => {
      if (!isChoiceType(q.type)) return false;
      const filled = (q.choices || []).filter((c) => c.trim());
      return filled.length < 2 || (q.choices || []).some((c) => !c.trim()) || q.correctAnswer == null;
    });
    if (invalidMcq) { toast.error('Multiple-choice questions need at least two filled options and one correct answer.'); setStep(2); return; }
    setSaving(true);
    try {
      const created = await apiSend('/api/exams', 'POST', {
        title: title.trim(),
        classId,
        subjectId,
        examType,
        status: publishNow ? 'PUBLISHED' : 'DRAFT',
        duration: Number(duration) || null,
        totalMarks: calculateTotalPoints(),
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
      toast.success('Exam created. Configure sections, bank questions and scheduling next.');
      // Hand off to the unified authoring flow.
      if (created?.id) navigate(`/exam2/${created.id}/author`);
      else navigate('/exams');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create exam.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/exams" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Exams
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Create New Exam</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Step {step} of 4</p>
      </div>

      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-surface-raised -z-10 rounded-full overflow-hidden">
           <div className="h-full bg-aubergine-600 transition-all duration-300" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
        </div>
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
            step >= s ? 'bg-aubergine-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
          }`}>
            {s}
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">1. Setup Exam Details</h2>
            <div className="space-y-2">
              <Label>Exam Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Midterm Mathematics" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                 <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class">{selectedClassName || 'Select class'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject">{selectedSubjectName || 'Select subject'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Exam Type</Label>
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
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
                <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">2. Questions</h2>
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="rounded-full bg-slate-100 dark:bg-surface-raised px-3 py-1">{questions.length} question{questions.length === 1 ? '' : 's'}</span>
                <span className="rounded-full bg-aubergine-50 px-3 py-1 text-aubergine-700 dark:bg-aubergine-900/20 dark:text-aubergine-300">{calculateTotalPoints()} pts</span>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-surface-raised rounded-xl">
                <p className="text-slate-500 mb-4">No questions added yet.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => addQuestion('MCQ')} variant="outline"><Plus className="mr-1 h-4 w-4" /> Multiple choice</Button>
                  <Button onClick={() => addQuestion('TRUE_FALSE')} variant="outline">True / False</Button>
                  <Button onClick={() => addQuestion('SHORT_ANSWER')} variant="outline">Short answer</Button>
                  <Button onClick={() => addQuestion('WRITTEN')} variant="outline">Written</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {questions.map((q, index) => (
                  <div key={q.id} className="p-4 border border-slate-200 dark:border-surface-raised rounded-lg space-y-4 bg-slate-50/50 dark:bg-surface-raised/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-aubergine-600 text-xs font-bold text-white">{index + 1}</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{typeLabel(q.type)}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Move up" disabled={index === 0} onClick={() => moveQuestion(q.id, -1)}><ArrowUp className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Move down" disabled={index === questions.length - 1} onClick={() => moveQuestion(q.id, 1)}><ArrowDown className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Duplicate" onClick={() => duplicateQuestion(q.id)}><Copy className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" title="Delete" onClick={() => removeQuestion(q.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <Label>Type</Label>
                         <Select
                          value={q.type}
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
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
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
                        <Input type="number" value={q.points} onChange={e => updateQuestion(q.id, { points: Number(e.target.value) })} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Question Text</Label>
                      <MathField
                        value={q.questionText}
                        onChange={(val) => updateQuestion(q.id, { questionText: val })}
                        multiline
                        rows={3}
                        enabled={isMathSubject}
                        showToolbar={isMathSubject}
                        placeholder={
                          isMathSubject
                            ? 'Type the question. Use the toolbar or wrap math in $…$, e.g. Solve $2x + 5 = 15$'
                            : 'Type the question text'
                        }
                      />
                      {isMathSubject && (
                        <p className="text-[11px] text-slate-400">
                          Tip: wrap formulas in <code className="font-mono">$…$</code> for inline math or <code className="font-mono">$$…$$</code> for a centered equation.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Image (optional)</Label>
                      <QuestionImageField
                        value={q.imageUrl}
                        onChange={(url) => updateQuestion(q.id, { imageUrl: url })}
                      />
                    </div>

                    <div className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        id={`has_passage_${q.id}`}
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
                        {q.choices.map((choice, cIndex) => {
                          const correct = q.correctAnswer === String(cIndex);
                          return (
                            <div key={cIndex} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors ${correct ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-900/15' : 'border-slate-200 dark:border-surface-raised'}`}>
                              <button type="button" title="Mark correct" onClick={() => setCorrect(q, cIndex)}
                                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors ${correct ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-400'}`}>
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <div className="flex-1">
                                <MathField
                                  value={choice}
                                  enabled={isMathSubject}
                                  showToolbar={isMathSubject}
                                  onChange={(val) => { const c = [...q.choices!]; c[cIndex] = val; updateQuestion(q.id, { choices: c }); }}
                                  placeholder={isMathSubject ? `Option ${cIndex + 1} — math allowed, e.g. $x = 5$` : `Option ${cIndex + 1}`}
                                />
                              </div>
                              <button type="button" title="Remove option" disabled={(q.choices?.length || 0) <= 2} onClick={() => removeChoice(q, cIndex)}
                                className="shrink-0 text-slate-300 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-30">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                        {(q.choices?.length || 0) < 6 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => addChoice(q)} className="text-aubergine-600"><Plus className="mr-1 h-4 w-4" /> Add option</Button>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Explanation / Rationale</Label>
                      <Textarea
                        value={q.explanation || ''}
                        onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                        rows={2}
                        placeholder="Explain the correct answer. This will be shown to students after results are released."
                        className="bg-white dark:bg-canvas text-sm border-slate-200 dark:border-surface-raised"
                      />
                    </div>
                  </div>
                ))}
                
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-200 dark:border-surface-raised p-3">
                  <span className="self-center text-xs font-medium text-slate-400">Add question:</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('MCQ')}><Plus className="mr-1 h-4 w-4" /> Multiple choice</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('TRUE_FALSE')}>True / False</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('SHORT_ANSWER')}>Short answer</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('WRITTEN')}>Written</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">3. Exam Settings</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-surface-raised rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Timer</Label>
                  <p className="text-sm text-slate-500">Enforce the time limit strictly.</p>
                </div>
                <Switch checked={settings.enableTimer} onCheckedChange={(chk) => setSettings({...settings, enableTimer: chk})} />
              </div>
              <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-surface-raised rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-Submit</Label>
                  <p className="text-sm text-slate-500">Submit automatically when time runs out.</p>
                </div>
                <Switch checked={settings.autoSubmit} onCheckedChange={(chk) => setSettings({...settings, autoSubmit: chk})} />
              </div>
              <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-surface-raised rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Shuffle Questions</Label>
                  <p className="text-sm text-slate-500">Randomize question order for each student.</p>
                </div>
                <Switch checked={settings.shuffleQuestions} onCheckedChange={(chk) => setSettings({...settings, shuffleQuestions: chk})} />
              </div>
               <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-surface-raised rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Show Score Immediately</Label>
                  <p className="text-sm text-slate-500">Students see auto-graded score after submitting.</p>
                </div>
                <Switch checked={settings.showScoreAfterSubmit} onCheckedChange={(chk) => setSettings({...settings, showScoreAfterSubmit: chk})} />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center justify-center p-6 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl mb-6">
              <CheckCircle2 className="h-8 w-8 mr-3" />
              <div>
                <h3 className="font-bold text-lg">Ready to Create Exam</h3>
                <p className="text-sm opacity-90">Review a summary of your exam before saving.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <div className="border-b pb-2 dark:border-surface-raised">
                  <span className="text-slate-500 block mb-1">Title</span>
                  <span className="font-medium text-slate-900 dark:text-white">{title || 'Untitled Exam'}</span>
                </div>
                <div className="border-b pb-2 dark:border-surface-raised">
                  <span className="text-slate-500 block mb-1">Subject</span>
                  <span className="font-medium text-slate-900 dark:text-white">{subjects.find(s => s.id === subjectId)?.name || 'N/A'}</span>
                </div>
                <div className="border-b pb-2 dark:border-surface-raised">
                  <span className="text-slate-500 block mb-1">Duration</span>
                  <span className="font-medium text-slate-900 dark:text-white">{duration} minutes</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="border-b pb-2 dark:border-surface-raised">
                  <span className="text-slate-500 block mb-1">Questions</span>
                  <span className="font-medium text-slate-900 dark:text-white">{questions.length} questions</span>
                </div>
                <div className="border-b pb-2 dark:border-surface-raised">
                  <span className="text-slate-500 block mb-1">Total Points</span>
                  <span className="font-medium text-slate-900 dark:text-white">{calculateTotalPoints()} points</span>
                </div>
                 <div className="border-b pb-2 dark:border-surface-raised">
                  <span className="text-slate-500 block mb-1">Status</span>
                  <span className="font-medium text-slate-900 dark:text-white">{publishNow ? 'Published' : 'Draft'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-surface-raised rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Publish now</Label>
                <p className="text-sm text-slate-500">
                  {publishNow
                    ? 'Students in this class can start the exam as soon as it is saved.'
                    : 'Saved as a draft — hidden from students until you publish it from the exam page.'}
                </p>
              </div>
              <Switch checked={publishNow} onCheckedChange={setPublishNow} />
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between pt-6 border-t border-slate-200 dark:border-surface-raised">
          <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1}>
            Previous
          </Button>
          {step < 4 ? (
             <Button onClick={() => setStep(step + 1)} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
              Next Step
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Exam
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
