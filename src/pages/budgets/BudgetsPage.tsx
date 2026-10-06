import { useApiList } from '../../hooks/useApiList';
import { LoadError } from '../../components/ui/load-error';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Plus, Search, TrendingUp, Wallet, AlertTriangle, PieChart } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import { usePermissions } from '../../lib/permissions';
import { formatMoney } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';

export default function BudgetsPage() {
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { data: budgets, setData: setBudgets, loading, error, reload } = useApiList<any>('/api/budgets');

  const currency = systemSettings.currency || 'MYR';



  const filteredBudgets = budgets.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (b.code && b.code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesYear = yearFilter === 'ALL' || b.fiscalYear.toString() === yearFilter;
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesYear && matchesStatus;
  });

  const totalAllocated = filteredBudgets.filter(b => b.currency === currency).reduce((sum, b) => sum + (b.allocatedAmount || 0), 0);
  const totalSpent = filteredBudgets.filter(b => b.currency === currency).reduce((sum, b) => sum + (b.spentAmount || 0), 0);
  const totalRemaining = filteredBudgets.filter(b => b.currency === currency).reduce((sum, b) => sum + (b.remainingAmount || 0), 0);
  const years = Array.from(new Set(budgets.map((b) => b.fiscalYear))).sort((a, b) => b - a);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-200';
      case 'EXHAUSTED': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'EXCEEDED': return 'bg-red-100 text-red-800 border-red-200';
      case 'ARCHIVED': return 'bg-muted text-foreground border-border';
      default: return 'bg-muted text-foreground border-border';
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

  const getBudgetStatus = (budget: any) => {
    if (budget.status === 'ARCHIVED') return { label: 'Archived', color: 'bg-muted' };
    if (budget.spentAmount >= budget.allocatedAmount) return { label: 'Exhausted', color: 'bg-amber-200' };
    if (budget.spentAmount > budget.allocatedAmount) return { label: 'Exceeded', color: 'bg-red-200' };
    const percentUsed = (budget.spentAmount / budget.allocatedAmount) * 100;
    if (percentUsed >= 80) return { label: 'Near Limit', color: 'bg-amber-100' };
    return { label: 'On Track', color: 'bg-green-100' };
  };

  if (error) return <LoadError title="Budgets" message={error} onRetry={reload} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Budgets</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage budget allocations.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {hasPermission('manage_budgets') && (
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto" render={<Link to="/budgets/new" />} nativeButton={false}>
                <Plus className="mr-2 h-4 w-4" /> Create Budget
              </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Allocated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalAllocated, currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatMoney(totalSpent, currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatMoney(totalRemaining, currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search budgets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-full sm:w-[120px]">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Years</SelectItem>
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="EXHAUSTED">Exhausted</SelectItem>
            <SelectItem value="EXCEEDED">Exceeded</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Budgets Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Budget Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Code</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Fiscal Year</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Allocated</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Spent</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Remaining</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</td>
                </tr>
              ) : filteredBudgets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchTerm || yearFilter !== 'ALL' || statusFilter !== 'ALL'
                      ? 'No budgets found matching your filters.'
                      : 'No budgets yet. Create your first budget to get started.'}
                  </td>
                </tr>
              ) : (
                filteredBudgets.map(budget => {
                  const percentUsed = budget.allocatedAmount > 0
                    ? (budget.spentAmount / budget.allocatedAmount) * 100
                    : 0;
                  const statusInfo = getBudgetStatus(budget);

                  return (
                    <tr key={budget.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{budget.name}</div>
                        {budget.category && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {getCategoryLabel(budget.category)}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {budget.code || '—'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {budget.fiscalYear}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-foreground">
                        {formatMoney(budget.allocatedAmount, budget.currency || currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-foreground">
                        {formatMoney(budget.spentAmount, budget.currency || currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-foreground">
                        {formatMoney(budget.remainingAmount, budget.currency || currency)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={getStatusColor(budget.status)}>
                          {budget.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button aria-label={`View budget ${budget.name ?? ""}`.trim()} variant="ghost" size="sm" className="h-8 w-8 p-0" render={<Link to={`/budgets/${budget.id}`} />} nativeButton={false}>
                            <PieChart className="h-4 w-4" />
                          </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
