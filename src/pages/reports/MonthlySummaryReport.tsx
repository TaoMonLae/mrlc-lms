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
import { formatMoney } from '../../lib/locale';

interface CaseCat { category: string; newCases: number; resolved: number; open: number; }
interface MonthlyData {
  activeStudents: number; activeTeachers: number; avgAttendance: number;
  openCases: number; feeCollection: number; currency: string; casesByCategory: CaseCat[];
}

function recentMonths(count = 12): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
    });
  }
  return out;
}

export default function MonthlySummaryReport() {
  const months = useMemo(() => recentMonths(), []);
  const [monthFilter, setMonthFilter] = useState(months[0].value);

  const [data, setData] = useState<MonthlyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await apiGet<MonthlyData>(`/api/reports/monthly-summary${qs({ month: monthFilter })}`));
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
      toast.error('Failed to load monthly summary.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const monthLabel = months.find((m) => m.value === monthFilter)?.label || monthFilter;
  const cur = data?.currency || 'MYR';
  const cats = data?.casesByCategory ?? [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="print:hidden flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/reports" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Monthly School Summary</h1>
        </div>

        <div className="flex items-center gap-2">
           <Button onClick={() => window.print()} disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
             <Printer className="mr-2 h-4 w-4" /> Print / PDF
           </Button>
        </div>
      </div>

      <div className="print:hidden bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4 flex flex-wrap gap-4 items-end shadow-sm">
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
           <Filter className="mr-2 h-4 w-4" /> Apply Filter
         </Button>
      </div>

      {isLoading ? (
        <div className="print:hidden flex items-center justify-center py-12 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
      ) : error ? (
        <div className="print:hidden py-12 text-center text-sm text-red-600">{error}</div>
      ) : (
      <PrintLayout
        title="Monthly Admin Summary"
        preparedBy="System Administrator"
        filters={{ 'Reporting Month': monthLabel }}
      >
        <div className="space-y-8 mt-4">
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="border border-slate-300 p-4 rounded text-center">
                 <p className="text-xs text-slate-500 uppercase font-bold">Active Students</p>
                 <p className="text-2xl font-bold text-slate-900 mt-1">{data?.activeStudents ?? 0}</p>
              </div>
              <div className="border border-slate-300 p-4 rounded text-center">
                 <p className="text-xs text-slate-500 uppercase font-bold">Avg Attendance</p>
                 <p className="text-2xl font-bold text-slate-900 mt-1">{data?.avgAttendance ?? 0}%</p>
              </div>
              <div className="border border-slate-300 p-4 rounded text-center">
                 <p className="text-xs text-slate-500 uppercase font-bold">Open Cases</p>
                 <p className="text-2xl font-bold text-slate-900 mt-1 text-amber-600">{data?.openCases ?? 0}</p>
              </div>
              <div className="border border-slate-300 p-4 rounded text-center bg-slate-50">
                 <p className="text-xs text-slate-500 uppercase font-bold">Fee Collection</p>
                 <p className="text-2xl font-bold text-slate-900 mt-1">{formatMoney(data?.feeCollection ?? 0, cur, { decimals: false })}</p>
              </div>
           </div>

           <div>
              <h3 className="text-sm font-bold uppercase text-slate-800 border-b-2 border-slate-300 pb-2 mb-4">Case Management (Incidents)</h3>
              {cats.length === 0 ? (
                <p className="text-sm text-slate-500">No cases recorded.</p>
              ) : (
              <table className="w-full text-sm text-left border-collapse">
                 <thead>
                    <tr>
                       <th className="px-4 py-2 border font-semibold">Category</th>
                       <th className="px-4 py-2 border font-semibold text-center">New Cases</th>
                       <th className="px-4 py-2 border font-semibold text-center">Resolved</th>
                       <th className="px-4 py-2 border font-semibold text-center">Remaining Open</th>
                    </tr>
                 </thead>
                 <tbody>
                    {cats.map((c) => (
                      <tr key={c.category}>
                         <td className="px-4 py-2 border">{c.category}</td>
                         <td className="px-4 py-2 border text-center">{c.newCases}</td>
                         <td className="px-4 py-2 border text-center">{c.resolved}</td>
                         <td className="px-4 py-2 border text-center font-bold">{c.open}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
              )}
           </div>

           <div>
              <h3 className="text-sm font-bold uppercase text-slate-800 border-b-2 border-slate-300 pb-2 mb-4">Staff Summary</h3>
              <p className="text-sm text-slate-700 mb-2">Active Teaching Staff: {data?.activeTeachers ?? 0}</p>
           </div>
        </div>
      </PrintLayout>
      )}
    </div>
  );
}
