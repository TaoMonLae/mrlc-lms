import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Wallet, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '../../lib/api';
import { formatMoney } from '../../lib/locale';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const STATUS_STYLES: Record<string, string> = {
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-emerald-100 text-emerald-700',
};

export default function MyPayroll() {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/api/me/payslips')
      .then((r: any) => setSlips(Array.isArray(r) ? r : []))
      .catch((e) => setError(e.message || 'Failed to load payroll history'))
      .finally(() => setLoading(false));
  }, []);

  const totalNet = slips.reduce((sum, s) => sum + (s.netPay || 0), 0);
  const currency = slips[0]?.currency;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Wallet className="h-6 w-6 text-aubergine-600" />
          My Payroll
        </h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">
          Your own pay history — base salary, allowances, and deductions for each finalized pay period.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-slate-500">Loading…</span>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>
      ) : slips.length === 0 ? (
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-12 text-center">
          <Wallet className="h-12 w-12 mx-auto text-slate-200 mb-3" />
          <p className="text-lg font-medium text-slate-900 dark:text-white">No payroll records yet</p>
          <p className="text-sm text-slate-500">Your payslips will appear here once a payroll run including you has been finalized.</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 dark:bg-surface-raised/50 border-b border-slate-100 dark:border-surface-raised">
                  <tr className="text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="px-6 py-4">Pay Period</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Base</th>
                    <th className="px-6 py-4 text-right">Allowances</th>
                    <th className="px-6 py-4 text-right">Deductions</th>
                    <th className="px-6 py-4 text-right">Net Pay</th>
                    <th className="px-6 py-4 text-right">Payslip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {slips.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {MONTHS[s.payrollRun.periodMonth - 1]} {s.payrollRun.periodYear}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={STATUS_STYLES[s.payrollRun.status] || 'bg-slate-200 text-slate-600'}>{s.payrollRun.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">{formatMoney(s.baseSalary, s.currency)}</td>
                      <td className="px-6 py-4 text-right">{formatMoney(s.allowances, s.currency)}</td>
                      <td className="px-6 py-4 text-right">{formatMoney(s.deductions, s.currency)}</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatMoney(s.netPay, s.currency)}</td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/payroll/payslips/${s.id}/print`} className="inline-flex items-center gap-1 text-aubergine-600 hover:underline">
                          <Printer className="h-3.5 w-3.5" /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Total net pay across {slips.length} finalized pay period{slips.length === 1 ? '' : 's'}: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatMoney(totalNet, currency)}</span>
          </p>
        </>
      )}
    </div>
  );
}
