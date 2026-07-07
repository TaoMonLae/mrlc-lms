import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { usePermissions } from '../../lib/permissions';
import { useSettings } from '../../providers/SettingsProvider';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatMoney } from '../../lib/locale';
import { apiSend } from '../../lib/api';
import { localToday } from '../../lib/dates';

const statusColor: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-800',
  PARTIAL: 'bg-amber-100 text-amber-800',
  PENDING: 'bg-amber-100 text-amber-800',
  OVERDUE: 'bg-red-100 text-red-800',
  WAIVED: 'bg-slate-100 text-slate-600',
};

export default function PaymentReceipt() {
  const { id } = useParams();
  const { hasPermission } = usePermissions();
  const { schoolProfile, brandingSettings, systemSettings } = useSettings();
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);

  const fetchPayment = async () => {
    if (!id) return;
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/fees/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setPayment(await res.json());
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || 'Payment not found');
      }
    } catch (error) {
      console.error('Error fetching payment:', error);
      toast.error('Failed to load payment receipt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-slate-500">Loading receipt...</span>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-10">
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/fees" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Fees
        </Button>
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500 dark:bg-surface-indigo dark:border-surface-raised">
          Receipt {id} is not available from the live API yet.
        </div>
      </div>
    );
  }

  const currency = payment.currency || systemSettings.currency || 'MYR';
  const discount = payment.discountAmount || 0;
  const gross = (payment.amount || 0) + discount;
  const paidAmount = payment.paidAmount ?? (payment.status === 'PAID' ? payment.amount : 0);
  const balance = payment.balance ?? Math.max(0, (payment.amount || 0) - paidAmount);

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10 print:max-w-none print:m-0 print:p-0">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 print:hidden">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/fees" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Fees
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Receipt {payment.receiptNumber}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('manage_fees') && balance > 0 && (
             <Button onClick={() => setPayOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
               Record Additional Payment
             </Button>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* Receipt Paper */}
      <div className="bg-white text-slate-900 border border-slate-200 shadow-sm p-8 max-w-3xl mx-auto print:border-none print:shadow-none print:p-0">

         {/* Header */}
         <div className="flex items-start justify-between border-b border-slate-200 pb-6 mb-6">
            <div className="flex items-center gap-4">
              {brandingSettings.logoUrl ? (
                <img src={brandingSettings.logoUrl} alt={schoolProfile.name} className="h-16 w-16 object-contain" />
              ) : (
                <div className="h-16 w-16 bg-slate-100 flex items-center justify-center rounded-lg font-bold text-slate-400 text-2xl">
                   {schoolProfile.name.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-slate-900">{schoolProfile.name}</h2>
                <p className="text-sm text-slate-500 whitespace-pre-wrap">{schoolProfile.address}</p>
                <div className="text-sm text-slate-500 mt-1 flex gap-4">
                   <span>Phone: {schoolProfile.phone}</span>
                   <span>Email: {schoolProfile.email}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
               <h1 className="text-3xl font-bold text-slate-300 uppercase tracking-widest">RECEIPT</h1>
               <div className="mt-2 text-sm text-slate-600">
                 <p><span className="font-medium">No:</span> {payment.receiptNumber}</p>
                 <p><span className="font-medium">Date:</span> {format(new Date(payment.paymentDate || payment.paidDate || payment.createdAt), 'dd MMM yyyy')}</p>
               </div>
               <div className="mt-2">
                 <Badge className={`border-0 font-bold uppercase tracking-wide ${statusColor[payment.status] || ''}`}>{payment.status}</Badge>
               </div>
            </div>
         </div>

         {/* Student Info */}
         <div className="bg-slate-50 p-4 rounded border border-slate-100 mb-8">
            <div className="grid grid-cols-2 gap-4 text-sm">
               <div>
                  <p className="text-slate-500 mb-1">Received From</p>
                  <p className="font-semibold text-slate-900 text-lg">{payment.studentName || 'Unknown Student'}</p>
               </div>
               <div className="text-right">
                  <p className="text-slate-500 mb-1">Student Details</p>
                  <p className="font-medium text-slate-900">{payment.studentIdNumber || '—'}</p>
                  <p className="text-slate-600">{payment.class || '—'}</p>
               </div>
            </div>
         </div>

         {/* Payment Details */}
         <div className="mb-8">
            <table className="w-full text-sm">
               <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                     <th className="py-3 px-4 text-left font-semibold text-slate-700">Description</th>
                     <th className="py-3 px-4 text-right font-semibold text-slate-700">Amount</th>
                  </tr>
               </thead>
               <tbody>
                  <tr className="border-b border-slate-100">
                     <td className="py-4 px-4">{payment.paymentType || payment.description || 'Fee Payment'}</td>
                     <td className="py-4 px-4 text-right">
                       {formatMoney(gross, currency)}
                     </td>
                  </tr>
                  {discount > 0 && (
                    <tr className="border-b border-slate-100 text-emerald-700">
                       <td className="py-2 px-4">Discount</td>
                       <td className="py-2 px-4 text-right">-{formatMoney(discount, currency)}</td>
                    </tr>
                  )}
                  <tr className="border-b border-slate-100">
                     <td className="py-2 px-4 text-slate-600">Amount Due</td>
                     <td className="py-2 px-4 text-right text-slate-900">{formatMoney(payment.amount || 0, currency)}</td>
                  </tr>
                  <tr className="border-b border-slate-100 text-slate-600">
                     <td className="py-2 px-4">Amount Paid</td>
                     <td className="py-2 px-4 text-right">{formatMoney(paidAmount, currency)}</td>
                  </tr>
                  {/* Total/Balance Row */}
                  <tr className="bg-slate-50">
                     <td className="py-4 px-4 text-right font-bold text-slate-900">{balance > 0 ? 'Balance Due' : 'Total Paid'}</td>
                     <td className={`py-4 px-4 text-right font-bold text-lg ${balance > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                       {formatMoney(balance > 0 ? balance : paidAmount, currency)}
                     </td>
                  </tr>
               </tbody>
            </table>
         </div>

         <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
               <h4 className="font-semibold text-slate-900 mb-2">Payment Info</h4>
               <p className="text-slate-600"><span className="font-medium">Method:</span> {(payment.paymentMethod || 'CASH').replace('_', ' ')}</p>
               {payment.notes && <p className="text-slate-600 mt-1 whitespace-pre-wrap"><span className="font-medium">Remarks:</span> {payment.notes}</p>}
            </div>

            <div className="flex flex-col items-end justify-end pt-8">
               <div className="w-48 border-t border-slate-400 pt-2 text-center">
                  <p className="font-medium text-slate-900">Authorized Signature</p>
                  <p className="text-slate-500 text-xs mt-1">Processed by: {payment.recordedBy || 'Finance Office'}</p>
               </div>
            </div>
         </div>

         <div className="mt-12 text-center text-xs text-slate-400 border-t border-slate-100 pt-4 print:mt-auto block">
            This is a computer-generated receipt. No signature is required.
         </div>
      </div>

      {/* Hide on print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:m-0, .print\\:m-0 * {
            visibility: visible;
          }
          .print\\:m-0 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {payOpen && (
        <RecordAdditionalPaymentDialog
          payment={payment}
          currency={currency}
          balance={balance}
          onClose={() => setPayOpen(false)}
          onPaid={() => { setPayOpen(false); fetchPayment(); }}
        />
      )}
    </div>
  );
}

function RecordAdditionalPaymentDialog({ payment, currency, balance, onClose, onPaid }: { payment: any; currency: string; balance: number; onClose: () => void; onPaid: () => void }) {
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
          <DialogTitle>Record Additional Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Outstanding balance: <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(balance, currency)}</span></p>
          <div className="space-y-2">
            <Label>Amount Received ({currency})</Label>
            <Input type="number" min="0" step="0.01" max={balance} value={amount} onChange={(e) => setAmount(e.target.value)} />
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
