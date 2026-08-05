import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Edit, Trash2, Wallet, Calendar, TrendingUp, PieChart, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { usePermissions } from '../../lib/permissions';
import { formatMoney } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';
import { toast } from 'sonner';

export default function BudgetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const currency = systemSettings.currency || 'MYR';

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch(`/api/budgets/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setBudget(data);
      })
      .catch(() => {
        toast.error('Failed to load budget');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this budget?')) return;

    const token = sessionStorage.getItem('auth_token');
    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete budget');
      }

      toast.success('Budget deleted successfully');
      navigate('/budgets');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete budget');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!budget) {
    return <div className="text-center py-8 text-slate-500">Budget not found</div>;
  }

  const percentUsed = budget.allocatedAmount > 0
    ? (budget.spentAmount / budget.allocatedAmount) * 100
    : 0;
  const isOverBudget = percentUsed > 100;
  const isNearLimit = percentUsed >= 80 && percentUsed <= 100;
  const remainingPercent = Math.max(0, 100 - percentUsed);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-200';
      case 'EXHAUSTED': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'EXCEEDED': return 'bg-red-100 text-red-800 border-red-200';
      case 'ARCHIVED': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" render={<Link to="/budgets" />} nativeButton={false}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{budget.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {budget.code && <p className="text-sm text-slate-500">{budget.code}</p>}
              <Badge className={getStatusColor(budget.status)} variant="outline">
                {budget.status}
              </Badge>
              {budget.category && (
                <Badge variant="outline">{getCategoryLabel(budget.category)}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {hasPermission('manage_budgets') && (
            <>
              <Button variant="outline" size="sm" render={<Link to={`/budgets/${id}/edit`} />} nativeButton={false}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Budget Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Allocated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(budget.allocatedAmount, budget.currency || currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : percentUsed >= 80 ? 'text-amber-600' : ''}`}>
              {formatMoney(budget.spentAmount, budget.currency || currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatMoney(budget.remainingAmount, budget.currency || currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : percentUsed >= 80 ? 'text-amber-600' : ''}`}>
              {percentUsed.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Budget Utilization
            {isOverBudget && <AlertTriangle className="h-5 w-5 text-red-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600 dark:text-slate-300">Used</span>
              <span className="font-medium">{percentUsed.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(100, percentUsed)} className="h-3" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600 dark:text-slate-300">Remaining</span>
              <span className="font-medium">{remainingPercent.toFixed(1)}%</span>
            </div>
            <Progress value={remainingPercent} className="h-3 bg-green-500" />
          </div>
          {isNearLimit && !isOverBudget && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800 dark:text-amber-200">
                Budget is approaching limit ({budget.alertThreshold * 100}%)
              </span>
            </div>
          )}
          {isOverBudget && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800 dark:text-red-200">
                Budget exceeded by {(percentUsed - 100).toFixed(1)}%
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Budget Period */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Fiscal Year</p>
                <p className="text-slate-900 dark:text-white font-medium">{budget.fiscalYear}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Period</p>
                <p className="text-slate-900 dark:text-white">
                  {new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-300">Alert Threshold</span>
              <span className="font-medium">{(budget.alertThreshold * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-300">Strict Limit</span>
              <span className="font-medium">{budget.strictLimit ? 'Yes' : 'No'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Associated Expenses */}
      {budget.expenses && budget.expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Associated Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {budget.expenses.slice(0, 10).map((expense: any) => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">{expense.title}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(expense.expenseDate).toLocaleDateString()} • {expense.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {formatMoney(expense.amount, expense.currency || currency)}
                    </p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {expense.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {budget.expenses.length > 10 && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm" render={<Link to={`/expenses?budgetId=${id}`} />} nativeButton={false}>View All Expenses</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {budget.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-900 dark:text-white">{budget.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
