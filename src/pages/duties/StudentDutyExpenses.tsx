import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Plus,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatMoney } from '../../lib/locale';
import { formatDateOnly } from '../../lib/dates';
import { dutyExpenseAssignmentEligible, dutyExpenseIsNotFuture, dutyExpenseRosterEligible } from '../../../shared/dutyExpenses';
import { validateMoney } from '../../../shared/financeControls';

interface DutyAssignment {
  id: string;
  scheduledDate: string;
  status: string;
  dutyDefinition: { name: string; type: string };
  roster: { name: string; status: string };
}

interface DutyExpense {
  id: string;
  title: string;
  description: string | null;
  category: string;
  amount: number;
  currency: string;
  expenseDate: string;
  status: string;
  merchantName: string | null;
  receiptReference: string | null;
  rejectionReason: string | null;
  dutyAssignment?: DutyAssignment | null;
}

const CATEGORY_OPTIONS = [
  { value: 'FOOD_CATERING', label: 'Cooking & food' },
  { value: 'ACADEMIC', label: 'School supplies' },
  { value: 'OPERATIONAL', label: 'Daily necessities' },
  { value: 'OTHER', label: 'Other duty expense' },
];

const initialForm = {
  dutyAssignmentId: '',
  title: '',
  description: '',
  category: 'FOOD_CATERING',
  amount: '',
  expenseDate: '',
  merchantName: '',
  receiptReference: '',
  notes: '',
};

const statusClass: Record<string, string> = {
  PENDING_APPROVAL: 'border-amber-200 bg-amber-50 text-amber-800',
  APPROVED: 'border-blue-200 bg-blue-50 text-blue-800',
  PARTIAL: 'border-violet-200 bg-violet-50 text-violet-800',
  PAID: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  REJECTED: 'border-rose-200 bg-rose-50 text-rose-800',
  CANCELLED: 'border-slate-200 bg-slate-50 text-slate-700',
};

const readableStatus = (status: string) => status.replaceAll('_', ' ').toLowerCase().replace(/^./, (value) => value.toUpperCase());
const dateKey = (value: string) => value.slice(0, 10);

export default function StudentDutyExpenses() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [eligible, setEligible] = useState(true);
  const [currency, setCurrency] = useState('MYR');
  const [assignments, setAssignments] = useState<DutyAssignment[]>([]);
  const [expenses, setExpenses] = useState<DutyExpense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);

  const headers = () => ({ Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` });

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [expenseResponse, assignmentResponse] = await Promise.all([
        fetch('/api/student-duty-expenses', { headers: headers() }),
        fetch('/api/duty-assignments', { headers: headers() }),
      ]);
      const expenseBody = await expenseResponse.json().catch(() => ({}));
      const assignmentBody = await assignmentResponse.json().catch(() => []);
      if (!expenseResponse.ok) throw new Error(expenseBody.error || 'Could not load duty expenses');
      if (!assignmentResponse.ok) throw new Error(assignmentBody.error || 'Could not load duty assignments');
      setEligible(expenseBody.eligible !== false);
      setCurrency(expenseBody.currency || 'MYR');
      setExpenses(Array.isArray(expenseBody.expenses) ? expenseBody.expenses : []);
      setAssignments(Array.isArray(assignmentBody) ? assignmentBody : []);
    } catch (error: any) {
      setLoadError(error.message || 'Could not load duty expenses');
      toast.error(error.message || 'Could not load duty expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const eligibleAssignments = useMemo(() => assignments
    .filter((assignment) => dutyExpenseRosterEligible(assignment.roster?.status))
    .filter((assignment) => dutyExpenseAssignmentEligible(assignment.status))
    .filter((assignment) => dutyExpenseIsNotFuture(dateKey(assignment.scheduledDate)))
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate)), [assignments]);

  const selectedAssignment = eligibleAssignments.find((assignment) => assignment.id === form.dutyAssignmentId);
  const pendingTotal = expenses
    .filter((expense) => expense.status === 'PENDING_APPROVAL')
    .reduce((sum, expense) => sum + expense.amount, 0);
  const approvedTotal = expenses
    .filter((expense) => ['APPROVED', 'PARTIAL', 'PAID'].includes(expense.status))
    .reduce((sum, expense) => sum + expense.amount, 0);

  const selectAssignment = (assignmentId: string) => {
    const assignment = eligibleAssignments.find((item) => item.id === assignmentId);
    setForm((current) => ({
      ...current,
      dutyAssignmentId: assignmentId,
      expenseDate: assignment ? dateKey(assignment.scheduledDate) : '',
      category: assignment?.dutyDefinition.type === 'COOKING' ? 'FOOD_CATERING' : current.category,
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!selectedAssignment || form.title.trim().length < 2 || form.description.trim().length < 2) {
      toast.error('Choose a duty and complete the required expense details');
      return;
    }
    try { validateMoney(Number(form.amount)); }
    catch { toast.error('Enter a positive amount with at most two decimal places'); return; }
    setSubmitting(true);
    try {
      const response = await fetch('/api/student-duty-expenses', {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not submit the expense');
      setExpenses((current) => [body, ...current]);
      setForm(initialForm);
      setShowForm(false);
      toast.success('Expense sent to Finance for approval');
    } catch (error: any) {
      toast.error(error.message || 'Could not submit the expense');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading duty expenses…</div>;
  if (loadError) return <div role="alert" className="space-y-3 p-6"><p>{loadError}</p><Button onClick={() => void load()}>Retry loading expenses</Button></div>;

  if (!eligible) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <Card>
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <ShieldCheck className="h-10 w-10 text-academic-teal" />
            <h1 className="mt-4 text-xl font-semibold">Boarding students only</h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Duty expense reporting is available to boarding students who receive money for cooking and other assigned school duties.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-academic-teal">Boarding / duty finance</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">My duty expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">Record money spent while completing cooking, supply, or daily-needs duties.</p>
        </div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={submitting}>Refresh status</Button>
        <Button onClick={() => setShowForm((current) => !current)} disabled={submitting || eligibleAssignments.length === 0}>
          <Plus className="mr-2 h-4 w-4" /> {showForm ? 'Close form' : 'Add expense'}
        </Button></div>
      </header>

      <section className="grid gap-px border border-border bg-border sm:grid-cols-3" aria-label="Duty expense summary">
        <div className="bg-card p-5"><p className="text-sm text-muted-foreground">Submitted records</p><p className="mt-2 text-2xl font-semibold tabular-nums">{expenses.length}</p></div>
        <div className="bg-card p-5"><p className="text-sm text-muted-foreground">Awaiting approval</p><p className="mt-2 text-2xl font-semibold tabular-nums text-amber-700">{formatMoney(pendingTotal, currency)}</p></div>
        <div className="bg-card p-5"><p className="text-sm text-muted-foreground">Approved spending</p><p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-700">{formatMoney(approvedTotal, currency)}</p></div>
      </section>

      {eligibleAssignments.length === 0 && (
        <div className="border-l-4 border-academic-gold bg-muted p-4 text-sm">No eligible duty is assigned on or before today. Ask the school in-charge to assign your duty and publish the roster. Published, active, and completed rosters accept expenses.</div>
      )}

      {showForm && (
        <form onSubmit={submit} className="border border-foreground bg-card" aria-label="Submit duty expense">
          <div className="border-b border-foreground px-5 py-4">
            <h2 className="font-semibold">New duty expense</h2>
            <p className="mt-1 text-sm text-muted-foreground">This is submitted immediately to Finance. Check the amount and duty date before sending.</p>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Assigned duty *</Label>
              <Select value={form.dutyAssignmentId} onValueChange={selectAssignment}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose the duty connected to this spending" /></SelectTrigger>
                <SelectContent>
                  {eligibleAssignments.map((assignment) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {dateKey(assignment.scheduledDate)} · {assignment.dutyDefinition.name} · {assignment.roster.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label htmlFor="expense-date">Expense date</Label><Input id="expense-date" type="date" value={form.expenseDate} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label>Category *</Label><Select value={form.category} onValueChange={(category) => setForm({ ...form, category })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{CATEGORY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="expense-title">What was purchased? *</Label><Input id="expense-title" maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Vegetables and cooking oil" /></div>
            <div className="space-y-2"><Label htmlFor="expense-amount">Amount ({currency}) *</Label><Input id="expense-amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0.00" /></div>
            <div className="space-y-2"><Label htmlFor="merchant-name">Shop or payee</Label><Input id="merchant-name" maxLength={160} value={form.merchantName} onChange={(event) => setForm({ ...form, merchantName: event.target.value })} placeholder="Market, shop, or person paid" /></div>
            <div className="space-y-2"><Label htmlFor="receipt-reference">Receipt / reference</Label><Input id="receipt-reference" maxLength={160} value={form.receiptReference} onChange={(event) => setForm({ ...form, receiptReference: event.target.value })} placeholder="Receipt number if available" /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="expense-description">Purchase details *</Label><Textarea id="expense-description" maxLength={1000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="List the items bought and how they were used for the duty" /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="expense-notes">Additional note</Label><Textarea id="expense-notes" maxLength={1000} rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Anything Finance should know" /></div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/40 px-5 py-4">
            <p className="text-xs text-muted-foreground">Duty: {selectedAssignment?.dutyDefinition.name || 'Not selected'}</p>
            <Button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit for approval'}</Button>
          </div>
        </form>
      )}

      <Card className="rounded-none">
        <CardHeader className="border-b border-border"><CardTitle className="flex items-center gap-2 text-base"><ReceiptText className="h-4 w-4" /> Submission history</CardTitle></CardHeader>
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <div className="px-6 py-12 text-center"><WalletCards className="mx-auto h-9 w-9 text-muted-foreground/60" /><p className="mt-3 text-sm font-medium">No duty expenses submitted yet</p><p className="mt-1 text-sm text-muted-foreground">Your submitted purchases and approval status will appear here.</p></div>
          ) : (
            <div className="divide-y divide-border">
              {expenses.map((expense) => (
                <article key={expense.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{expense.title}</h3><Badge variant="outline" className={statusClass[expense.status] || ''}>{readableStatus(expense.status)}</Badge></div>
                    <p className="mt-1 text-sm text-muted-foreground">{expense.dutyAssignment?.dutyDefinition.name || 'Duty'} · {formatDateOnly(expense.expenseDate)}{expense.merchantName ? ` · ${expense.merchantName}` : ''}</p>
                    {expense.status === 'REJECTED' && expense.rejectionReason && <p className="mt-2 text-sm text-rose-700">Finance note: {expense.rejectionReason}</p>}
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                    <p className="text-lg font-semibold tabular-nums">{formatMoney(expense.amount, expense.currency || currency)}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground sm:justify-end">{expense.status === 'PENDING_APPROVAL' ? <Clock3 className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />} {readableStatus(expense.status)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
