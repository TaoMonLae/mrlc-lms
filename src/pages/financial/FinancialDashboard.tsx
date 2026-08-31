import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  DollarSign,
  FileBarChart,
  PiggyBank,
  ReceiptText,
  RefreshCw,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FinanceFlowChart, type FinanceFlowPoint } from '@/src/components/financial/FinanceFlowChart';
import { usePermissions } from '../../lib/permissions';
import { formatMoney } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';

interface FinancialSummary {
  income: { total: number; fees: number; donations: number; feePayments: number; donationCount: number };
  expenses: { total: number; paidExpenses: number; pendingAmount: number; pendingCount: number };
  budget: { total: number; spent: number; remaining: number; utilization: number };
  cashFlow: { net: number; positive: boolean };
  accountsReceivable: { outstanding: number; count: number };
}

interface MonthlyCashFlow {
  month: number;
  inflow: { total: number };
  outflow: { total: number };
  netFlow: number;
  cumulative: number;
}

interface CashFlowResponse {
  monthlyCashFlow: MonthlyCashFlow[];
  summary: { totalInflow: number; totalOutflow: number; netCashFlow: number; endingBalance: number };
}

interface BudgetRow {
  id: string;
  name: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  status: string;
}

interface PendingExpense {
  id: string;
  title: string;
  category: string;
  amount: number;
  taxAmount?: number | null;
  totalAmount?: number | null;
}

interface PendingExpenseResponse {
  data: PendingExpense[];
  pagination: { total: number };
}

interface DashboardData {
  summary: FinancialSummary;
  cashFlow: CashFlowResponse;
  budgets: BudgetRow[];
  pendingExpenses: PendingExpense[];
  pendingExpenseCount: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const token = sessionStorage.getItem('auth_token');
  const response = await fetch(url, {
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function MetricCell({ label, value, note, tone = 'default' }: {
  label: string;
  value: string;
  note: string;
  tone?: 'default' | 'teal' | 'coral';
}) {
  const valueTone = tone === 'teal' ? 'text-academic-teal' : tone === 'coral' ? 'text-academic-coral' : 'text-foreground';
  return (
    <div className="min-w-0 border-t border-foreground px-5 py-5 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={`mt-2 truncate font-mono text-xl font-semibold tabular-nums tracking-[-0.03em] ${valueTone}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function LedgerLink({ to, icon: Icon, title, detail }: {
  to: string;
  icon: typeof DollarSign;
  title: string;
  detail: string;
}) {
  return (
    <Link
      to={to}
      className="group grid grid-cols-[36px_1fr_auto] items-center gap-3 border-t border-border px-4 py-4 first:border-t-0 hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-academic-teal"
    >
      <span className="grid h-9 w-9 place-items-center border border-foreground bg-background" aria-hidden="true">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{detail}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

function LoadingLedger() {
  return (
    <div className="space-y-5" aria-label="Loading financial dashboard" aria-busy="true">
      <div className="grid animate-pulse border border-foreground bg-card sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 border-t border-foreground first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0" />
        ))}
      </div>
      <div className="h-[430px] animate-pulse border border-foreground bg-card" />
    </div>
  );
}

export default function FinancialDashboard() {
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const currency = systemSettings.currency || 'MYR';
  const yearOptions = Array.from({ length: 6 }, (_, index) => currentYear + 1 - index);

  const loadDashboard = useCallback(async (signal: AbortSignal) => {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const [summary, cashFlow, budgets, pending] = await Promise.all([
      fetchJson<FinancialSummary>(`/api/financial-reports/summary?fiscalYear=${year}`, signal),
      fetchJson<CashFlowResponse>(`/api/financial-reports/cash-flow?startDate=${yearStart}&endDate=${yearEnd}`, signal),
      fetchJson<BudgetRow[]>(`/api/budgets?fiscalYear=${year}`, signal),
      fetchJson<PendingExpenseResponse>(`/api/expenses?status=PENDING_APPROVAL&limit=5&startDate=${yearStart}&endDate=${yearEnd}`, signal),
    ]);
    return {
      summary,
      cashFlow,
      budgets,
      pendingExpenses: pending.data || [],
      pendingExpenseCount: pending.pagination?.total || 0,
    };
  }, [year]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    loadDashboard(controller.signal)
      .then((nextData) => {
        if (!controller.signal.aborted) setData(nextData);
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setData(null);
          setError(loadError instanceof Error ? loadError.message : 'Financial records could not be loaded.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [loadDashboard, reloadKey]);

  const chartData = useMemo<FinanceFlowPoint[]>(() => {
    const rows = data?.cashFlow.monthlyCashFlow || [];
    const byMonth = new Map(rows.map((row) => [row.month, row]));
    return MONTHS.map((label, index) => {
      const row = byMonth.get(index + 1);
      return {
        label,
        income: row?.inflow.total || 0,
        expenses: row?.outflow.total || 0,
        net: row?.netFlow || 0,
      };
    });
  }, [data]);

  const budgetRows = useMemo(() => {
    return [...(data?.budgets || [])]
      .sort((a, b) => {
        const aUse = a.allocatedAmount > 0 ? a.spentAmount / a.allocatedAmount : 0;
        const bUse = b.allocatedAmount > 0 ? b.spentAmount / b.allocatedAmount : 0;
        return bUse - aUse;
      })
      .slice(0, 4);
  }, [data]);

  const summary = data?.summary;
  const net = summary?.cashFlow.net || 0;
  const movementTotal = (summary?.income.total || 0) + (summary?.expenses.total || 0);
  const inflowShare = movementTotal > 0 ? ((summary?.income.total || 0) / movementTotal) * 100 : 0;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-12">
      <header className="flex flex-col gap-5 border-b border-foreground pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-academic-teal">Finance / Operating ledger</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Financial control desk</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Cash movement, fee exposure, commitments, and budget pressure for fiscal year {year}.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
            <SelectTrigger className="h-10 min-w-36 rounded-none border-foreground bg-background font-mono text-xs">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((option) => <SelectItem key={option} value={String(option)}>FY {option}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-10 rounded-none border-foreground" render={<Link to="/financial/reports/monthly" />} nativeButton={false}>
            Monthly evidence <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      {loading && <LoadingLedger />}

      {!loading && error && (
        <section className="border border-academic-coral bg-card px-6 py-10 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-academic-coral" />
          <h2 className="mt-3 text-lg font-semibold">The financial ledger is unavailable</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{error}</p>
          <Button className="mt-5 rounded-none" onClick={() => setReloadKey((key) => key + 1)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry records
          </Button>
        </section>
      )}

      {!loading && !error && summary && data && (
        <>
          <section className="grid border border-foreground bg-card sm:grid-cols-2 xl:grid-cols-4" aria-label="Financial position">
            <MetricCell label="Cash received" value={formatMoney(summary.income.total, currency)} note={`${summary.income.feePayments + summary.income.donationCount} recorded receipts`} tone="teal" />
            <MetricCell label="Paid out" value={formatMoney(summary.expenses.total, currency)} note={`${summary.expenses.paidExpenses} settled payments`} />
            <MetricCell label="Fees receivable" value={formatMoney(summary.accountsReceivable.outstanding, currency)} note={`${summary.accountsReceivable.count} open fee accounts`} tone={summary.accountsReceivable.outstanding > 0 ? 'coral' : 'default'} />
            <MetricCell label="Budget used" value={`${summary.budget.utilization.toFixed(1)}%`} note={`${formatMoney(summary.budget.remaining, currency)} uncommitted`} tone={summary.budget.utilization >= 100 ? 'coral' : 'default'} />
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.85fr)_minmax(320px,0.75fr)]">
            <FinanceFlowChart data={chartData} currency={currency} year={year} />

            <aside className="border border-foreground bg-[#0c2538] text-white">
              <div className="border-b border-white/35 px-5 py-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-[#6dd4cb]">Operating position</p>
                <p className={`mt-3 font-mono text-3xl font-semibold tabular-nums tracking-[-0.04em] ${net < 0 ? 'text-[#ff9b86]' : 'text-white'}`}>
                  {net >= 0 ? '+' : ''}{formatMoney(net, currency)}
                </p>
                <p className="mt-2 text-xs leading-5 text-white/65">Cash received less settled expense payments. Commitments are listed separately below.</p>
              </div>

              <div className="px-5 py-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-white/55">Movement split</p>
                    <p className="mt-1 font-mono text-sm tabular-nums">{inflowShare.toFixed(0)}% in / {(100 - inflowShare).toFixed(0)}% out</p>
                  </div>
                  <p className="font-mono text-xs text-white/55">FY {year}</p>
                </div>
                <div className="mt-3 flex h-2 bg-white/15" aria-hidden="true">
                  <span className="bg-[#48b9af]" style={{ width: `${inflowShare}%` }} />
                  <span className="bg-[#e97961]" style={{ width: `${100 - inflowShare}%` }} />
                </div>
              </div>

              <dl className="border-t border-white/35">
                {[
                  ['Fee collections', summary.income.fees],
                  ['Donations received', summary.income.donations],
                  ['Pending commitments', summary.expenses.pendingAmount],
                ].map(([label, value], index) => (
                  <div key={String(label)} className={`flex items-center justify-between gap-4 px-5 py-4 ${index ? 'border-t border-white/20' : ''}`}>
                    <dt className="text-xs text-white/65">{label}</dt>
                    <dd className="font-mono text-sm font-semibold tabular-nums">{formatMoney(Number(value), currency)}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
            <section className="border border-foreground bg-card" aria-labelledby="action-ledger-heading">
              <header className="flex items-start justify-between gap-4 border-b border-foreground px-5 py-5">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-academic-coral">Needs attention</p>
                  <h2 id="action-ledger-heading" className="mt-1 text-lg font-semibold">Finance action ledger</h2>
                </div>
                <span className="border border-foreground px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em]">Live</span>
              </header>

              <div className="divide-y divide-border">
                <Link to="/expenses" className="group grid gap-3 px-5 py-4 hover:bg-muted/45 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-semibold">Expense approvals</p>
                    <p className="mt-1 text-xs text-muted-foreground">{data.pendingExpenseCount ? `${data.pendingExpenseCount} submissions await a decision` : 'No submissions waiting for approval'}</p>
                  </div>
                  <span className="inline-flex items-center gap-2 font-mono text-sm font-semibold tabular-nums">
                    {data.pendingExpenseCount} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
                <Link to="/fees" className="group grid gap-3 px-5 py-4 hover:bg-muted/45 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-semibold">Open fee balances</p>
                    <p className="mt-1 text-xs text-muted-foreground">Follow up on unpaid and partially paid charges due in {year}</p>
                  </div>
                  <span className="inline-flex items-center gap-2 font-mono text-sm font-semibold tabular-nums text-academic-coral">
                    {formatMoney(summary.accountsReceivable.outstanding, currency)} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </div>

              {data.pendingExpenses.length > 0 && (
                <div className="border-t border-foreground">
                  <div className="grid grid-cols-[1fr_auto] bg-muted/35 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    <span>Latest expense submissions</span><span>Gross amount</span>
                  </div>
                  {data.pendingExpenses.slice(0, 3).map((expense) => {
                    const gross = expense.totalAmount ?? (expense.amount + (expense.taxAmount || 0));
                    return (
                      <Link key={expense.id} to={`/expenses/${expense.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-t border-border px-5 py-3 hover:bg-muted/45">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{expense.title}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{expense.category}</span>
                        </span>
                        <span className="font-mono text-sm font-semibold tabular-nums">{formatMoney(gross, currency)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="border border-foreground bg-card" aria-labelledby="budget-watch-heading">
              <header className="flex items-start justify-between gap-4 border-b border-foreground px-5 py-5">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-academic-teal">Allocation pressure</p>
                  <h2 id="budget-watch-heading" className="mt-1 text-lg font-semibold">Budget watch</h2>
                </div>
                <Link to="/budgets" className="inline-flex items-center gap-1 text-xs font-semibold text-academic-teal hover:underline">All budgets <ArrowRight className="h-3.5 w-3.5" /></Link>
              </header>
              {budgetRows.length ? (
                <div>
                  {budgetRows.map((budget, index) => {
                    const used = budget.allocatedAmount > 0 ? (budget.spentAmount / budget.allocatedAmount) * 100 : 0;
                    const barTone = used >= 100 ? 'bg-academic-coral' : used >= 80 ? 'bg-academic-gold' : 'bg-academic-teal';
                    return (
                      <Link key={budget.id} to={`/budgets/${budget.id}`} className={`block px-5 py-4 hover:bg-muted/45 ${index ? 'border-t border-border' : ''}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{budget.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{formatMoney(budget.remainingAmount, currency)} remaining</p>
                          </div>
                          <p className={`font-mono text-sm font-semibold tabular-nums ${used >= 100 ? 'text-academic-coral' : ''}`}>{used.toFixed(1)}%</p>
                        </div>
                        <div className="mt-3 h-1.5 bg-muted" aria-hidden="true"><div className={`h-full ${barTone}`} style={{ width: `${Math.min(100, Math.max(0, used))}%` }} /></div>
                      </Link>
                    );
                  })}
                </div>
              ) : <p className="px-5 py-8 text-sm text-muted-foreground">No budgets are registered for {year}.</p>}
            </section>
          </div>

          <section className="grid border border-foreground bg-card lg:grid-cols-2" aria-label="Finance workspace shortcuts">
            <div className="border-b border-foreground lg:border-b-0 lg:border-r">
              <header className="px-4 py-4">
                <p className="text-sm font-semibold">Record and manage</p>
                <p className="mt-1 text-xs text-muted-foreground">Enter source documents and maintain finance registers.</p>
              </header>
              <div className="border-t border-foreground">
                {hasPermission('manage_fees') && <LedgerLink to="/fees/payments/new" icon={DollarSign} title="Record a fee payment" detail="Post a receipt against a student balance" />}
                {hasPermission('manage_expenses') && <LedgerLink to="/expenses/new" icon={ReceiptText} title="Enter an expense" detail="Capture an invoice and approval trail" />}
                {hasPermission('manage_donations') && <LedgerLink to="/donations/new" icon={Wallet} title="Record a donation" detail="Add a donor receipt or campaign gift" />}
                {hasPermission('view_budgets') && <LedgerLink to="/budgets" icon={PiggyBank} title="Budget register" detail="Review allocations, commitments, and headroom" />}
              </div>
            </div>
            <div>
              <header className="px-4 py-4">
                <p className="text-sm font-semibold">Reports and evidence</p>
                <p className="mt-1 text-xs text-muted-foreground">Trace movement from summary to report-ready detail.</p>
              </header>
              <div className="border-t border-foreground">
                <LedgerLink to="/financial/reports/monthly" icon={Calendar} title="Monthly finance report" detail="Cash, fees, donations, and commitments by month" />
                <LedgerLink to="/financial/reports/income-expense" icon={BarChart3} title="Income and expense" detail="Source and category analysis with transaction detail" />
                <LedgerLink to="/financial/reports/budget-vs-actual" icon={FileBarChart} title="Budget versus actual" detail="Variance and utilization by approved budget" />
                {hasPermission('view_fee_structures') && <LedgerLink to="/fee-structures" icon={Users} title="Fee structures" detail="Inspect the charging rules behind receivables" />}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
