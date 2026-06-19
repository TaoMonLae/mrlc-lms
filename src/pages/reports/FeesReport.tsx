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
interface FeeRow { studentName: string; className: string; expected: number; paid: number; balance: number; status: string; }
interface FeesReportData { rows: FeeRow[]; totalExpected: number; totalCollected: number; outstanding: number; currency: string; }

const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const statusColor: Record<string, string> = { PAID: 'text-emerald-600', PARTIAL: 'text-amber-600', UNPAID: 'text-red-600' };

export default function FeesReport() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [data, setData] = useState<FeesReportData | null>(null);
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
      const res = await apiGet<FeesReportData>(`/api/reports/fees${qs({ classId: classFilter, status: statusFilter })}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
      toast.error('Failed to load fees report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const classLabel = classFilter === 'all' ? 'All Classes' : classes.find((c) => c.id === classFilter)?.name || '—';
  const statusLabel = statusFilter === 'all' ? 'All Statuses' : statusFilter;
  const cur = data?.currency || 'THB';
  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="print:hidden flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/reports" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Fee Summary Report</h1>
        </div>

        <div className="flex items-center gap-2">
           <Button onClick={() => window.print()} disabled={isLoading || !rows.length} className="bg-primary hover:bg-primary/90 text-primary-foreground">
             <Printer className="mr-2 h-4 w-4" /> Print / PDF
           </Button>
        </div>
      </div>

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
           <label className="text-xs font-semibold text-slate-500 uppercase">Payment Status</label>
           <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PAID">Fully Paid</SelectItem>
                <SelectItem value="PARTIAL">Partial Payment</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
              </SelectContent>
            </Select>
         </div>
         <Button variant="secondary" className="mb-0.5" onClick={load} disabled={isLoading}>
           <Filter className="mr-2 h-4 w-4" /> Apply
         </Button>
      </div>

      {isLoading ? (
        <div className="print:hidden flex items-center justify-center py-12 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
      ) : error ? (
        <div className="print:hidden py-12 text-center text-sm text-red-600">{error}</div>
      ) : (
      <PrintLayout
        title="Fee Collection Summary"
        preparedBy="Finance Admin"
        filters={{ Class: classLabel, Status: statusLabel }}
      >
        <div className="mb-8 grid grid-cols-3 gap-6">
           <div className="border border-slate-300 p-4 rounded">
             <p className="text-xs text-slate-500 uppercase font-bold">Total Expected</p>
             <p className="text-xl font-bold text-slate-900 mt-1">{cur} {money(data?.totalExpected ?? 0)}</p>
           </div>
           <div className="border border-slate-300 p-4 rounded bg-slate-50">
             <p className="text-xs text-slate-500 uppercase font-bold">Total Collected</p>
             <p className="text-xl font-bold text-slate-900 mt-1">{cur} {money(data?.totalCollected ?? 0)}</p>
           </div>
           <div className="border border-slate-300 p-4 rounded">
             <p className="text-xs text-slate-500 uppercase font-bold">Outstanding</p>
             <p className="text-xl font-bold text-slate-900 mt-1 text-red-600">{cur} {money(data?.outstanding ?? 0)}</p>
           </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No fee records match this filter.</p>
        ) : (
        <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-3 border font-semibold w-[30%]">Student Name</th>
                <th className="px-4 py-3 border font-semibold">Class</th>
                <th className="px-4 py-3 border font-semibold text-right">Expected ({cur})</th>
                <th className="px-4 py-3 border font-semibold text-right">Paid ({cur})</th>
                <th className="px-4 py-3 border font-semibold text-right">Balance ({cur})</th>
                <th className="px-4 py-3 border font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 border font-medium text-slate-900">{r.studentName}</td>
                  <td className="px-4 py-3 border text-slate-700">{r.className}</td>
                  <td className="px-4 py-3 border text-right text-slate-700">{money(r.expected)}</td>
                  <td className="px-4 py-3 border text-right text-slate-700">{money(r.paid)}</td>
                  <td className={`px-4 py-3 border text-right ${r.balance > 0 ? 'font-bold text-amber-600' : 'text-slate-700'}`}>{money(r.balance)}</td>
                  <td className={`px-4 py-3 border font-bold ${statusColor[r.status] || ''}`}>{r.status}</td>
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
