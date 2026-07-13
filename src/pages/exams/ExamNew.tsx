import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { apiGet, apiSend } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { type ExamSettings } from '../../types/exam';

const INITIAL_SETTINGS: ExamSettings = {
  enableTimer: true,
  autoSubmit: true,
  shuffleQuestions: false,
  shuffleChoices: false,
  showScoreAfterSubmit: true,
  showCorrectAnswers: false,
  allowedAttempts: 1,
};

/**
 * New assessment — a lightweight create step. It captures only the essentials
 * the API requires (title, class, subject) plus type/duration, creates a DRAFT
 * exam, then hands straight off to the Guided Studio where questions,
 * scheduling and grading are authored. The Studio is the single exam builder.
 */
export default function ExamNew() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [examType, setExamType] = useState('FINAL');
  const [duration, setDuration] = useState('60');

  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<any[]>('/api/classes').then((cs) => setClasses(cs.map((c) => ({ id: c.id, name: c.name })))).catch(() => {});
    apiGet<any[]>('/api/subjects').then((ss) => setSubjects(ss.map((s) => ({ id: s.id, name: s.name })))).catch(() => {});
  }, []);

  const selectedClassName = classes.find((c) => c.id === classId)?.name ?? '';
  const selectedSubjectName = subjects.find((s) => s.id === subjectId)?.name ?? '';

  const create = async () => {
    if (!title.trim()) { toast.error('Please enter an exam title.'); return; }
    if (!classId) { toast.error('Please select a class.'); return; }
    if (!subjectId) { toast.error('Please select a subject.'); return; }
    setSaving(true);
    try {
      const created = await apiSend<any>('/api/exams', 'POST', {
        title: title.trim(),
        classId,
        subjectId,
        examType,
        status: 'DRAFT',
        duration: Number(duration) || null,
        totalMarks: 0,
        settings: INITIAL_SETTINGS,
        questions: [],
      });
      if (created?.id) {
        toast.success('Draft created — build it in the Studio.');
        navigate(`/exams/${created.id}/studio`);
      } else {
        navigate('/exams');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create exam.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[560px] mx-auto">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/exams" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Exams
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">New assessment</h1>
        <p className="text-sm text-slate-500 mt-1">Just the basics — you'll build questions, scheduling and grading in the Studio.</p>
      </div>

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-5">
        <div className="space-y-2">
          <Label>Exam title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Algebra II — Unit 4 Mock" autoFocus />
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
            <Label>Exam type</Label>
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
            <Label>Duration (minutes)</Label>
            <Input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 pt-5 dark:border-surface-raised">
          <Button onClick={create} disabled={saving} className="bg-aubergine-600 hover:bg-aubergine-700 text-white">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Create & open Studio
          </Button>
        </div>
      </div>
    </div>
  );
}
