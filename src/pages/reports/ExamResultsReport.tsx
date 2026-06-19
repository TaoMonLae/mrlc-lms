import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Printer, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { PrintLayout } from '../../components/reports/PrintLayout';
import { apiGet, qs } from '../../lib/api';

interface ClassOption { id: string; name: string; }
interface ExamRow { studentName: string; scores: Record<string, number>; average: number; grade: string; }
interface ExamReportData { subjects: string[]; rows: ExamRow[]; }

export default function ExamResultsReport() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classFilter, setClassFilter] = useState('all');

  const [data, setData] = useState<ExamReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<any[]>('/api/classes')
      .then((cs) => setClasses(cs.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
  }, []);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiGet<ExamReportData>(`/api/reports/exams${qs({ classId: classFilter })}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
      toast.error('Failed to load exam results report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const classLabel = classFilter === 'all' ? 'All Classes' : classes.find((c) => c.id === classFilter)?.name || '—';
  const subjects = data?.subjects ?? [];
  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="print:hidden flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/reports" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Exam Results Report</h1>
        </div>

        <div className="flex items-center gap-2">
           <Button onClick={() => window.print()} disabled={isLoading || !rows.length} className="bg-primary hover:bg-primary/90 text-primary-foreground">
             <Printer className="mr-2 h-4 w-4" /> Print / PDF
           </Button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="print:hidden bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4 flex flex-wrap gap-4 items-end shadow-sm">
         <div className="space-y-1.5 flex-1 min-w-[200px]">
           <label className="text-xs font-semibold text-slate-500 uppercase">Class</label>
           <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
         </div>
         <Button variant="secondary" className="mb-0.5" onClick={load} disabled={isLoading}>
           <Filter className="mr-2 h-4 w-4" /> Apply Filters
         </Button>
      </div>

      {isLoading ? (
        <div className="print:hidden flex items-center justify-center py-12 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
      ) : error ? (
        <div className="print:hidden py-12 text-center text-sm text-red-600">{error}</div>
      ) : (
      <PrintLayout
        title="Exam Results Summary"
        preparedBy="Academic Admin"
        filters={{ Class: classLabel }}
      >
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No graded exam attempts found for this class.</p>
        ) : (
        <table className="w-full text-sm text-center border-collapse mt-4">
            <thead>
              <tr>
                <th className="px-4 py-3 border font-semibold text-left">Student Name</th>
                {subjects.map((s) => <th key={s} className="px-4 py-3 border font-semibold">{s}</th>)}
                <th className="px-4 py-3 border font-semibold text-right">Average (%)</th>
                <th className="px-4 py-3 border font-semibold text-right">Grade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 border font-medium text-slate-900 text-left">{r.studentName}</td>
                  {subjects.map((s) => <td key={s} className="px-4 py-3 border text-slate-700">{r.scores[s] != null ? r.scores[s] : '—'}</td>)}
                  <td className="px-4 py-3 border text-right font-bold text-slate-900">{r.average}</td>
                  <td className="px-4 py-3 border text-right font-bold text-slate-900">{r.grade}</td>
                </tr>
              ))}
            </tbody>
        </table>
        )}
      </PrintLayout>
      )}
    </div>
  );
}
