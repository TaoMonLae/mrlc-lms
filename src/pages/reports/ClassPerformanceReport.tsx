import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PrintLayout } from '../../components/reports/PrintLayout';
import { apiGet } from '../../lib/api';

interface ClassRow { className: string; totalStudents: number; subjectAverages: Record<string, number>; overall: number; }
interface ClassPerfData { subjects: string[]; rows: ClassRow[]; schoolAverages: Record<string, number>; schoolOverall: number; }

export default function ClassPerformanceReport() {
  const [data, setData] = useState<ClassPerfData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await apiGet<ClassPerfData>('/api/reports/classes'));
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
      toast.error('Failed to load class performance report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Class Performance Comparison</h1>
        </div>

        <div className="flex items-center gap-2">
           <Button onClick={() => window.print()} disabled={isLoading || !rows.length} className="bg-primary hover:bg-primary/90 text-primary-foreground">
             <Printer className="mr-2 h-4 w-4" /> Print / PDF
           </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="print:hidden flex items-center justify-center py-12 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
      ) : error ? (
        <div className="print:hidden py-12 text-center text-sm text-red-600">{error}</div>
      ) : (
      <PrintLayout
        title="Class Performance Comparison"
        preparedBy="Academic Admin"
        filters={{ Scope: 'All Classes' }}
      >
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No classes with graded exams yet.</p>
        ) : (
        <table className="w-full text-sm text-center border-collapse mt-4">
            <thead>
              <tr>
                <th className="px-4 py-3 border font-semibold text-left">Class Name</th>
                <th className="px-4 py-3 border font-semibold">Total Students</th>
                {subjects.map((s) => <th key={s} className="px-4 py-3 border font-semibold">{s} Avg (%)</th>)}
                <th className="px-4 py-3 border font-semibold text-right">Overall Avg (%)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 border font-medium text-slate-900 text-left">{r.className}</td>
                  <td className="px-4 py-3 border text-slate-700">{r.totalStudents}</td>
                  {subjects.map((s) => <td key={s} className="px-4 py-3 border text-slate-700">{r.subjectAverages[s] != null ? r.subjectAverages[s] : '—'}</td>)}
                  <td className="px-4 py-3 border text-right font-bold text-slate-900">{r.overall}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
               <tr>
                  <td colSpan={2} className="px-4 py-3 border font-bold text-slate-900 text-right">School Average:</td>
                  {subjects.map((s) => <td key={s} className="px-4 py-3 border font-bold text-slate-900">{data?.schoolAverages[s] ?? 0}</td>)}
                  <td className="px-4 py-3 border font-bold text-slate-900 text-right">{data?.schoolOverall ?? 0}</td>
               </tr>
            </tfoot>
        </table>
        )}
      </PrintLayout>
      )}
    </div>
  );
}
