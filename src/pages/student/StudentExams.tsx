import { motion, useReducedMotion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  ExternalLink,
  HelpCircle,
  ShieldAlert,
  Search,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { apiGet } from '../../lib/api';

interface AvailableExam { id: string; title: string; subject: string; duration: string; questions: number; deadline: string | null; activeAttemptId?: string | null; attemptsUsed?: number; attemptLimit?: number; opensAt?: string | null; type: string; }
interface SubmittedExam { id: string; attemptId?: string; title: string; subject: string; submittedAt: string; status: string; score: string | null; }
interface LockdownSettings {
  lockdownBrowserEnabled?: boolean;
  lockdownAutoSubmitOnViolation?: boolean;
  lockdownMaxWarnings?: number;
  lockdownInstructions?: string | null;
}

export default function StudentExams() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [availableExams, setAvailableExams] = useState<AvailableExam[]>([]);
  const [submittedExams, setSubmittedExams] = useState<SubmittedExam[]>([]);
  const [lockdownSettings, setLockdownSettings] = useState<LockdownSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  const loadExams = () => {
    setLoadError(null);
    setLoading(true);
    return Promise.all([
      apiGet<{ available: AvailableExam[]; submitted: SubmittedExam[] }>('/api/student/exams'),
      apiGet<LockdownSettings>('/api/settings').catch(() => null),
    ])
      .then(([d, settings]) => {
        setAvailableExams(d?.available ?? []);
        setSubmittedExams(d?.submitted ?? []);
        setLockdownSettings(settings);
        setHasLoadedData(true);
      })
      .catch(() => {
        setLoadError(hasLoadedData
          ? 'We could not refresh your exams. The last confirmed information remains visible.'
          : 'We could not load your exams. Retry when your connection is available.');
      }).finally(() => setLoading(false));
  };

  useEffect(() => {
    void loadExams();
  }, []);

  const handleStartExam = (exam: AvailableExam) => navigate(`/exam2/resume?exam=${encodeURIComponent(exam.id)}`);

  const handleViewDetails = (exam: any) => {
    if (exam.attemptId) navigate(`/exam2/attempts/${exam.attemptId}/result`);
    else navigate(`/exams/${exam.id}/results`);
  };

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="h-6 w-6 text-aubergine-600" />
          Examinations
        </h1>
        <p className="text-sm text-slate-500 mt-1">View available exams and your submission history.</p>
      </div>

      {/* Summary/entrance adapted from the installed React Bits Pro dashboard-11. */}
      {hasLoadedData && <motion.section aria-label="Exam overview" initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="grid grid-cols-3 divide-x divide-border border border-border bg-card">
        {[['Available', availableExams.length], ['In progress', availableExams.filter(e => e.activeAttemptId).length], ['Submitted', submittedExams.length]].map(([label, value]) => <div key={label} className="min-w-0 p-3 sm:p-5"><p className="text-xs sm:text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>)}
      </motion.section>}
      {loading && <p role="status" className="text-sm text-muted-foreground">Loading exams…</p>}
      {loadError && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{loadError}</p>
          </div>
          <Button type="button" variant="outline" disabled={loading} onClick={() => void loadExams()}>Retry</Button>
        </div>
      )}

      {hasLoadedData && <Tabs defaultValue="available" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-surface-raised p-1 rounded-xl group-data-horizontal/tabs:h-auto w-full sm:w-fit flex-wrap">
          <TabsTrigger value="available" className="rounded-lg h-10 px-3 sm:px-6 font-bold text-xs uppercase tracking-widest data-active:bg-white dark:data-active:bg-slate-700 data-active:shadow-sm">
            Available ({availableExams.length})
          </TabsTrigger>
          <TabsTrigger value="submitted" className="rounded-lg h-10 px-3 sm:px-6 font-bold text-xs uppercase tracking-widest data-active:bg-white dark:data-active:bg-slate-700 data-active:shadow-sm">
            Submitted ({submittedExams.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availableExams.map((exam) => (
              <Card key={exam.id} className="border-slate-200 dark:border-surface-raised shadow-sm hover:shadow-md transition-all overflow-hidden group">
                <CardHeader className="pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest border-aubergine-200 bg-aubergine-50 text-aubergine-700 dark:bg-aubergine-900/20 dark:text-aubergine-400 dark:border-aubergine-900/50">
                      {exam.subject}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {exam.opensAt ? `Opens ${new Date(exam.opensAt).toLocaleString()}` : exam.deadline ? `Due ${new Date(exam.deadline).toLocaleString()}` : 'No deadline'}
                    </span>
                  </div>
                  <CardTitle className="text-lg group-hover:text-aubergine-600 dark:group-hover:text-aubergine-400 transition-colors">{exam.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-surface-raised/50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{exam.duration}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-surface-raised/50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Questions</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{exam.questions}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-surface-raised/50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Type</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{exam.type.split(' ')[0]}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button disabled={Boolean(exam.opensAt)} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest text-xs h-10" onClick={() => handleStartExam(exam)}>
                      <Play className="mr-2 h-3 w-3" /> {exam.opensAt ? 'Not open yet' : exam.activeAttemptId ? 'Resume exam' : (exam.attemptsUsed || 0) > 0 ? 'Retake exam' : 'Review & start'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {availableExams.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white dark:bg-surface-indigo rounded-2xl border border-dashed border-slate-200 dark:border-surface-raised">
                <CheckCircle2 className="h-12 w-12 text-emerald-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold">All caught up!</h3>
                <p className="text-sm text-slate-500 mt-1">No exams are available to start right now.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="submitted" className="space-y-6 outline-none">
          <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-surface-raised/50 text-slate-500 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-surface-raised">
                    <tr>
                      <th className="px-6 py-4">Assessment Name</th>
                      <th className="px-6 py-4">Submitted At</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-center">Score</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {submittedExams.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No submissions yet. Completed attempts will appear here.</td></tr>}
                    {submittedExams.map((exam) => (
                      <tr key={exam.attemptId || exam.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{exam.title}</p>
                          <p className="text-[10px] text-aubergine-600 font-bold uppercase tracking-tighter mt-0.5">{exam.subject}</p>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                          {exam.submittedAt}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <Badge className={`
                              h-6 px-2 text-[10px] font-bold uppercase tracking-widest border-none
                              ${exam.status === 'Graded' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}
                            `}>
                              {exam.status}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-slate-200">
                          {exam.score || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <Button onClick={() => handleViewDetails(exam)} variant="ghost" size="sm" className="text-aubergine-600 text-[10px] uppercase font-bold tracking-widest h-8">
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>}

      {/* Security Warning */}
      {lockdownSettings && <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-4">
        <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0" />
        <div>
          <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-1">Integrity Policy</h4>
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            {lockdownSettings?.lockdownBrowserEnabled === false
              ? 'Lockdown monitoring is currently disabled by the school. Follow your teacher’s exam instructions.'
              : lockdownSettings?.lockdownInstructions ||
                `Exams are monitored. Stay on the exam page during the attempt.${lockdownSettings?.lockdownAutoSubmitOnViolation === false ? '' : ` The attempt may auto-submit after ${lockdownSettings?.lockdownMaxWarnings || 3} warning(s).`}`}
          </p>
        </div>
      </div>}
    </div>
  );
}
