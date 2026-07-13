import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, DollarSign, ArrowUpRight, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePermissions } from '../../lib/permissions';
import { format } from 'date-fns';
import { formatMoney } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';

export default function FeesDashboard() {
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch('/api/fees', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setFees(data.map((f: any) => ({
            id: f.id,
            studentId: f.studentId,
            studentName: f.student ? `${f.student.user?.firstName ?? ''} ${f.student.user?.lastName ?? ''}`.trim() : '—',
            studentIdNumber: f.student?.studentCode ?? '—',
            class: f.student?.class?.name ?? f.student?.classId ?? '—',
            totalDue: f.amount,
            // The backend now computes these directly (a student can be
            // PARTIAL, meaning some but not all of totalDue is paid) --
            // re-deriving them from status alone used to silently zero out
            // any partial payment amount.
            totalPaid: f.totalPaid ?? (f.status === 'PAID' ? f.amount : 0),
            balance: f.balance ?? (f.status === 'PAID' ? 0 : f.amount),
            currency: f.currency,
            status: f.status ?? 'UNPAID',
            lastPaymentDate: f.paidDate ?? null,
          })));
        }
      })
      .catch(() => {
        setFees([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredFees = fees.filter(f => {
    const matchesSearch = f.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          f.studentIdNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || f.status === statusFilter;
    const matchesClass = classFilter === 'ALL' || f.class === classFilter;
    return matchesSearch && matchesStatus && matchesClass;
  });

  const totalCollected = fees.reduce((sum, f) => sum + (f.totalPaid ?? 0), 0);
  const totalOutstanding = fees.reduce((sum, f) => sum + (f.balance ?? 0), 0);
  const collectionRate = totalCollected + totalOutstanding > 0
    ? Math.round((totalCollected / (totalCollected + totalOutstanding)) * 100)
    : 0;
  const classOptions = Array.from(new Set(fees.map((f) => f.class).filter((className) => className && className !== '—')));
  const currency = fees.find((f) => f.currency)?.currency || systemSettings.currency || 'MYR';

  // Paid / partial / unpaid student counts (respect the active filters so the
  // breakdown matches what's shown in the table).
  const paidCount = filteredFees.filter((f) => f.status === 'PAID').length;
  const partialCount = filteredFees.filter((f) => f.status === 'PARTIAL').length;
  const unpaidCount = filteredFees.filter((f) => f.status === 'UNPAID').length;

  // Export the currently-filtered rows to CSV (client-side, no server round-trip).
  const exportCsv = () => {
    if (filteredFees.length === 0) return;
    const headers = ['Student', 'Student ID', 'Class', 'Status', 'Total Due', 'Paid', 'Balance', 'Last Payment'];
    const esc = (v: any) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filteredFees.map((f) => [
      f.studentName, f.studentIdNumber, f.class, f.status,
      f.totalDue ?? 0, f.totalPaid ?? 0, f.balance ?? 0,
      f.lastPaymentDate ? format(new Date(f.lastPaymentDate), 'yyyy-MM-dd') : '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `fees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Fees & Payments</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Manage student fees and track payments.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {hasPermission('manage_fees') && (
            <>
              <Button variant="outline" className="w-full sm:w-auto" onClick={exportCsv} disabled={filteredFees.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Export Report
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto" render={<Link to="/fees/payments/new" />} nativeButton={false}>
                <DollarSign className="mr-2 h-4 w-4" /> Record Payment
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised p-6 rounded-xl shadow-sm text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-300">Total Collected</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{formatMoney(totalCollected, currency)}</p>
        </div>
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised p-6 rounded-xl shadow-sm text-center">
           <p className="text-sm font-medium text-slate-500 dark:text-slate-300">Total Outstanding</p>
           <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{formatMoney(totalOutstanding, currency)}</p>
        </div>
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised p-6 rounded-xl shadow-sm text-center">
           <p className="text-sm font-medium text-slate-500 dark:text-slate-300">Collection Rate</p>
           <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
             {collectionRate}%
           </p>
        </div>
      </div>

      {/* Paid / Partial / Unpaid student breakdown — click a chip to filter. */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'ALL', label: 'All', count: filteredFees.length, cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
          { key: 'PAID', label: 'Paid', count: paidCount, cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { key: 'PARTIAL', label: 'Partial', count: partialCount, cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
          { key: 'UNPAID', label: 'Unpaid', count: unpaidCount, cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${s.cls} ${statusFilter === s.key ? 'ring-2 ring-offset-1 ring-slate-400 dark:ring-offset-canvas' : 'opacity-90 hover:opacity-100'}`}
          >
            {s.label}
            <span className="rounded-full bg-white/60 px-1.5 dark:bg-black/20">{s.count}</span>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-surface-indigo rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-surface-raised flex flex-col md:flex-row gap-4 items-center bg-slate-50/50 dark:bg-surface-raised/50">
          <div className="relative flex-1 w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by student name or ID..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex w-full md:w-auto gap-3">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Classes</SelectItem>
                {classOptions.map((className) => (
                  <SelectItem key={className} value={className}>{className}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-surface-raised uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Class</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Total Due</th>
                <th className="px-6 py-4 font-medium text-right">Balance</th>
                <th className="px-6 py-4 font-medium">Last Payment</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Loading fee records...
                  </td>
                </tr>
              )}
              {!loading && filteredFees.map((fee) => (
                <tr key={fee.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-semibold text-xs">
                        {fee.studentName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">{fee.studentName}</div>
                        <div className="text-xs text-slate-500">{fee.studentIdNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {fee.class}
                  </td>
                  <td className="px-6 py-4">
                    {fee.status === 'PAID' && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0 dark:bg-emerald-900/30 dark:text-emerald-400 py-0.5"><CheckCircle2 className="h-3 w-3 mr-1"/> Paid</Badge>}
                    {fee.status === 'PARTIAL' && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 dark:bg-amber-900/30 dark:text-amber-400 py-0.5">Partial</Badge>}
                    {fee.status === 'UNPAID' && <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-0 dark:bg-red-900/30 dark:text-red-400 py-0.5"><AlertCircle className="h-3 w-3 mr-1"/> Unpaid</Badge>}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-right">
                    {formatMoney(fee.totalDue, fee.currency || currency)}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-right">
                    {formatMoney(fee.balance, fee.currency || currency)}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-300">
                    {fee.lastPaymentDate ? format(new Date(fee.lastPaymentDate), 'MMM d, yyyy') : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" render={<Link to={`/fees/students/${fee.studentId}`} />} nativeButton={false}>
                       View <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
              
              {!loading && filteredFees.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No fee records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
