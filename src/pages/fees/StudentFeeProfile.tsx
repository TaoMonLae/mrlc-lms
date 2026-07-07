import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePermissions } from '../../lib/permissions';
import { ArrowLeft, FileText, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatMoney } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';
import { apiSend } from '../../lib/api';
import { localToday } from '../../lib/dates';

const statusBadge: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  PARTIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  WAIVED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export default function StudentFeeProfile() {
  const { id } = useParams();
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [payTarget, setPayTarget] = useState<any>(null);

  const currency = payments.find((p) => p.currency)?.currency || systemSettings.currency || 'MYR';
  const canManage = hasPermission('manage_fees');

  const fetchFeeData = async () => {
    if (!id) return;
    try {
      const token = sessionStorage.getItem('auth_token');

      const studentRes = await fetch(`/api/students/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (studentRes.ok) {
        setStudent(await studentRes.json());
      }

      // Fetch this student's real, itemized transaction history (passing
      // studentId keeps the response as individual FeePayment rows with
      // real ids, instead of the aggregated one-row-per-student dashboard
      // overview, which has no receipt to link to).
      const feesRes = await fetch(`/api/fees?studentId=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (feesRes.ok) {
        const fees = await feesRes.json();
        setPayments(Array.isArray(fees) ? fees : []);
      }
    } catch (error) {
      console.error('Error fetching fee data:', error);
      toast.error('Failed to load fee data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchFeeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const totalDue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.paidAmount ?? (p.status === 'PAID' ? p.amount : 0)), 0);
  const balance = Math.max(0, totalDue - totalPaid);

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

        {canManage && (
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
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Amount Due</th>
                <th className="px-6 py-4 font-medium text-right">Paid</th>
                <th className="px-6 py-4 font-medium text-right">Balance</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {payments.map((payment) => {
                const paid = payment.paidAmount ?? (payment.status === 'PAID' ? payment.amount : 0);
                const bal = payment.balance ?? Math.max(0, (payment.amount || 0) - paid);
                const isRealCharge = typeof payment.id === 'string' && !payment.id.startsWith('assignment-');
                return (
                <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors">
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {(() => { const d = payment.paidDate || payment.createdAt; return d ? format(new Date(d), 'MMM d, yyyy') : 'N/A'; })()}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {payment.receiptNumber || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                     {payment.feeType || payment.description || 'Fee Payment'}
                     {payment.discountAmount > 0 && (
                       <span className="block text-xs text-slate-400">Discount applied: {formatMoney(payment.discountAmount, payment.currency || currency)}</span>
                     )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={`border-0 ${statusBadge[payment.status] || ''}`} variant="outline">{payment.status}</Badge>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-right">
                    {formatMoney(payment.amount || 0, payment.currency || currency)}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-right">
                    {formatMoney(paid, payment.currency || currency)}
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${bal > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {formatMoney(bal, payment.currency || currency)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {payment.receiptNumber && (
                        <Button variant="ghost" size="sm" render={<Link to={`/fees/receipts/${payment.id}`} />} nativeButton={false}>
                             <FileText className="mr-2 h-4 w-4" /> Receipt
                        </Button>
                      )}
                      {canManage && isRealCharge && bal > 0 && (
                        <Button variant="outline" size="sm" onClick={() => setPayTarget(payment)}>
                          Pay Balance
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
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

      {payTarget && (
        <PayBalanceDialog
          payment={payTarget}
          currency={currency}
          onClose={() => setPayTarget(null)}
          onPaid={() => { setPayTarget(null); fetchFeeData(); }}
        />
      )}
    </div>
  );
}

function PayBalanceDialog({ payment, currency, onClose, onPaid }: { payment: any; currency: string; onClose: () => void; onPaid: () => void }) {
  const balance = payment.balance ?? Math.max(0, (payment.amount || 0) - (payment.paidAmount || 0));
  const [amount, setAmount] = useState(String(balance));
  const [paymentMethod, setPaymentMethod] = useState(payment.paymentMethod || 'CASH');
  const [paymentDate, setPaymentDate] = useState(localToday());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error('Enter an amount greater than 0');
      return;
    }
    setSubmitting(true);
    try {
      await apiSend(`/api/fees/${payment.id}/pay`, 'POST', { amount: value, paymentMethod, paymentDate, notes: notes || undefined });
      toast.success('Payment recorded');
      onPaid();
    } catch (e: any) {
      toast.error(e.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment Toward Balance</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Outstanding balance: <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(balance, currency)}</span></p>
          <div className="space-y-2">
            <Label>Amount Received ({currency})</Label>
            <Input type="number" min="0" step="0.01" max={balance} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Input type="date" value={paymentDate} max={localToday()} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
