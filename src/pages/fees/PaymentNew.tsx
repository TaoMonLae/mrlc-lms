import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Receipt } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const getNextReceiptNumber = () => {
   // In a real app, generate from backend.
   return `RCP-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
};

const paymentSchema = z.object({
  studentId: z.string().min(1, 'Student selection is required'),
  amount: z.any().transform((v) => Number(v)).refine((v) => !isNaN(v) && v > 0, 'Amount must be greater than 0'),
  paymentType: z.string().min(3, 'Provide payment description (e.g. Tuition Fee)'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'OTHER']),
  paymentDate: z.string().min(1, 'Payment date is required'),
  receiptNumber: z.string(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof paymentSchema>;

export default function PaymentNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStudentId = searchParams.get('studentId') || '';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      studentId: initialStudentId,
      paymentMethod: 'CASH',
      paymentDate: new Date().toISOString().split('T')[0],
      receiptNumber: getNextReceiptNumber(),
      amount: 0,
    }
  });

  const onSubmit = async (data: FormValues) => {
    const token = sessionStorage.getItem('auth_token');
    try {
      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record payment');
      }
      const fee = await res.json();
      toast.success('Payment recorded successfully');
      navigate(`/fees/receipts/${fee.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/fees" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Fees
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Record Payment</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Add a new fee payment to the system.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised p-6 rounded-xl shadow-sm">
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="studentId">Student *</Label>
              <Select value={watch('studentId')} onValueChange={(val) => setValue('studentId', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Student" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Ali bin Ahmad (Grade 10A)</SelectItem>
                  <SelectItem value="2">Sarah Lee (Grade 10B)</SelectItem>
                  <SelectItem value="3">John Doe (Grade 10A)</SelectItem>
                </SelectContent>
              </Select>
              {errors.studentId && <p className="text-xs text-red-500 font-medium">{errors.studentId.message}</p>}
            </div>

            <div className="space-y-2 text-slate-500 font-medium md:col-span-2">
               <span className="text-sm">Currency: MYR (Malaysian Ringgit)</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (MYR) *</Label>
              <Input id="amount" type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-xs text-red-500 font-medium">{errors.amount.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentType">Description / Fee Type *</Label>
              <Input id="paymentType" {...register('paymentType')} placeholder="e.g. Term 1 Tuition Fee" />
              {errors.paymentType && <p className="text-xs text-red-500 font-medium">{errors.paymentType.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select value={watch('paymentMethod')} onValueChange={(val: any) => setValue('paymentMethod', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.paymentMethod && <p className="text-xs text-red-500 font-medium">{errors.paymentMethod.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <Input id="paymentDate" type="date" {...register('paymentDate')} max={new Date().toISOString().split('T')[0]} />
              {errors.paymentDate && <p className="text-xs text-red-500 font-medium">{errors.paymentDate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="receiptNumber">Receipt Number (Auto)</Label>
              <Input id="receiptNumber" {...register('receiptNumber')} readOnly className="bg-slate-50 dark:bg-surface-raised/50" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea id="notes" {...register('notes')} placeholder="Additional references, cheque numbers, etc." rows={3} />
            </div>
         </div>

         <div className="pt-4 border-t border-slate-100 dark:border-surface-raised flex justify-end gap-3">
             <Button type="button" variant="outline" onClick={() => navigate('/fees')}>
               Cancel
             </Button>
             <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
               {isSubmitting ? 'Recording...' : (
                 <>
                   <Receipt className="mr-2 h-4 w-4" />
                   Record Payment & Generate
                 </>
               )}
             </Button>
          </div>
      </form>
    </div>
  );
}
