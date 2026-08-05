import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Save, Receipt, Calendar } from 'lucide-react';
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
import { useSettings } from '../../providers/SettingsProvider';
import { localToday } from '../../lib/dates';
import { formatMoney } from '../../lib/locale';

type StudentOption = {
  id: string;
  name: string;
  code: string;
  className: string;
};

const getNextReceiptNumber = () => {
   const now = new Date();
   const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${now.getTime().toString().slice(-6)}`;
   return `RCP-${stamp}`;
};

const paymentSchema = z
  .object({
    studentId: z.string().min(1, 'Student selection is required'),
    totalAmount: z.any().transform((v) => Number(v)).refine((v) => !isNaN(v) && v > 0, 'Total amount must be greater than 0'),
    discountAmount: z.any().transform((v) => (v === '' || v == null ? 0 : Number(v))).refine((v) => !isNaN(v) && v >= 0, 'Discount cannot be negative'),
    amountPaid: z.any().transform((v) => (v === '' || v == null ? null : Number(v))),
    paymentMonth: z.string().min(1, 'Payment month is required'),
    paymentYear: z.string().min(4, 'Payment year is required'),
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'OTHER']),
    paymentDate: z.string().min(1, 'Payment date is required'),
    dueDate: z.string().optional(),
    receiptNumber: z.string(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.discountAmount > data.totalAmount) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountAmount'], message: 'Discount cannot exceed the total amount' });
    }
    const net = Math.max(0, data.totalAmount - data.discountAmount);
    if (data.amountPaid != null && (isNaN(data.amountPaid) || data.amountPaid < 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amountPaid'], message: 'Amount paid cannot be negative' });
    }
    if (data.amountPaid != null && data.amountPaid > net) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amountPaid'], message: 'Amount paid cannot exceed the amount due' });
    }
  });

type FormValues = z.infer<typeof paymentSchema>;

export default function PaymentNew() {
  const navigate = useNavigate();
  const { systemSettings } = useSettings();
  const [searchParams] = useSearchParams();
  const initialStudentId = searchParams.get('studentId') || '';
  const [students, setStudents] = useState<StudentOption[]>([]);

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) {
          // Surface permission/network failures instead of silently
          // rendering an empty dropdown that looks like "no students".
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed to load students (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) return;
        setStudents(data.map((student: any) => {
          const firstName = student.user?.firstName || student.firstName || '';
          const lastName = student.user?.lastName || student.lastName || '';
          return {
            id: student.id,
            name: `${firstName} ${lastName}`.trim() || student.studentCode || student.id,
            code: student.studentCode || student.studentId || '',
            className: student.class?.name || student.className || '',
          };
        }));
      })
      .catch((e: any) => {
        setStudents([]);
        toast.error(e.message || 'Failed to load students');
      });
  }, []);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currency = systemSettings.currency || 'MYR';

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
      paymentDate: localToday(),
      dueDate: '',
      receiptNumber: getNextReceiptNumber(),
      totalAmount: 0,
      discountAmount: 0,
      amountPaid: null,
      paymentMonth: currentMonth.toString(),
      paymentYear: currentYear.toString(),
    }
  });

  const totalAmount = Number(watch('totalAmount')) || 0;
  const discountAmount = Number(watch('discountAmount')) || 0;
  const netAmount = Math.max(0, totalAmount - discountAmount);
  const amountPaidRaw = watch('amountPaid');
  // Leaving "Amount Received Now" blank records this as fully paid, same
  // as the old one-step behavior -- entering a smaller number is what
  // creates a partial payment with a real balance.
  const amountPaid = amountPaidRaw === null || amountPaidRaw === undefined || (amountPaidRaw as any) === '' ? netAmount : Number(amountPaidRaw);
  const balance = Math.max(0, netAmount - amountPaid);
  const isPartial = amountPaid > 0 && balance > 0;

  const onSubmit = async (data: FormValues) => {
    const token = sessionStorage.getItem('auth_token');
    try {
      // Construct payment type from month and year
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[parseInt(data.paymentMonth) - 1];
      const paymentType = `Monthly Fees - ${monthName} ${data.paymentYear}`;

      const payload = {
        studentId: data.studentId,
        totalAmount: data.totalAmount,
        discountAmount: data.discountAmount,
        amountPaid: data.amountPaid,
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate,
        billingMonth: `${data.paymentYear}-${data.paymentMonth.padStart(2, '0')}`,
        dueDate: data.dueDate || undefined,
        receiptNumber: data.receiptNumber,
        notes: data.notes,
        paymentType,
      };

      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record payment');
      }
      const fee = await res.json();
      toast.success(fee.status === 'PARTIAL' ? 'Partial payment recorded' : 'Payment recorded successfully');
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
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Charge a student a fee directly, with an optional discount and partial payment.</p>
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
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}{student.className ? ` (${student.className})` : student.code ? ` (${student.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.studentId && <p className="text-xs text-red-500 font-medium">{errors.studentId.message}</p>}
            </div>

            <div className="space-y-2 text-slate-500 font-medium md:col-span-2">
               <span className="text-sm">Currency: {currency}</span>
            </div>

            <div className="space-y-2">
              <Label>Payment Month *</Label>
              <Select value={watch('paymentMonth')} onValueChange={(val: any) => setValue('paymentMonth', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">January</SelectItem>
                  <SelectItem value="2">February</SelectItem>
                  <SelectItem value="3">March</SelectItem>
                  <SelectItem value="4">April</SelectItem>
                  <SelectItem value="5">May</SelectItem>
                  <SelectItem value="6">June</SelectItem>
                  <SelectItem value="7">July</SelectItem>
                  <SelectItem value="8">August</SelectItem>
                  <SelectItem value="9">September</SelectItem>
                  <SelectItem value="10">October</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">December</SelectItem>
                </SelectContent>
              </Select>
              {errors.paymentMonth && <p className="text-xs text-red-500 font-medium">{errors.paymentMonth.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Payment Year *</Label>
              <Select value={watch('paymentYear')} onValueChange={(val: any) => setValue('paymentYear', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = currentYear - 2 + i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.paymentYear && <p className="text-xs text-red-500 font-medium">{errors.paymentYear.message}</p>}
            </div>
         </div>

         <div className="border-t border-slate-100 dark:border-surface-raised pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Total Amount ({currency}) *</Label>
              <Input id="totalAmount" type="number" step="0.01" min="0" {...register('totalAmount')} />
              {errors.totalAmount && <p className="text-xs text-red-500 font-medium">{errors.totalAmount.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountAmount">Discount ({currency})</Label>
              <Input id="discountAmount" type="number" step="0.01" min="0" {...register('discountAmount')} />
              {errors.discountAmount && <p className="text-xs text-red-500 font-medium">{errors.discountAmount.message}</p>}
            </div>

            <div className="space-y-2 md:col-span-2 bg-slate-50 dark:bg-surface-raised/50 rounded-lg p-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Amount Due (after discount)</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{formatMoney(netAmount, currency)}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountPaid">Amount Received Now ({currency})</Label>
              <Input
                id="amountPaid"
                type="number"
                step="0.01"
                min="0"
                placeholder={netAmount.toFixed(2)}
                {...register('amountPaid')}
              />
              <p className="text-xs text-slate-400">Leave blank to record the full amount due as paid. Enter a smaller number for a partial payment.</p>
              {errors.amountPaid && <p className="text-xs text-red-500 font-medium">{errors.amountPaid.message}</p>}
            </div>

            <div className="space-y-2 rounded-lg p-4 flex items-center justify-between" style={{ background: isPartial ? 'rgba(245,158,11,0.08)' : undefined }}>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Balance Remaining</span>
              <span className={`text-lg font-bold ${balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatMoney(balance, currency)}</span>
            </div>

            {balance > 0 && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="dueDate">Balance Due Date (optional)</Label>
                <Input id="dueDate" type="date" {...register('dueDate')} />
              </div>
            )}
         </div>

         <div className="border-t border-slate-100 dark:border-surface-raised pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <Input id="paymentDate" type="date" {...register('paymentDate')} max={localToday()} />
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
                   {isPartial ? 'Record Partial Payment' : 'Record Payment & Generate'}
                 </>
               )}
             </Button>
          </div>
      </form>
    </div>
  );
}
