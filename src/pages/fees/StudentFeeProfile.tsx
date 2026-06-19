import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePermissions } from '../../lib/permissions';
import { ArrowLeft, CheckCircle2, FileText, Printer, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatMoney } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';

export default function StudentFeeProfile() {
  const { id } = useParams();
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);

  useEffect(() => {
    const fetchFeeData = async () => {
      if (!id) return;
      try {
        const token = sessionStorage.getItem('auth_token');

        // Fetch student data
        const studentRes = await fetch(`/api/students/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (studentRes.ok) {
          const studentData = await studentRes.json();
          setStudent(studentData);
        }

        // Fetch fee payments
        const feesRes = await fetch(`/api/fees`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (feesRes.ok) {
          const fees = await feesRes.json();
          const studentFees = fees.filter((f: any) => f.studentId === id);
          setPayments(studentFees);
        }
      } catch (error) {
        console.error('Error fetching fee data:', error);
        toast.error('Failed to load fee data');
      } finally {
        setLoading(false);
      }
    };
    fetchFeeData();
  }, [id]);

  const isPaid = (p: any) => p.status === 'PAID' || !!p.paidDate;
  const totalDue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaid = payments.filter(isPaid).reduce((sum, p) => sum + (p.amount || 0), 0);
  const balance = Math.max(0, totalDue - totalPaid);
  const currency = payments.find((p) => p.currency)?.currency || systemSettings.currency || 'MYR';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/fees" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Fees Dashboard
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Fee Profile</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">
            {student ? `${student.user?.firstName} ${student.user?.lastName} (${student.studentCode})` : `Student ID: ${id}`}
          </p>
        </div>

        {hasPermission('manage_fees') && (
           <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" render={<Link to={`/fees/payments/new?studentId=${id}`} />} nativeButton={false}>
             <Plus className="mr-2 h-4 w-4" /> Record Payment
           </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-slate-500">Loading fee data...</span>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised p-6 rounded-xl shadow-sm text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-300">Total Due</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{formatMoney(totalDue, currency)}</p>
        </div>
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised p-6 rounded-xl shadow-sm text-center">
           <p className="text-sm font-medium text-slate-500 dark:text-slate-300">Total Paid</p>
           <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{formatMoney(totalPaid, currency)}</p>
        </div>
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised p-6 rounded-xl shadow-sm text-center">
           <p className="text-sm font-medium text-slate-500 dark:text-slate-300">Outstanding Balance</p>
           <p className={`text-3xl font-bold mt-2 ${balance === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
             {formatMoney(balance, currency)}
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
                <th className="px-6 py-4 font-medium text-right">Amount</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors">
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {(() => { const d = payment.paidDate || payment.createdAt; return d ? format(new Date(d), 'MMM d, yyyy') : 'N/A'; })()}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {payment.receiptNumber || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                     {payment.feeType || payment.description || 'Fee Payment'}
                     {payment.status === 'VOIDED' && <Badge variant="destructive" className="ml-2 py-0">Voided</Badge>}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {payment.paymentMethod ? payment.paymentMethod.replace('_', ' ') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-right">
                    {formatMoney(payment.amount || 0, payment.currency || currency)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" render={<Link to={`/fees/receipts/${payment.id}`} />} nativeButton={false}>
                         <FileText className="mr-2 h-4 w-4" /> Receipt
                    </Button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
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
        </>
      )}
    </div>
  );
}
