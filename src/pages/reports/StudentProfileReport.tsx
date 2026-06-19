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
interface StudentRow {
  code: string; name: string; gender: string; dob: string;
  guardianName: string; guardianPhone: string; className: string;
}

export default function StudentProfileReport() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classFilter, setClassFilter] = useState('all');

  const [rows, setRows] = useState<StudentRow[]>([]);
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
      const res = await apiGet<{ rows: StudentRow[] }>(`/api/reports/students${qs({ classId: classFilter })}`);
      setRows(res.rows);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
      toast.error('Failed to load student profile report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const classLabel = classFilter === 'all' ? 'All Classes' : classes.find((c) => c.id === classFilter)?.name || '—';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="print:hidden flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/reports" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Student Profile Report</h1>
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
        title="Student Profile Export"
        preparedBy="Admin User"
        filters={{ Class: classLabel, Students: String(rows.length) }}
      >
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No students found for this class.</p>
        ) : (
        <table className="w-full text-sm text-left border-collapse mt-4">
            <thead>
              <tr>
                <th className="px-4 py-3 border font-semibold">ID</th>
                <th className="px-4 py-3 border font-semibold">Student Name</th>
                <th className="px-4 py-3 border font-semibold">Class</th>
                <th className="px-4 py-3 border font-semibold">Gender</th>
                <th className="px-4 py-3 border font-semibold">DOB</th>
                <th className="px-4 py-3 border font-semibold">Guardian</th>
                <th className="px-4 py-3 border font-semibold">Contact</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code}>
                  <td className="px-4 py-3 border text-slate-700">{r.code}</td>
                  <td className="px-4 py-3 border font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 border text-slate-700">{r.className}</td>
                  <td className="px-4 py-3 border text-slate-700">{r.gender}</td>
                  <td className="px-4 py-3 border text-slate-700">{r.dob}</td>
                  <td className="px-4 py-3 border text-slate-700">{r.guardianName}</td>
                  <td className="px-4 py-3 border text-slate-700">{r.guardianPhone}</td>
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
