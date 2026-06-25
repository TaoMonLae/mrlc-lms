import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MathField from '../../components/MathField';
import { type ExamQuestion, type ExamSettings } from '../../types/exam';

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

  const selectedSubjectName = subjects.find((s) => s.id === subjectId)?.name ?? '';
  const isMathSubject = /math/i.test(selectedSubjectName);
  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}`,
        type: 'MCQ',
        questionText: '',
        choices: ['', '', '', ''],
        correctAnswer: '0',
        points: 5,
        order: prev.length,
      },
    ]);
  };

  const updateQuestion = (questionId: string, updates: Partial<ExamQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, ...updates } : q)));
  };

  const removeQuestion = (questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

  const handleSave = async () => {
    if (!id) return;
    if (!title.trim()) { toast.error('Please enter an exam title.'); return; }
    if (!classId) { toast.error('Please select a class.'); return; }
    if (!subjectId) { toast.error('Please select a subject.'); return; }
    if (!hasAttempts) {
      if (questions.length === 0) { toast.error('Please add at least one question.'); return; }
      const invalidQuestion = questions.find((q) => !q.questionText.trim());
      if (invalidQuestion) { toast.error('Every question needs question text.'); return; }
      const invalidMcq = questions.find((q) =>
        q.type === 'MCQ' && (!q.choices?.length || q.choices.some((choice) => !choice.trim()) || q.correctAnswer == null)
      );
      if (invalidMcq) { toast.error('Multiple choice questions need all choices and one correct answer.'); return; }
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
          choices: q.type === 'MCQ' ? q.choices || [] : null,
          correctAnswer: q.correctAnswer,
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
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
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
              <Button onClick={addQuestion} variant="outline" disabled={hasAttempts}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Question
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((q, index) => (
                <div key={q.id} className="p-4 border border-slate-200 dark:border-surface-raised rounded-lg space-y-4 bg-slate-50/50 dark:bg-surface-raised/30">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-slate-900 dark:text-white">Question {index + 1}</h3>
                    <Button variant="ghost" size="sm" onClick={() => removeQuestion(q.id)} disabled={hasAttempts} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={q.type} onValueChange={(val: any) => updateQuestion(q.id, { type: val })} disabled={hasAttempts}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MCQ">Multiple Choice</SelectItem>
                          <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                          <SelectItem value="WRITTEN">Written / Essay</SelectItem>
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
                  {q.type === 'MCQ' && q.choices && (
                    <div className="space-y-3">
                      <Label>Choices & Correct Answer</Label>
                      {q.choices.map((choice, choiceIndex) => (
                        <div key={choiceIndex} className="flex items-start gap-3">
                          <input type="radio" name={`correct_${q.id}`} checked={q.correctAnswer === choiceIndex.toString()} disabled={hasAttempts} onChange={() => updateQuestion(q.id, { correctAnswer: choiceIndex.toString() })} className="h-4 w-4 mt-2.5 text-aubergine-600" />
                          <div className="flex-1">
                            <MathField
                              value={choice}
                              enabled={isMathSubject && !hasAttempts}
                              showToolbar={false}
                              onChange={(val) => {
                                const nextChoices = [...q.choices!];
                                nextChoices[choiceIndex] = val;
                                updateQuestion(q.id, { choices: nextChoices });
                              }}
                              placeholder={`Choice ${choiceIndex + 1}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <Button onClick={addQuestion} variant="outline" disabled={hasAttempts} className="w-full border-dashed">
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
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
