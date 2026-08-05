import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Edit, CheckCircle2, XCircle, DollarSign, FileText, Calendar, Building2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '../../lib/permissions';
import { formatMoney } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';
import { toast } from 'sonner';

export default function ExpenseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [expense, setExpense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const currency = systemSettings.currency || 'MYR';

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch(`/api/expenses/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setExpense(data);
      })
      .catch(() => {
        toast.error('Failed to load expense');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    setActionLoading(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch(`/api/expenses/${id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to submit expense');

      const updated = await response.json();
      setExpense(updated);
      toast.success('Expense submitted for approval');
    } catch {
      toast.error('Failed to submit expense');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch(`/api/expenses/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error('Failed to approve expense');

      const updated = await response.json();
      setExpense(updated);
      toast.success('Expense approved');
    } catch {
      toast.error('Failed to approve expense');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setActionLoading(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch(`/api/expenses/${id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) throw new Error('Failed to reject expense');

      const updated = await response.json();
      setExpense(updated);
      toast.success('Expense rejected');
    } catch {
      toast.error('Failed to reject expense');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePay = async () => {
    const paymentMethod = prompt('Enter payment method (CASH, BANK_TRANSFER, CHECK, etc.):');
    if (!paymentMethod) return;

    setActionLoading(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch(`/api/expenses/${id}/pay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethod }),
      });

      if (!response.ok) throw new Error('Failed to record payment');

      const data = await response.json();
      setExpense(data.expense);
      toast.success('Payment recorded successfully');
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800 border-green-200';
      case 'APPROVED': return 'bg-blue-100 text-blue-800 border-blue-200';
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

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!expense) {
    return <div className="text-center py-8 text-slate-500">Expense not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" render={<Link to="/expenses" />} nativeButton={false}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{expense.title}</h1>
            <p className="text-sm text-slate-500">Expense Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          {expense.status === 'DRAFT' && hasPermission('manage_expenses') && (
            <>
              <Button variant="outline" size="sm" onClick={handleSubmit} disabled={actionLoading}>
                Submit for Approval
              </Button>
              <Button variant="outline" size="sm" render={<Link to={`/expenses/${id}/edit`} />} nativeButton={false}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
            </>
          )}
          {expense.status === 'PENDING_APPROVAL' && hasPermission('approve_expenses') && (
            <>
              <Button variant="outline" size="sm" onClick={handleApprove} disabled={actionLoading}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button variant="outline" size="sm" onClick={handleReject} disabled={actionLoading}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
          {expense.status === 'APPROVED' && hasPermission('manage_expenses') && (
            <Button size="sm" onClick={handlePay} disabled={actionLoading}>
              <DollarSign className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex justify-center">
        <Badge className={getStatusColor(expense.status)} variant="outline">
          {expense.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expense Details */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-slate-500">Description</p>
                <p className="text-slate-900 dark:text-white">{expense.description || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Wallet className="h-5 w-5 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-slate-500">Category</p>
                <p className="text-slate-900 dark:text-white">{getCategoryLabel(expense.category)}</p>
              </div>
            </div>
            {expense.budget && (
              <div className="flex items-start gap-3">
                <Wallet className="h-5 w-5 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-slate-500">Budget</p>
                  <p className="text-slate-900 dark:text-white">{expense.budget.name}</p>
                </div>
              </div>
            )}
            {expense.academicYear && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-slate-500">Academic Year</p>
                  <p className="text-slate-900 dark:text-white">{expense.academicYear}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Details */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-slate-500">Amount</span>
              <span className="font-semibold">{formatMoney(expense.amount, expense.currency || currency)}</span>
            </div>
            {expense.taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Tax</span>
                <span className="font-semibold">{formatMoney(expense.taxAmount, expense.currency || currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg">
              <span className="font-semibold">Total</span>
              <span className="font-bold">{formatMoney(expense.totalAmount || expense.amount, expense.currency || currency)}</span>
            </div>
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-slate-500">Expense Date</p>
                  <p className="text-slate-900 dark:text-white">{new Date(expense.expenseDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            {expense.dueDate && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-slate-500">Due Date</p>
                  <p className="text-slate-900 dark:text-white">{new Date(expense.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vendor Information */}
        {expense.vendor && (
          <Card>
            <CardHeader>
              <CardTitle>Vendor Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-slate-500">Vendor Name</p>
                  <p className="text-slate-900 dark:text-white">{expense.vendor.name}</p>
                </div>
              </div>
              {expense.vendorInvoiceNo && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-500">Invoice Number</p>
                    <p className="text-slate-900 dark:text-white">{expense.vendorInvoiceNo}</p>
                  </div>
                </div>
              )}
              {expense.vendor.contactPerson && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-500">Contact Person</p>
                    <p className="text-slate-900 dark:text-white">{expense.vendor.contactPerson}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Information */}
        {expense.payments && expense.payments.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expense.payments.map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div>
                      <p className="font-medium">{payment.paymentNumber}</p>
                      <p className="text-sm text-slate-500">
                        {payment.paymentMethod} • {new Date(payment.paymentDate).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="font-semibold">{formatMoney(payment.amount, payment.currency)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Approval Trail */}
      {(expense.submittedAt || expense.approvedAt) && (
        <Card>
          <CardHeader>
            <CardTitle>Approval Trail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expense.submittedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Submitted:</span>
                <span className="text-slate-900 dark:text-white">
                  {expense.submittedByName} • {new Date(expense.submittedAt).toLocaleString()}
                </span>
              </div>
            )}
            {expense.approvedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Approved:</span>
                <span className="text-slate-900 dark:text-white">
                  {expense.approvedByName} • {new Date(expense.approvedAt).toLocaleString()}
                </span>
              </div>
            )}
            {expense.paidDate && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Paid:</span>
                <span className="text-slate-900 dark:text-white">
                  {new Date(expense.paidDate).toLocaleString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {expense.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-900 dark:text-white">{expense.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
