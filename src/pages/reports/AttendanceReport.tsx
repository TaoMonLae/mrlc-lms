import React, { useEffect, useMemo, useState } from 'react';
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
interface AttendanceRow {
  studentId: string; name: string; code: string;
  total: number; present: number; absent: number; late: number; excused: number; rate: number;
}
interface AttendanceReportData {
  rows: AttendanceRow[]; classAverage: number; perfectCount: number; atRiskCount: number;
}

function recentMonths(count = 12): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    out.push({ value, label });
  }
  return out;
}

export default function AttendanceReport() {
  const months = useMemo(() => recentMonths(), []);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classFilter, setClassFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState(months[0].value);

  const [data, setData] = useState<AttendanceReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<any[]>('/api/classes')
      .then((cs) => setClasses(cs.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => { /* dropdown stays at "All Classes" */ });
  }, []);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiGet<AttendanceReportData>(
        `/api/reports/attendance${qs({ classId: classFilter, month: monthFilter })}`
      );
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
      toast.error('Failed to load attendance report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const classLabel = classFilter === 'all'
    ? 'All Classes'
    : classes.find((c) => c.id === classFilter)?.name || '—';
  const monthLabel = months.find((m) => m.value === monthFilter)?.label || monthFilter;
  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="print:hidden flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/reports" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Attendance Report</h1>
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
         <div className="space-y-1.5 flex-1 min-w-[200px]">
           <label className="text-xs font-semibold text-slate-500 uppercase">Month</label>
           <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger><SelectValue placeholder="Select Month" /></SelectTrigger>
              <SelectContent>
                {months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
         </div>
         <Button variant="secondary" className="mb-0.5" onClick={load} disabled={isLoading}>
           <Filter className="mr-2 h-4 w-4" /> Apply Filters
         </Button>
      </div>

      {/* Screen Preview */}
      <div className="print:hidden bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm overflow-x-auto">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Preview</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
        ) : error ? (
          <div className="py-12 text-center text-sm text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No attendance records for this class and month.</div>
        ) : (
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-surface-raised">
              <tr>
                <th className="px-4 py-3 border border-slate-200 dark:border-surface-raised font-semibold">Student Name</th>
                <th className="px-4 py-3 border border-slate-200 dark:border-surface-raised font-semibold">ID</th>
                <th className="px-4 py-3 border border-slate-200 dark:border-surface-raised font-semibold text-center">Total Days</th>
                <th className="px-4 py-3 border border-slate-200 dark:border-surface-raised font-semibold text-center">Present</th>
                <th className="px-4 py-3 border border-slate-200 dark:border-surface-raised font-semibold text-center">Absent</th>
                <th className="px-4 py-3 border border-slate-200 dark:border-surface-raised font-semibold text-center">Late</th>
                <th className="px-4 py-3 border border-slate-200 dark:border-surface-raised font-semibold text-center">Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.studentId}>
                  <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised font-medium">{r.name}</td>
                  <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised">{r.code}</td>
                  <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised text-center">{r.total}</td>
                  <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised text-center">{r.present}</td>
                  <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised text-center">{r.absent}</td>
                  <td className="px-4 py-3 border border-slate-200 dark:border-surface-raised text-center">{r.late}</td>
                  <td className={`px-4 py-3 border border-slate-200 dark:border-surface-raised text-center font-semibold ${r.rate < 80 ? 'text-red-600' : 'text-emerald-600'}`}>{r.rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Print Layout */}
      <PrintLayout
        title="Monthly Attendance Report"
        preparedBy="System User"
        filters={{ Class: classLabel, Month: monthLabel }}
      >
        <table className="w-full text-sm text-left border-collapse mt-4">
            <thead>
              <tr>
                <th className="px-4 py-3 border font-semibold w-[28%]">Student Name</th>
                <th className="px-4 py-3 border font-semibold whitespace-nowrap">ID</th>
                <th className="px-4 py-3 border font-semibold text-center">Days</th>
                <th className="px-4 py-3 border font-semibold text-center">Present</th>
                <th className="px-4 py-3 border font-semibold text-center">Absent</th>
                <th className="px-4 py-3 border font-semibold text-center">Late</th>
                <th className="px-4 py-3 border font-semibold text-center">Excused</th>
                <th className="px-4 py-3 border font-semibold text-center">Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.studentId}>
                  <td className="px-4 py-3 border font-medium">{r.name}</td>
                  <td className="px-4 py-3 border">{r.code}</td>
                  <td className="px-4 py-3 border text-center">{r.total}</td>
                  <td className="px-4 py-3 border text-center">{r.present}</td>
                  <td className="px-4 py-3 border text-center font-bold">{r.absent}</td>
                  <td className="px-4 py-3 border text-center">{r.late}</td>
                  <td className="px-4 py-3 border text-center">{r.excused}</td>
                  <td className="px-4 py-3 border text-center font-bold">{r.rate}%</td>
                </tr>
              ))}
            </tbody>
        </table>

        <div className="mt-8 grid grid-cols-3 gap-6">
           <div className="border border-slate-300 p-4 rounded text-center">
             <p className="text-xs text-slate-500 uppercase font-bold">Class Average</p>
             <p className="text-2xl font-bold text-slate-900 mt-1">{data?.classAverage ?? 0}%</p>
           </div>
           <div className="border border-slate-300 p-4 rounded text-center">
             <p className="text-xs text-slate-500 uppercase font-bold">Perfect Attendance</p>
             <p className="text-2xl font-bold text-slate-900 mt-1">{data?.perfectCount ?? 0}</p>
           </div>
           <div className="border border-slate-300 p-4 rounded text-center">
             <p className="text-xs text-slate-500 uppercase font-bold">At Risk (&lt;80%)</p>
             <p className="text-2xl font-bold text-slate-900 mt-1">{data?.atRiskCount ?? 0}</p>
           </div>
        </div>
      </PrintLayout>
    </div>
  );
}
