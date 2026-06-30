import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiGet } from '../../lib/api';
import { formatMoney } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';
import { format } from 'date-fns';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function payeeName(p: any): string {
  if (p.employee) return `${p.employee.firstName} ${p.employee.lastName}`;
  if (p.teacher) return `${p.teacher.user?.firstName ?? ''} ${p.teacher.user?.lastName ?? ''}`.trim() || p.teacher.teacherCode;
  return '—';
}

export default function PayslipPrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { schoolProfile } = useSettings();
  const [slip, setSlip] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet(`/api/payslips/${id}`).then(setSlip).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="p-10 text-center text-sm text-rose-600">{error}</div>;
  if (!slip) return <div className="p-10 text-center text-sm text-slate-400">Loading…</div>;

  const code = slip.employee?.employeeCode ?? slip.teacher?.teacherCode ?? '—';
  const role = slip.teacher ? 'Teacher' : (slip.employee?.designation?.title ?? 'Staff');
  const dept = slip.employee?.department?.name ?? (slip.teacher ? 'Teaching' : '—');
  const run = slip.payrollRun;

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-slate-900">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Button size="sm" variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
        <Button size="sm" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> Print</Button>
      </div>

      <div className="border-b-2 border-slate-800 pb-4 text-center">
        <h1 className="text-xl font-bold">{schoolProfile?.name || 'School'}</h1>
        {schoolProfile?.address && <p className="text-xs text-slate-500">{schoolProfile.address}</p>}
        <p className="mt-2 text-sm font-semibold uppercase tracking-wide">Payslip</p>
        {run && <p className="text-xs text-slate-500">Pay period: {MONTHS[run.periodMonth - 1]} {run.periodYear}</p>}
      </div>

      <div className="grid grid-cols-2 gap-y-1 py-4 text-sm">
        <div><span className="text-slate-400">Name:</span> <span className="font-medium">{payeeName(slip)}</span></div>
        <div><span className="text-slate-400">ID:</span> {code}</div>
        <div><span className="text-slate-400">Role:</span> {role}</div>
        <div><span className="text-slate-400">Department:</span> {dept}</div>
        <div><span className="text-slate-400">Status:</span> {run?.status ?? '—'}</div>
        <div><span className="text-slate-400">Issued:</span> {format(new Date(slip.updatedAt), 'd MMM yyyy')}</div>
      </div>

      <table className="w-full border-collapse text-sm">
        <tbody>
          <tr className="border-y border-slate-200">
            <td className="py-2">Base salary</td>
            <td className="py-2 text-right">{formatMoney(slip.baseSalary, slip.currency)}</td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="py-2">Allowances</td>
            <td className="py-2 text-right">{formatMoney(slip.allowances, slip.currency)}</td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="py-2">Deductions</td>
            <td className="py-2 text-right">− {formatMoney(slip.deductions, slip.currency)}</td>
          </tr>
          <tr className="border-b-2 border-slate-800">
            <td className="py-2 font-bold">Net pay</td>
            <td className="py-2 text-right font-bold">{formatMoney(slip.netPay, slip.currency)}</td>
          </tr>
        </tbody>
      </table>

      {slip.notes && <p className="mt-4 text-xs text-slate-500">Note: {slip.notes}</p>}

      <div className="mt-12 flex justify-between text-xs text-slate-500">
        <div className="border-t border-slate-300 pt-1 w-40 text-center">Employee signature</div>
        <div className="border-t border-slate-300 pt-1 w-40 text-center">Authorised signature</div>
      </div>

      <p className="mt-8 text-center text-[10px] text-slate-400">This is a computer-generated payslip.</p>
    </div>
  );
}
