import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePermissions } from '../../lib/permissions';
import { ArrowLeft, CheckCircle2, FileText, Printer, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const MOCK_PAYMENTS = [
  {
    id: 'p1',
    amount: 1000,
    currency: 'MYR',
    paymentType: 'Tuition Fee 2025 Term 1',
    paymentMethod: 'BANK_TRANSFER',
    paymentDate: '2025-01-15T10:00:00Z',
    receiptNumber: 'RCP-2025-001',
    status: 'PAID',
    recordedBy: 'Admin User',
  },
  {
    id: 'p2',
    amount: 500,
    currency: 'MYR',
    paymentType: 'Tuition Fee 2025 Term 2',
    paymentMethod: 'CASH',
    paymentDate: '2025-05-10T10:00:00Z',
    receiptNumber: 'RCP-2025-054',
    status: 'PAID',
    recordedBy: 'Admin User',
  }
];

export default function StudentFeeProfile() {
  const { id } = useParams();
  const { hasPermission } = usePermissions();

  const totalDue = 1500;
  const totalPaid = MOCK_PAYMENTS.reduce((sum, p) => sum + (p.status === 'PAID' ? p.amount : 0), 0);
  const balance = Math.max(0, totalDue - totalPaid);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/fees" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Fees Dashboard
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Fee Profile: Ali bin Ahmad</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">STU-2023-001 • Grade 10A</p>
        </div>

        {hasPermission('manage_fees') && (
           <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" render={<Link to={`/fees/payments/new?studentId=${id}`} />} nativeButton={false}>
             <Plus className="mr-2 h-4 w-4" /> Record Payment
           </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised p-6 rounded-xl shadow-sm text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-300">Total Due</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">MYR {totalDue.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised p-6 rounded-xl shadow-sm text-center">
           <p className="text-sm font-medium text-slate-500 dark:text-slate-300">Total Paid</p>
           <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">MYR {totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised p-6 rounded-xl shadow-sm text-center">
           <p className="text-sm font-medium text-slate-500 dark:text-slate-300">Outstanding Balance</p>
           <p className={`text-3xl font-bold mt-2 ${balance === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
             MYR {balance.toLocaleString()}
           </p>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-indigo rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-200 dark:border-surface-raised flex justify-between items-center">
           <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Payment History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-surface-raised uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Receipt No</th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium">Method</th>
                <th className="px-6 py-4 font-medium text-right">Amount (MYR)</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {MOCK_PAYMENTS.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors">
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {format(new Date(payment.paymentDate), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {payment.receiptNumber}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                     {payment.paymentType}
                     {payment.status === 'VOIDED' && <Badge variant="destructive" className="ml-2 py-0">Voided</Badge>}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {payment.paymentMethod.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-right">
                    {payment.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" render={<Link to={`/fees/receipts/${payment.id}`} />} nativeButton={false}>
                         <FileText className="mr-2 h-4 w-4" /> Receipt
                    </Button>
                  </td>
                </tr>
              ))}
              {MOCK_PAYMENTS.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No payment history found.
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
