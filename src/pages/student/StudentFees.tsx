import React, { useEffect, useMemo, useState } from 'react';
import {
  Wallet,
  CreditCard,
  Clock,
  Download,
  FileText,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useSettings } from '../../providers/SettingsProvider';
import { apiGet } from '../../lib/api';
import { formatMoney } from '../../lib/locale';

interface FeeRecord {
  id: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'WAIVED';
  description?: string | null;
  paymentMethod?: string | null;
  paidDate?: string | null;
  dueDate?: string | null;
  createdAt?: string | null;
  receiptNumber?: string | null;
}

const statusBadge: Record<string, string> = {
  PAID: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  OVERDUE: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  WAIVED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export default function StudentFees() {
  const { systemSettings } = useSettings();
  const currency = systemSettings.currency || 'MYR';

  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<FeeRecord[]>('/api/fees')
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .catch((err) => {
        setError(err.message || 'Failed to load fees');
        toast.error('Failed to load your fee statement.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const summary = useMemo(() => {
    const total = records.reduce((a, r) => a + (r.amount || 0), 0);
    const paid = records.filter((r) => r.status === 'PAID').reduce((a, r) => a + (r.amount || 0), 0);
    const balance = Math.max(0, total - paid);
    const nextDue = records
      .filter((r) => r.status !== 'PAID' && r.status !== 'WAIVED' && r.dueDate)
      .map((r) => r.dueDate as string)
      .sort()[0];
    return { total, paid, balance, dueDate: nextDue ? nextDue.slice(0, 10) : '—' };
  }, [records]);

  const transactions = useMemo(
    () =>
      [...records].sort((a, b) => (b.paidDate || b.createdAt || '').localeCompare(a.paidDate || a.createdAt || '')),
    [records],
  );

  const progress = summary.total > 0 ? Math.round((summary.paid / summary.total) * 100) : 0;

  const handlePayNow = () => {
    toast.info('Online payment is not enabled yet', {
      description: 'Please pay at the school accounts office or via bank transfer, then ask staff to record your payment.',
    });
  };

  const handleDownloadReceipt = (tx: FeeRecord) => {
    if (tx.status !== 'PAID') {
      toast.info('No receipt available', { description: 'A receipt is issued once a payment is completed.' });
      return;
    }
    toast.success(`Receipt ${tx.receiptNumber || ''}`.trim(), {
      description: 'Please collect the printed receipt from the accounts office.',
    });
  };

  const handleAnnualStatement = () => {
    if (!records.length) {
      toast.info('No statement to print yet.');
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="h-6 w-6 text-aubergine-600" />
            Fees & Payments
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your school fees, payment history, and receipts.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your fee statement…</div>
      ) : error ? (
        <div className="py-20 text-center text-sm text-red-600">{error}</div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Fee Statement Summary */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-aubergine-600 text-white border-none shadow-lg shadow-aubergine-200 dark:shadow-none overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <Wallet className="h-24 w-24" />
              </div>
              <CardContent className="p-8 relative">
                <p className="text-aubergine-100 font-bold uppercase tracking-widest text-[10px] mb-1">Current Outstanding</p>
                <h3 className="text-4xl font-black tracking-tighter mb-6">{formatMoney(summary.balance, currency)}</h3>
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 px-3 py-1.5 rounded-lg">
                    <p className="text-[10px] text-aubergine-100 font-bold uppercase tracking-tighter">Due Date</p>
                    <p className="text-xs font-bold">{summary.dueDate}</p>
                  </div>
                  <Button onClick={handlePayNow} className="bg-white text-aubergine-600 hover:bg-aubergine-50 font-black uppercase tracking-widest text-[10px] h-9 px-6 rounded-xl">
                    Pay Now
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-surface-raised shadow-sm bg-white dark:bg-surface-indigo flex flex-col justify-center p-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 dark:border-surface-raised pb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Paid</span>
                  <span className="text-lg font-black text-emerald-600">{formatMoney(summary.paid, currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Billed</span>
                  <span className="text-lg font-black text-slate-800 dark:text-white">{formatMoney(summary.total, currency)}</span>
                </div>
                <div className="pt-2">
                  <div className="h-2 w-full bg-slate-100 dark:bg-surface-raised rounded-full overflow-hidden">
                    <div className="h-full bg-aubergine-500 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">
                    Payment Progress: {progress}%
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-surface-raised/50 border-b border-slate-100 dark:border-surface-raised/50">
              <CardTitle className="text-md font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-aubergine-600" /> Payment History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {transactions.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-10">No fee records on file yet.</p>
                ) : (
                <table className="w-full text-left">
                  <thead className="bg-white dark:bg-surface-indigo border-b border-slate-100 dark:border-surface-raised">
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Transaction Details</th>
                      <th className="px-6 py-4">Method</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{tx.description || 'School Fee'}</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{(tx.paidDate || tx.createdAt || '').slice(0, 10)}</p>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                          {tx.paymentMethod || '—'}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white text-sm">
                          {formatMoney(tx.amount, currency)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`border-none font-bold text-[9px] uppercase tracking-widest ${statusBadge[tx.status] || ''}`}>
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Button onClick={() => handleDownloadReceipt(tx)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-aubergine-600" title="Receipt">
                            <Download className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar / Info */}
        <div className="space-y-8">
          <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-aubergine-600" /> How to Pay
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <button type="button" onClick={() => toast.info('Online portal payments are coming soon.')} className="w-full text-left p-3 bg-slate-50 dark:bg-surface-raised/50 rounded-xl flex items-start gap-3 group hover:bg-slate-100 transition-colors">
                <div className="h-8 w-8 bg-white dark:bg-surface-raised rounded-lg flex items-center justify-center text-aubergine-600 shadow-sm">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tighter">Online Portal</h5>
                  <p className="text-[10px] text-slate-500">Pay via Card or Mobile Banking</p>
                </div>
              </button>
              <button type="button" onClick={() => toast.info('Bank transfer details', { description: 'Contact the accounts office for the school bank account number and reference format.' })} className="w-full text-left p-3 bg-slate-50 dark:bg-surface-raised/50 rounded-xl flex items-start gap-3 group hover:bg-slate-100 transition-colors">
                <div className="h-8 w-8 bg-white dark:bg-surface-raised rounded-lg flex items-center justify-center text-aubergine-600 shadow-sm">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tighter">Bank Transfer</h5>
                  <p className="text-[10px] text-slate-500">Download Account Details</p>
                </div>
              </button>
              <button type="button" onClick={() => toast.info('For payment help, contact the accounts office.')} className="flex items-center gap-2 text-xs font-bold text-aubergine-600 mt-4 hover:underline px-1">
                 Payment Support <HelpCircle className="h-3 w-3" />
              </button>
            </CardContent>
          </Card>

          <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100/50 dark:border-blue-900/30">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <h4 className="text-sm font-bold text-blue-900 dark:text-blue-400 uppercase tracking-widest">Fee Policy</h4>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              Late payments incur a 5% surcharge after the 25th of the month. Results and transcripts will be withheld for students with outstanding balances exceeding {formatMoney(500, currency, { decimals: false })}.
            </p>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-125" />
            <div>
              <h4 className="text-sm font-bold uppercase tracking-widest">Annual Statement</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">Print or save your complete payment summary as a PDF.</p>
            </div>
            <Button onClick={handleAnnualStatement} className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold uppercase tracking-widest text-[10px] h-9">
              Print Statement <Download className="ml-2 h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
