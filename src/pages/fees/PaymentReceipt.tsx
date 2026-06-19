import React, { useRef, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Download, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '../../lib/permissions';
import { useSettings } from '../../providers/SettingsProvider';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function PaymentReceipt() {
  const { id } = useParams();
  const { hasPermission } = usePermissions();
  const { schoolProfile, brandingSettings } = useSettings();
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayment = async () => {
      if (!id) return;
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch(`/api/fees`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const fees = await res.json();
          const paymentData = fees.find((f: any) => f.id === id);
          if (paymentData) {
            setPayment(paymentData);
          } else {
            toast.error('Payment not found');
          }
        }
      } catch (error) {
        console.error('Error fetching payment:', error);
        toast.error('Failed to load payment receipt');
      } finally {
        setLoading(false);
      }
    };
    fetchPayment();
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

        <div className="flex items-center gap-2">
          {hasPermission('manage_fees') && payment.status === 'PAID' && (
             <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950">
               Void Payment
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
                 <p><span className="font-medium">Date:</span> {format(new Date(payment.paymentDate), 'dd MMM yyyy')}</p>
               </div>
               {payment.status === 'VOIDED' && (
                 <div className="mt-2 border-2 border-red-500 text-red-500 px-3 py-1 font-bold text-lg inline-block uppercase tracking-wider transform -rotate-12">
                   VOIDED
                 </div>
               )}
            </div>
         </div>

         {/* Student Info */}
         <div className="bg-slate-50 p-4 rounded border border-slate-100 mb-8">
            <div className="grid grid-cols-2 gap-4 text-sm">
               <div>
                  <p className="text-slate-500 mb-1">Received From</p>
                  <p className="font-semibold text-slate-900 text-lg">{payment.studentName}</p>
               </div>
               <div className="text-right">
                  <p className="text-slate-500 mb-1">Student Details</p>
                  <p className="font-medium text-slate-900">{payment.studentIdNumber}</p>
                  <p className="text-slate-600">{payment.class}</p>
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
                     <td className="py-4 px-4">{payment.paymentType}</td>
                     <td className="py-4 px-4 text-right">
                       {payment.currency} {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                     </td>
                  </tr>
                  {/* Total Row */}
                  <tr className="bg-slate-50">
                     <td className="py-4 px-4 text-right font-bold text-slate-900">Total Paid</td>
                     <td className="py-4 px-4 text-right font-bold text-slate-900 text-lg">
                       {payment.currency} {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                     </td>
                  </tr>
               </tbody>
            </table>
         </div>

         <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
               <h4 className="font-semibold text-slate-900 mb-2">Payment Info</h4>
               <p className="text-slate-600"><span className="font-medium">Method:</span> {payment.paymentMethod.replace('_', ' ')}</p>
               {payment.notes && <p className="text-slate-600 mt-1"><span className="font-medium">Remarks:</span> {payment.notes}</p>}
               {payment.status === 'VOIDED' && <p className="text-red-500 mt-1"><span className="font-medium">Void Reason:</span> Error in amount</p>}
            </div>

            <div className="flex flex-col items-end justify-end pt-8">
               <div className="w-48 border-t border-slate-400 pt-2 text-center">
                  <p className="font-medium text-slate-900">Authorized Signature</p>
                  <p className="text-slate-500 text-xs mt-1">Processed by: {payment.recordedBy}</p>
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
    </div>
  );
}
