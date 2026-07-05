import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Calendar, Users, AlertTriangle, CheckCircle2, PiggyBank, FileBarChart, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetricCard, FinancialMetricCard, CountMetricCard, PercentageMetricCard } from '@/src/components/financial/MetricCard';
import { TrendChart } from '@/src/components/financial/TrendChart';
import { BudgetProgress, BudgetComparisonCard } from '@/src/components/financial/BudgetProgress';
import { usePermissions } from '../../lib/permissions';
import { formatMoney } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';
import { toast } from 'sonner';

export default function FinancialDashboard() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [loading, setLoading] = useState(true);

  // Dashboard data
  const [feeStats, setFeeStats] = useState({ total: 0, paid: 0, outstanding: 0, overdue: 0 });
  const [expenseStats, setExpenseStats] = useState({ total: 0, pending: 0, approved: 0, paid: 0 });
  const [budgetStats, setBudgetStats] = useState({ allocated: 0, spent: 0, remaining: 0, utilization: 0 });
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [cashFlow, setCashFlow] = useState({ inflow: 0, outflow: 0, net: 0 });

  // Enhanced dashboard data
  const [year, setYear] = useState(new Date().getFullYear());
  const [summaryData, setSummaryData] = useState<any>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<any>(null);

  const currency = systemSettings.currency || 'MYR';
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');

    // Fetch both legacy and new financial data
    Promise.all([
      fetch('/api/fees', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/expenses', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/budgets', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      // New enhanced data
      fetch(`/api/financial-reports/summary?year=${year}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
    ])
      .then(([feesData, expensesData, budgetsData, financialSummary]) => {
        // Process fee statistics
        const fees = feesData || [];
        const feeTotal = fees.reduce((sum, f) => sum + f.amount, 0);
        const feePaid = fees.filter(f => f.status === 'PAID').reduce((sum, f) => sum + f.amount, 0);
        const feeOverdue = fees.filter(f => f.status === 'OVERDUE').reduce((sum, f) => sum + f.amount, 0);

        setFeeStats({
          total: feeTotal,
          paid: feePaid,
          outstanding: feeTotal - feePaid,
          overdue: feeOverdue,
        });

        // Set recent payments (last 5)
        setRecentPayments(fees.slice(0, 5).map(f => ({
          id: f.id,
          type: 'FEE_PAYMENT',
          studentId: f.studentId,
          studentName: 'Student',
          amount: f.amount,
          date: f.paidDate || f.createdAt,
          status: f.status,
        })));

        // Process expense statistics
        const expenses = expensesData.data || expensesData || [];
        const expenseTotal = expenses.reduce((sum, e) => sum + (e.totalAmount || e.amount || 0), 0);
        const expensePaid = expenses.filter(e => e.status === 'PAID').reduce((sum, e) => sum + (e.totalAmount || e.amount || 0), 0);
        const expensePending = expenses.filter(e => e.status === 'PENDING_APPROVAL').length;

        setExpenseStats({
          total: expenseTotal,
          paid: expensePaid,
          pending: expensePending,
          approved: 0,
        });

        // Set pending approvals
        setPendingApprovals(expenses.filter(e => e.status === 'PENDING_APPROVAL').slice(0, 5));

        // Process budget statistics
        const budgets = budgetsData || [];
        const totalAllocated = budgets.reduce((sum, b) => sum + (b.allocatedAmount || 0), 0);
        const totalSpent = budgets.reduce((sum, b) => sum + (b.spentAmount || 0), 0);
        const utilization = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

        setBudgetStats({
          allocated: totalAllocated,
          spent: totalSpent,
          remaining: totalAllocated - totalSpent,
          utilization,
        });

        // Calculate cash flow
        setCashFlow({
          inflow: feePaid,
          outflow: expensePaid,
          net: feePaid - expensePaid,
        });

        // Set enhanced summary data
        setSummaryData(financialSummary);

        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load financial data');
        setLoading(false);
      });
  }, [year]);

  // Generate sample trend data for visualization
  const generateMonthlyTrends = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return {
      income: months.map(month => ({
        date: month,
        value: 45000 + Math.random() * 5000,
      })),
      expenses: months.map(month => ({
        date: month,
        value: 38000 + Math.random() * 4000,
      })),
      cashFlow: months.map(month => ({
        date: month,
        value: 7000 + Math.random() * 2000,
      })),
    };
  };

  const trends = generateMonthlyTrends();

  const netCashFlow = cashFlow.inflow - cashFlow.outflow;
  const isPositiveCashFlow = netCashFlow >= 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Financial Dashboard</h1>
          <p className="text-sm text-slate-500">Overview of fees, expenses, and budgets for {currentMonth}</p>
        </div>
        <div className="flex gap-2">
          <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" render={<Link to="/financial/reports/monthly" />} nativeButton={false}>
              <Calendar className="h-4 w-4 mr-2" />
              Monthly Report
            </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">Loading financial data...</div>
      ) : (
        <>
          {/* Enhanced KPI Cards with new visual components */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FinancialMetricCard
              title="Total Revenue"
              amount={feeStats.total}
              description="Fees & Payments"
              icon={<DollarSign className="w-4 h-4 text-green-600" />}
              trend={{
                value: 8.5,
                direction: "up",
              }}
            />
            <FinancialMetricCard
              title="Total Expenses"
              amount={expenseStats.total}
              description={`${expenseStats.paid} paid, ${expenseStats.pending} pending`}
              icon={<Wallet className="w-4 h-4 text-red-600" />}
              trend={{
                value: 3.2,
                direction: "down",
              }}
            />
            <FinancialMetricCard
              title="Outstanding Fees"
              amount={feeStats.outstanding}
              description={`${feeStats.overdue > 0 ? 'Some overdue' : 'All current'}`}
              icon={<AlertTriangle className="w-4 h-4 text-yellow-600" />}
            />
            <PercentageMetricCard
              title="Budget Utilization"
              value={budgetStats.utilization}
              description={`${formatMoney(budgetStats.remaining, currency)} remaining`}
              threshold={90}
              icon={<PiggyBank className="w-4 h-4 text-blue-600" />}
            />
          </div>

          {/* Enhanced Cash Flow with visual components */}
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Analysis</CardTitle>
              <CardDescription>Monthly income and expense trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <TrendChart
                  data={trends.income}
                  title="Income Trend"
                  type="area"
                  color="#10b981"
                  showTrend
                  height={200}
                />
                <TrendChart
                  data={trends.expenses}
                  title="Expense Trend"
                  type="bar"
                  color="#ef4444"
                  showTrend
                  height={200}
                />
                <TrendChart
                  data={trends.cashFlow}
                  title="Net Cash Flow"
                  type="line"
                  color="#3b82f6"
                  showTrend
                  height={200}
                />
              </div>
            </CardContent>
          </Card>

          {/* Legacy Cash Flow Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Cash Inflow</span>
                    <span className="text-sm font-semibold text-green-600">{formatMoney(cashFlow.inflow, currency)}</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${Math.min(100, (cashFlow.inflow / (cashFlow.inflow + cashFlow.outflow || 1)) * 100)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Cash Outflow</span>
                    <span className="text-sm font-semibold text-red-600">{formatMoney(cashFlow.outflow, currency)}</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${Math.min(100, (cashFlow.outflow / (cashFlow.inflow + cashFlow.outflow || 1)) * 100)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Net Cash Flow</span>
                    <span className={`text-sm font-semibold ${isPositiveCashFlow ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositiveCashFlow ? '+' : ''}{formatMoney(netCashFlow, currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPositiveCashFlow ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-xs text-slate-500">
                      {isPositiveCashFlow ? 'Positive cash flow' : 'Negative cash flow'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Budget Overview */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle>Budget Utilization Overview</CardTitle>
              <Button variant="outline" size="sm" render={<Link to="/budgets" />} nativeButton={false}>View All Budgets</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <BudgetProgress
                  name="Overall Budget"
                  allocated={budgetStats.allocated}
                  spent={budgetStats.spent}
                  remaining={budgetStats.remaining}
                  utilization={budgetStats.utilization}
                  status={budgetStats.utilization > 80 ? "WARNING" : "ACTIVE"}
                  currency={currency}
                  size="compact"
                />

                {budgetStats.utilization > 80 && budgetStats.utilization < 100 && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-amber-800 dark:text-amber-200">
                      Budget utilization is at {budgetStats.utilization.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Required */}
          {(pendingApprovals.length > 0 || feeStats.overdue > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Action Required
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingApprovals.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Pending Expense Approvals ({pendingApprovals.length})</div>
                    <div className="space-y-2">
                      {pendingApprovals.slice(0, 3).map((expense: any) => (
                        <div key={expense.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900 dark:text-white">{expense.title}</div>
                            <div className="text-sm text-slate-500">{expense.category}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{formatMoney(expense.totalAmount || expense.amount || 0, currency)}</span>
                            <Button variant="outline" size="sm" render={<Link to={`/expenses/${expense.id}`} />} nativeButton={false}>Review</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {feeStats.overdue > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <div>
                        <div className="font-medium text-red-900 dark:text-red-200">Overdue Fees</div>
                        <div className="text-sm text-red-700 dark:text-red-300">{formatMoney(feeStats.overdue, currency)} in overdue payments</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" render={<Link to="/fees" />} nativeButton={false}>View Fees</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {hasPermission('manage_fees') && (
                  <Button variant="outline" className="h-20 flex-col" render={<Link to="/fees/payments/new" />} nativeButton={false}>
                      <DollarSign className="h-6 w-6 mb-2" />
                      Record Payment
                    </Button>
                )}
                {hasPermission('manage_expenses') && (
                  <Button variant="outline" className="h-20 flex-col" render={<Link to="/expenses/new" />} nativeButton={false}>
                      <Wallet className="h-6 w-6 mb-2" />
                      New Expense
                    </Button>
                )}
                {hasPermission('view_budgets') && (
                  <Button variant="outline" className="h-20 flex-col" render={<Link to="/budgets" />} nativeButton={false}>
                      <TrendingUp className="h-6 w-6 mb-2" />
                      View Budgets
                    </Button>
                )}
                {hasPermission('view_fee_structures') && (
                  <Button variant="outline" className="h-20 flex-col" render={<Link to="/fee-structures" />} nativeButton={false}>
                      <Users className="h-6 w-6 mb-2" />
                      Fee Structures
                    </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {hasPermission('view_financial_reports') && (
            <Card>
              <CardHeader>
                <CardTitle>Financial Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-20 flex-col" render={<Link to="/financial/reports/monthly" />} nativeButton={false}>
                      <Calendar className="h-6 w-6 mb-2" />
                      Monthly Report
                    </Button>
                  <Button variant="outline" className="h-20 flex-col" render={<Link to="/financial/reports/income-expense" />} nativeButton={false}>
                      <FileBarChart className="h-6 w-6 mb-2" />
                      Income &amp; Expense
                    </Button>
                  <Button variant="outline" className="h-20 flex-col" render={<Link to="/financial/reports/budget-vs-actual" />} nativeButton={false}>
                      <BarChart3 className="h-6 w-6 mb-2" />
                      Budget vs Actual
                    </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
