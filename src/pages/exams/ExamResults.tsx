import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, Save, Search, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiSend } from '../../lib/api';

type ResultAnswer = {
  id: string;
  questionText: string;
  questionType: string;
  maxPoints: number;
  answerText: string | null;
  isCorrect: boolean | null;
  pointsAwarded: number | null;
};

type ResultAttempt = {
  id: string;
  studentName: string;
  studentCode: string;
  score: number | null;
  percent: number | null;
  status: 'GRADED' | 'NEEDS_GRADING' | 'IN_PROGRESS';
  startedAt: string | null;
  completedAt: string | null;
  securityWarnings: number;
  autoSubmitted: boolean;
  answers: ResultAnswer[];
};

type ResultsPayload = {
  canGrade: boolean;
  exam: {
    id: string;
    title: string;
    totalMarks: number;
    subject: string;
    className: string;
    studentCount: number;
  };
  attempts: ResultAttempt[];
};

const fmtDate = (value: string | null) => value ? new Date(value).toLocaleString() : '—';

const timeTaken = (start: string | null, end: string | null) => {
  if (!start || !end) return '—';
  const mins = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
  return `${mins}m`;
};

export default function ExamResults() {
  const { id } = useParams();
  const [data, setData] = useState<ResultsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [grades, setGrades] = useState<Record<string, string>>({});

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const payload = await apiGet<ResultsPayload>(`/api/exams/${id}/results`);
      setData(payload);
      setSelectedId((prev) => prev || payload.attempts[0]?.id || null);
      const nextGrades: Record<string, string> = {};
      payload.attempts.forEach((attempt) => {
        attempt.answers.forEach((answer) => {
          nextGrades[answer.id] = answer.pointsAwarded == null ? '' : String(answer.pointsAwarded);
        });
      });
      setGrades(nextGrades);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load exam results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const attempts = useMemo(() => {
    const rows = data?.attempts ?? [];
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((attempt) =>
      attempt.studentName.toLowerCase().includes(needle) ||
      attempt.studentCode.toLowerCase().includes(needle)
    );
  }, [data?.attempts, search]);

  const selectedAttempt = attempts.find((attempt) => attempt.id === selectedId) || attempts[0] || null;

  const saveGrades = async (attempt: ResultAttempt) => {
    const answers = attempt.answers.map((answer) => ({
      answerId: answer.id,
      pointsAwarded: grades[answer.id] === '' ? null : Number(grades[answer.id]),
    }));
    setSavingId(attempt.id);
    try {
      await apiSend(`/api/exam-attempts/${attempt.id}/grade`, 'PUT', { answers });
      toast.success('Grades saved.');
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save grades');
    } finally {
      setSavingId(null);
    }
  };

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ['Student', 'Student ID', 'Status', 'Score', 'Percent', 'Submitted At', 'Security Warnings', 'Auto Submitted'],
      ...attempts.map((attempt) => [
        attempt.studentName,
        attempt.studentCode,
        attempt.status,
        attempt.score == null ? '' : `${attempt.score}/${data.exam.totalMarks}`,
        attempt.percent == null ? '' : `${attempt.percent}%`,
        fmtDate(attempt.completedAt),
        String(attempt.securityWarnings || 0),
        attempt.autoSubmitted ? 'Yes' : 'No',
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.exam.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-results.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading results...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <Button variant="ghost" size="sm" className="-ml-3" render={<Link to={`/exams/${id}`} />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <div className="rounded-xl border border-slate-200 p-8 text-center text-slate-500 dark:border-surface-raised">
          Results unavailable.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to={`/exams/${id}`} />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Exam Results</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">
            {data.exam.title} · {data.exam.className} · {data.exam.subject}
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!attempts.length}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students..." className="pl-9" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_480px] gap-6">
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] dark:bg-surface-raised/50">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Time Taken</th>
                  <th className="px-6 py-4">Integrity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {attempts.map((attempt) => (
                  <tr
                    key={attempt.id}
                    onClick={() => setSelectedId(attempt.id)}
                    className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-surface-raised/50 ${selectedAttempt?.id === attempt.id ? 'bg-aubergine-50/70 dark:bg-aubergine-900/10' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900 dark:text-white">{attempt.studentName}</p>
                      <p className="text-xs text-slate-500">{attempt.studentCode}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={attempt.status === 'NEEDS_GRADING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>
                        {attempt.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">
                      {attempt.score == null ? '—' : `${attempt.score}/${data.exam.totalMarks}`}
                      {attempt.percent != null ? <span className="ml-2 text-xs text-slate-500">({attempt.percent}%)</span> : null}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{timeTaken(attempt.startedAt, attempt.completedAt)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 ${attempt.securityWarnings ? 'text-amber-600' : 'text-slate-500'}`}>
                        <ShieldAlert className="h-4 w-4" /> {attempt.securityWarnings || 0}
                      </span>
                    </td>
                  </tr>
                ))}
                {attempts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">No submissions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-5">
          {selectedAttempt ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selectedAttempt.studentName}</h2>
                <p className="text-xs text-slate-500">
                  Submitted {fmtDate(selectedAttempt.completedAt)} · {selectedAttempt.securityWarnings || 0} warning(s)
                </p>
              </div>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {selectedAttempt.answers.map((answer, index) => (
                  <div key={answer.id} className="rounded-lg border border-slate-200 p-4 dark:border-surface-raised">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                      Question {index + 1} · {answer.maxPoints} pts
                    </p>
                    <p className="font-medium text-slate-900 dark:text-white mb-3">{answer.questionText}</p>
                    <Textarea value={answer.answerText || ''} readOnly className="min-h-20 resize-none bg-slate-50 dark:bg-surface-raised/40" />
                    <div className="mt-3 flex items-end gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500">Points Awarded</label>
                        <Input
                          type="number"
                          min={0}
                          max={answer.maxPoints}
                          step="0.5"
                          value={grades[answer.id] ?? ''}
                          disabled={!data.canGrade}
                          onChange={(event) => setGrades((prev) => ({ ...prev, [answer.id]: event.target.value }))}
                          className="w-28"
                        />
                      </div>
                      <span className="pb-2 text-sm text-slate-500">/ {answer.maxPoints}</span>
                    </div>
                  </div>
                ))}
              </div>
              {data.canGrade ? (
                <Button onClick={() => saveGrades(selectedAttempt)} disabled={savingId === selectedAttempt.id} className="w-full">
                  {savingId === selectedAttempt.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Grades
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-slate-500">Select a submission to view details.</div>
          )}
        </div>
      </div>
    </div>
  );
}
