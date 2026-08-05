import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { Search, DollarSign, ArrowUpRight, CheckCircle2, AlertCircle, Download, CalendarDays } from 'lucide-react';
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
import { feeMonthLabel, feeMonthOptions } from '../../../shared/feePeriods';

export default function FeesDashboard() {
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const monthOptions = useMemo(() => feeMonthOptions(new Date(), 36, 12), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const token = sessionStorage.getItem('auth_token');
    const query = monthFilter === 'ALL' ? '' : `?month=${encodeURIComponent(monthFilter)}`;
    setLoading(true);
    setLoadError('');
    setFees([]);
    fetch(`/api/fees${query}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || 'Failed to load fee records');
        return body;
      })
      .then(data => {
        if (!active) return;
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
      .catch((error: any) => {
        if (!active || error?.name === 'AbortError') return;
        setFees([]);
        setLoadError(error?.message || 'Failed to load fee records');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
      controller.abort();
    };
  }, [monthFilter]);

  const baseFilteredFees = fees.filter(f => {
    const matchesSearch = f.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          f.studentIdNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = classFilter === 'ALL' || f.class === classFilter;
    return matchesSearch && matchesClass;
  });
  const filteredFees = baseFilteredFees.filter((f) => statusFilter === 'ALL' || f.status === statusFilter);

  const totalCollected = baseFilteredFees.reduce((sum, f) => sum + (f.totalPaid ?? 0), 0);
  const totalOutstanding = baseFilteredFees.reduce((sum, f) => sum + (f.balance ?? 0), 0);
  const collectionRate = totalCollected + totalOutstanding > 0
    ? Math.round((totalCollected / (totalCollected + totalOutstanding)) * 100)
    : 0;
  const classOptions = Array.from(new Set(fees.map((f) => f.class).filter((className) => className && className !== '—')));
  const currency = fees.find((f) => f.currency)?.currency || systemSettings.currency || 'MYR';

  // Paid / partial / unpaid student counts (respect the active filters so the
  // breakdown matches what's shown in the table).
  const paidCount = baseFilteredFees.filter((f) => f.status === 'PAID').length;
  const partialCount = baseFilteredFees.filter((f) => f.status === 'PARTIAL').length;
  const unpaidCount = baseFilteredFees.filter((f) => f.status === 'UNPAID').length;
  const periodLabel = monthFilter === 'ALL' ? 'All months' : feeMonthLabel(monthFilter);

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
    const periodSlug = monthFilter === 'ALL' ? 'all-months' : monthFilter;
    a.download = `fees-${periodSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-w-0 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Fees & Payments</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Manage student fees and track payments · {periodLabel}</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto">
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
          { key: 'ALL', label: 'All', count: baseFilteredFees.length, cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
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
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 md:flex md:w-auto">
            <Select
              value={monthFilter}
              onValueChange={(value) => {
                setMonthFilter(value);
                setClassFilter('ALL');
              }}
            >
              <SelectTrigger className="w-full md:w-[190px]">
                <CalendarDays className="mr-2 h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Billing month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Months</SelectItem>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full md:w-[140px]">
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
              <SelectTrigger className="w-full md:w-[140px]">
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
              {!loading && !loadError && filteredFees.map((fee) => (
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
              
              {!loading && loadError && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-red-600 dark:text-red-400">
                    {loadError}
                  </td>
                </tr>
              )}

              {!loading && !loadError && filteredFees.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No fee records found for {periodLabel.toLowerCase()} matching your filters.
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
