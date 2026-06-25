import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
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

const INITIAL_SETTINGS: ExamSettings = {
  enableTimer: true,
  autoSubmit: true,
  shuffleQuestions: false,
  shuffleChoices: false,
  showScoreAfterSubmit: true,
  showCorrectAnswers: false,
  allowedAttempts: 1,
};

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

  // Settings data
  const [settings, setSettings] = useState<ExamSettings>(INITIAL_SETTINGS);

  // Math equation tools only make sense for Math subjects, so show them only
  // when the selected subject looks like Mathematics (e.g. "Math",
  // "Mathematics", "Mathematical Reasoning", "GED Math").
  const selectedSubjectName = subjects.find((s) => s.id === subjectId)?.name ?? '';
  const isMathSubject = /math/i.test(selectedSubjectName);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `q_${Date.now()}`,
        type: 'MCQ',
        questionText: '',
        choices: ['', '', '', ''],
        correctAnswer: '0',
        points: 5,
        order: questions.length,
      }
    ]);
  };

  const updateQuestion = (id: string, updates: Partial<ExamQuestion>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const calculateTotalPoints = () => {
    return questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Please enter an exam title.'); setStep(1); return; }
    if (!classId) { toast.error('Please select a class.'); setStep(1); return; }
    if (!subjectId) { toast.error('Please select a subject.'); setStep(1); return; }
    if (questions.length === 0) { toast.error('Please add at least one question.'); setStep(2); return; }
    const invalidQuestion = questions.find((q) => !q.questionText.trim());
    if (invalidQuestion) { toast.error('Every question needs question text.'); setStep(2); return; }
    const invalidMcq = questions.find((q) =>
      q.type === 'MCQ' && (!q.choices?.length || q.choices.some((choice) => !choice.trim()) || q.correctAnswer == null)
    );
    if (invalidMcq) { toast.error('Multiple choice questions need all choices and one correct answer.'); setStep(2); return; }
    setSaving(true);
    try {
      await apiSend('/api/exams', 'POST', {
        title: title.trim(),
        classId,
        subjectId,
        examType,
        status: 'PUBLISHED',
        duration: Number(duration) || null,
        totalMarks: calculateTotalPoints(),
        settings,
        questions: questions.map((q) => ({
          questionText: q.questionText,
          type: q.type,
          points: Number(q.points) || 5,
          choices: q.type === 'MCQ' ? q.choices || [] : null,
          correctAnswer: q.correctAnswer,
        })),
      });
      toast.success('Exam created successfully.');
      navigate('/exams');
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                 <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
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
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="text-sm font-medium bg-slate-100 dark:bg-surface-raised px-3 py-1 rounded-full">
                Total Points: {calculateTotalPoints()}
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-surface-raised rounded-xl">
                <p className="text-slate-500 mb-4">No questions added yet.</p>
                <Button onClick={addQuestion} variant="outline">
                  <Plus className="mr-2 h-4 w-4" /> Add First Question
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {questions.map((q, index) => (
                  <div key={q.id} className="p-4 border border-slate-200 dark:border-surface-raised rounded-lg space-y-4 bg-slate-50/50 dark:bg-surface-raised/30">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-slate-900 dark:text-white">Question {index + 1}</h3>
                      <Button variant="ghost" size="sm" onClick={() => removeQuestion(q.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <Label>Type</Label>
                         <Select value={q.type} onValueChange={(val: any) => updateQuestion(q.id, { type: val })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MCQ">Multiple Choice</SelectItem>
                            <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                            <SelectItem value="WRITTEN">Written / Essay</SelectItem>
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

                    {q.type === 'MCQ' && q.choices && (
                      <div className="space-y-3">
                        <Label>Choices & Correct Answer</Label>
                        {q.choices.map((choice, cIndex) => (
                          <div key={cIndex} className="flex items-start gap-3">
                            <input
                              type="radio"
                              name={`correct_${q.id}`}
                              checked={q.correctAnswer === cIndex.toString()}
                              onChange={() => updateQuestion(q.id, { correctAnswer: cIndex.toString() })}
                              className="h-4 w-4 mt-2.5 text-aubergine-600"
                            />
                            <div className="flex-1">
                              <MathField
                                value={choice}
                                enabled={isMathSubject}
                                showToolbar={false}
                                onChange={(val) => {
                                  const newChoices = [...q.choices!];
                                  newChoices[cIndex] = val;
                                  updateQuestion(q.id, { choices: newChoices });
                                }}
                                placeholder={
                                  isMathSubject
                                    ? `Choice ${cIndex + 1} — math allowed, e.g. $x = 5$`
                                    : `Choice ${cIndex + 1}`
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                <Button onClick={addQuestion} variant="outline" className="w-full border-dashed">
                  <Plus className="mr-2 h-4 w-4" /> Add Question
                </Button>
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
                  <span className="font-medium text-slate-900 dark:text-white">Draft</span>
                </div>
              </div>
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
