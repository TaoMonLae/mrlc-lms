import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { Plus, Search, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Receipt, Building2, Wallet, Printer, FileSpreadsheet, Pencil, Trash2, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '../../lib/permissions';
import { formatMoney } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';
import { exportReportToExcel } from '../../lib/exportReport';
import { PrintLayout } from '../../components/reports/PrintLayout';
import { feeMonthLabel, feeMonthOptions } from '../../../shared/feePeriods';

const expenseGrossAmount = (expense: any) => expense.totalAmount ?? ((expense.amount || 0) + (expense.taxAmount || 0));
const expensePaidAmount = (expense: any) => Array.isArray(expense.payments)
  ? expense.payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0)
  : 0;

export default function ExpensesDashboard() {
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const monthOptions = useMemo(() => feeMonthOptions(new Date(), 36, 12), []);

  const currency = systemSettings.currency || 'MYR';

  useEffect(() => {
    const controller = new AbortController();
    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };

    const loadExpenses = async () => {
      try {
        setLoading(true);
        const firstResponse = await fetch('/api/expenses?limit=100&page=1', { headers, signal: controller.signal });
        const firstPage = await firstResponse.json().catch(() => ({}));
        if (!firstResponse.ok) throw new Error(firstPage.error || 'Failed to load expenses');

        const totalPages = firstPage.pagination?.totalPages || 1;
        const remainingPages = await Promise.all(
          Array.from({ length: Math.max(0, totalPages - 1) }, async (_, index) => {
            const response = await fetch(`/api/expenses?limit=100&page=${index + 2}`, { headers, signal: controller.signal });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.error || 'Failed to load expenses');
            return body.data || [];
          }),
        );
        setExpenses([...(firstPage.data || []), ...remainingPages.flat()]);
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        setExpenses([]);
        toast.error(error?.message || 'Failed to load expenses');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadExpenses();
    return () => controller.abort();
  }, []);

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (e.vendor?.name && e.vendor.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (e.vendorInvoiceNo && e.vendorInvoiceNo.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || e.category === categoryFilter;
    const matchesMonth = monthFilter === 'ALL' || String(e.expenseDate || '').slice(0, 7) === monthFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesMonth;
  });

  const trackableExpenses = filteredExpenses.filter((expense) => !['REJECTED', 'CANCELLED'].includes(expense.status));
  const totalAmount = trackableExpenses.reduce((sum, expense) => sum + expenseGrossAmount(expense), 0);
  const paidAmount = trackableExpenses.reduce((sum, expense) => sum + expensePaidAmount(expense), 0);
  const pendingAmount = trackableExpenses.reduce(
    (sum, expense) => sum + Math.max(0, expenseGrossAmount(expense) - expensePaidAmount(expense)),
    0,
  );
  const pendingApproval = filteredExpenses.filter(e => e.status === 'PENDING_APPROVAL').length;

  const categoryOptions = Array.from(new Set(expenses.map((e) => e.category)));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800 border-green-200';
      case 'APPROVED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PARTIAL': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PENDING_APPROVAL': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
      case 'CANCELLED': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      OPERATIONAL: 'Operational',
      ACADEMIC: 'Academic',
      STAFF_COSTS: 'Staff Costs',
      FOOD_CATERING: 'Food & Catering',
      TRANSPORTATION: 'Transportation',
      FACILITY: 'Facility',
      TECHNOLOGY: 'Technology',
      EVENT: 'Event',
      ADMINISTRATIVE: 'Administrative',
      OTHER: 'Other',
    };
    return labels[category] || category;
  };

  const handleExportExcel = () => {
    exportReportToExcel({
      title: 'Expenses',
      subtitle: `${filteredExpenses.length} expense${filteredExpenses.length === 1 ? '' : 's'}`,
      filename: monthFilter === 'ALL' ? 'expenses' : `expenses-${monthFilter}`,
      summary: [
        { label: 'Total Expenses', value: formatMoney(totalAmount, currency) },
        { label: 'Paid', value: formatMoney(paidAmount, currency) },
        { label: 'Outstanding', value: formatMoney(pendingAmount, currency) },
        { label: 'Awaiting Approval', value: String(pendingApproval) },
      ],
      sections: [
        {
          heading: 'Expenses',
          columns: ['Title', 'Category', 'Vendor', 'Date', 'Amount', 'Status'],
          rows: filteredExpenses.map((e) => [
            e.title,
            getCategoryLabel(e.category),
            e.vendor?.name || '-',
            new Date(e.expenseDate).toLocaleDateString(),
            formatMoney(expenseGrossAmount(e), e.currency || currency),
            e.status.replace('_', ' '),
          ]),
        },
      ],
    });
  };

  const handleDelete = async (expense: any) => {
    if (!confirm(`Delete expense "${expense.title}"? This cannot be undone.`)) return;

    const token = sessionStorage.getItem('auth_token');
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete expense');
      }

      setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
      toast.success('Expense deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete expense');
    }
  };

  const activeFilters: Record<string, string> = {};
  if (searchTerm) activeFilters['Search'] = searchTerm;
  if (statusFilter !== 'ALL') activeFilters['Status'] = statusFilter.replace('_', ' ');
  if (categoryFilter !== 'ALL') activeFilters['Category'] = getCategoryLabel(categoryFilter);
  if (monthFilter !== 'ALL') activeFilters['Month'] = feeMonthLabel(monthFilter);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="print:hidden flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Expenses</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Track and manage school expenses.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {hasPermission('view_budgets') && (
            <Button variant="outline" className="w-full sm:w-auto" render={<Link to="/budgets" />} nativeButton={false}>
                <Wallet className="mr-2 h-4 w-4" /> Budgets
              </Button>
          )}
          {hasPermission('manage_vendors') && (
            <Button variant="outline" className="w-full sm:w-auto" render={<Link to="/vendors" />} nativeButton={false}>
                <Building2 className="mr-2 h-4 w-4" /> Vendors
              </Button>
          )}
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleExportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print / PDF
          </Button>
          {hasPermission('manage_expenses') && (
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto" render={<Link to="/expenses/new" />} nativeButton={false}>
                <Plus className="mr-2 h-4 w-4" /> New Expense
              </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="print:hidden grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalAmount, currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatMoney(paidAmount, currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatMoney(pendingAmount, currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Awaiting Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApproval}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="print:hidden flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-full sm:w-[190px]">
            <CalendarDays className="mr-2 h-4 w-4 text-slate-400" />
            <SelectValue placeholder="Expense month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Months</SelectItem>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PARTIAL">Partially Paid</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {categoryOptions.map(cat => (
              <SelectItem key={cat} value={cat}>{getCategoryLabel(cat)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expenses Table */}
      <Card className="print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Title</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Category</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Vendor</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Date</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Amount</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-500"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">Loading...</td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    {searchTerm || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || monthFilter !== 'ALL'
                      ? 'No expenses found matching your filters.'
                      : 'No expenses yet. Create your first expense to get started.'}
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(expense => (
                  <tr key={expense.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">{expense.title}</div>
                      {expense.vendorInvoiceNo && (
                        <div className="text-xs text-slate-500">{expense.vendorInvoiceNo}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-xs">
                        {getCategoryLabel(expense.category)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {expense.vendor?.name || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {new Date(expense.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">
                      {formatMoney(expenseGrossAmount(expense), expense.currency || currency)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge className={getStatusColor(expense.status)}>
                        {expense.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" render={<Link to={`/expenses/${expense.id}`} />} nativeButton={false}>
                            <Receipt className="h-4 w-4" />
                          </Button>
                        {hasPermission('manage_expenses') && (
                          <>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" render={<Link to={`/expenses/${expense.id}/edit`} />} nativeButton={false}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(expense)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Print-only branded view */}
      <div className="hidden print:block">
        <PrintLayout title="Expenses" filters={activeFilters}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="border border-slate-300 p-3 rounded text-center">
              <p className="text-xs text-slate-500 uppercase font-bold">Total Expenses</p>
              <p className="text-lg font-bold mt-1">{formatMoney(totalAmount, currency)}</p>
            </div>
            <div className="border border-slate-300 p-3 rounded text-center">
              <p className="text-xs text-slate-500 uppercase font-bold">Paid</p>
              <p className="text-lg font-bold mt-1">{formatMoney(paidAmount, currency)}</p>
            </div>
            <div className="border border-slate-300 p-3 rounded text-center">
              <p className="text-xs text-slate-500 uppercase font-bold">Outstanding</p>
              <p className="text-lg font-bold mt-1">{formatMoney(pendingAmount, currency)}</p>
            </div>
            <div className="border border-slate-300 p-3 rounded text-center">
              <p className="text-xs text-slate-500 uppercase font-bold">Awaiting Approval</p>
              <p className="text-lg font-bold mt-1">{pendingApproval}</p>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">Title</th>
                <th className="text-left p-2">Category</th>
                <th className="text-left p-2">Vendor</th>
                <th className="text-left p-2">Date</th>
                <th className="text-right p-2">Amount</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-4 text-slate-500">No expenses to show.</td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="p-2">
                      {expense.title}
                      {expense.vendorInvoiceNo && (
                        <span className="text-slate-500"> ({expense.vendorInvoiceNo})</span>
                      )}
                    </td>
                    <td className="p-2">{getCategoryLabel(expense.category)}</td>
                    <td className="p-2">{expense.vendor?.name || '-'}</td>
                    <td className="p-2">{new Date(expense.expenseDate).toLocaleDateString()}</td>
                    <td className="text-right p-2">{formatMoney(expenseGrossAmount(expense), expense.currency || currency)}</td>
                    <td className="p-2">{expense.status.replace('_', ' ')}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="p-2" colSpan={4}>Total</td>
                <td className="text-right p-2">{formatMoney(totalAmount, currency)}</td>
                <td className="p-2"></td>
              </tr>
            </tfoot>
          </table>
        </PrintLayout>
      </div>
    </div>
  );
}
