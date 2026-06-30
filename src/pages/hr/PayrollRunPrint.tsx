import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiGet } from '../../lib/api';
import { formatMoney } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function payeeName(p: any): string {
  if (p.employee) return `${p.employee.firstName} ${p.employee.lastName}`;
  if (p.teacher) return `${p.teacher.user?.firstName ?? ''} ${p.teacher.user?.lastName ?? ''}`.trim() || p.teacher.teacherCode;
  return '—';
}

export default function PayrollRunPrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { schoolProfile } = useSettings();
  const [run, setRun] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet(`/api/payroll-runs/${id}`).then(setRun).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="p-10 text-center text-sm text-rose-600">{error}</div>;
  if (!run) return <div className="p-10 text-center text-sm text-slate-400">Loading…</div>;

  const slips = run.payslips ?? [];
  const currency = slips[0]?.currency;
  const totals = slips.reduce(
    (acc: any, p: any) => ({
      base: acc.base + p.baseSalary,
      allow: acc.allow + p.allowances,
      deduct: acc.deduct + p.deductions,
      net: acc.net + p.netPay,
    }),
    { base: 0, allow: 0, deduct: 0, net: 0 },
  );

  return (
    <div className="mx-auto max-w-4xl bg-white p-8 text-slate-900">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Button size="sm" variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
        <Button size="sm" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> Print</Button>
      </div>

      <div className="border-b-2 border-slate-800 pb-4 text-center">
        <h1 className="text-xl font-bold">{schoolProfile?.name || 'School'}</h1>
        <p className="mt-2 text-sm font-semibold uppercase tracking-wide">Payroll register</p>
        <p className="text-xs text-slate-500">{MONTHS[run.periodMonth - 1]} {run.periodYear} · {run.status} · {slips.length} payslips</p>
      </div>

      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
            <th className="py-2">#</th>
            <th className="py-2">Payee</th>
            <th className="py-2">Type</th>
            <th className="py-2 text-right">Base</th>
            <th className="py-2 text-right">Allowances</th>
            <th className="py-2 text-right">Deductions</th>
            <th className="py-2 text-right">Net pay</th>
          </tr>
        </thead>
        <tbody>
          {slips.map((p: any, i: number) => (
            <tr key={p.id} className="border-b border-slate-100">
              <td className="py-1.5 text-slate-400">{i + 1}</td>
              <td className="py-1.5">{payeeName(p)}</td>
              <td className="py-1.5 text-xs text-slate-500">{p.teacher ? 'Teacher' : 'Staff'}</td>
              <td className="py-1.5 text-right">{formatMoney(p.baseSalary, p.currency)}</td>
              <td className="py-1.5 text-right">{formatMoney(p.allowances, p.currency)}</td>
              <td className="py-1.5 text-right">{formatMoney(p.deductions, p.currency)}</td>
              <td className="py-1.5 text-right font-medium">{formatMoney(p.netPay, p.currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-800 font-bold">
            <td className="py-2" colSpan={3}>Total</td>
            <td className="py-2 text-right">{formatMoney(totals.base, currency)}</td>
            <td className="py-2 text-right">{formatMoney(totals.allow, currency)}</td>
            <td className="py-2 text-right">{formatMoney(totals.deduct, currency)}</td>
            <td className="py-2 text-right">{formatMoney(totals.net, currency)}</td>
          </tr>
        </tfoot>
      </table>

      <p className="mt-8 text-center text-[10px] text-slate-400">This is a computer-generated payroll register.</p>
    </div>
  );
}
