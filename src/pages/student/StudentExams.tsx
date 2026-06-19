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
import { useNavigate } from 'react-router-dom';
import { fetchOrMock } from '../../lib/api';

interface AvailableExam { id: string; title: string; subject: string; duration: string; questions: number; deadline: string; type: string; }
interface SubmittedExam { id: string; title: string; subject: string; submittedAt: string; status: string; score: string | null; }

const MOCK_AVAILABLE: AvailableExam[] = import.meta.env.DEV ? [
  { id: '1', title: 'Mathematics Mid-Term Quiz', subject: 'Math', duration: '45 mins', questions: 30, deadline: '2024-05-20', type: 'Online Quiz' },
  { id: '2', title: 'English Essay Writing', subject: 'English', duration: '90 mins', questions: 1, deadline: '2024-05-22', type: 'Submission' },
] : [];
const MOCK_SUBMITTED: SubmittedExam[] = import.meta.env.DEV ? [
  { id: '3', title: 'Physics Chapter 1 Quiz', subject: 'Physics', submittedAt: '2024-05-10 09:30 AM', status: 'Grading', score: null },
  { id: '4', title: 'History Weekly Test', subject: 'History', submittedAt: '2024-05-08 02:15 PM', status: 'Graded', score: '18/20' },
] : [];

export default function StudentExams() {
  const navigate = useNavigate();
  const [availableExams, setAvailableExams] = useState<AvailableExam[]>([]);
  const [submittedExams, setSubmittedExams] = useState<SubmittedExam[]>([]);

  useEffect(() => {
    fetchOrMock<{ available: AvailableExam[]; submitted: SubmittedExam[] }>(
      '/api/student/exams',
      () => ({ available: MOCK_AVAILABLE, submitted: MOCK_SUBMITTED }),
      { emptyWhen: (d) => !d?.available?.length && !d?.submitted?.length },
    ).then((r) => { setAvailableExams(r.data.available); setSubmittedExams(r.data.submitted); });
  }, []);

  const handleStartExam = (exam: any) => {
    toast.info(`Opening ${exam.title}…`);
    navigate(`/exams/${exam.id}/take`);
  };

  const handleViewDetails = (exam: any) => {
    navigate(`/exams/${exam.id}/results`);
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

      <Tabs defaultValue="available" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-surface-raised p-1 rounded-xl h-12 w-fit">
          <TabsTrigger value="available" className="rounded-lg h-10 px-6 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
            Available ({availableExams.length})
          </TabsTrigger>
          <TabsTrigger value="submitted" className="rounded-lg h-10 px-6 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
            Submitted ({submittedExams.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availableExams.map((exam) => (
              <Card key={exam.id} className="border-slate-200 dark:border-surface-raised shadow-sm hover:shadow-md transition-all overflow-hidden group">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest border-aubergine-200 bg-aubergine-50 text-aubergine-700 dark:bg-aubergine-900/20 dark:text-aubergine-400 dark:border-aubergine-900/50">
                      {exam.subject}
                    </Badge>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-tighter">
                      <Clock className="h-3 w-3" /> Due {exam.deadline}
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
                    <Button className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest text-xs h-10" onClick={() => handleStartExam(exam)}>
                      <Play className="mr-2 h-3 w-3" /> Start Exam
                    </Button>
                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 border-slate-200 dark:border-surface-raised">
                      <HelpCircle className="h-4 w-4 text-slate-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {availableExams.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white dark:bg-surface-indigo rounded-2xl border border-dashed border-slate-200 dark:border-surface-raised">
                <CheckCircle2 className="h-12 w-12 text-emerald-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold">All caught up!</h3>
                <p className="text-sm text-slate-500 mt-1">No pending exams or assignments found.</p>
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
                    {submittedExams.map((exam) => (
                      <tr key={exam.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors">
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
      </Tabs>

      {/* Security Warning */}
      <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-4">
        <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0" />
        <div>
          <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-1">Integrity Policy</h4>
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            Exams are monitored. Switching tabs, using developer tools, or attempting to access unauthorized materials during an exam is strictly prohibited and will result in automatic disqualification. By starting an exam, you agree to these terms.
          </p>
        </div>
      </div>
    </div>
  );
}
