import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSettings } from '../../providers/SettingsProvider';
import { toast } from 'sonner';
import { usePermissions } from '../../lib/permissions';

export default function ExpenseEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);

  const currency = systemSettings.currency || 'MYR';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'OPERATIONAL',
    amount: '',
    taxAmount: '0',
    expenseDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    vendorId: '',
    vendorInvoiceNo: '',
    paymentMethod: '',
    budgetId: '',
    academicYear: '',
    term: '',
    notes: '',
  });

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    Promise.all([
      fetch(`/api/expenses/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/vendors', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/budgets', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([expenseData, vendorsData, budgetsData]) => {
      if (expenseData) {
        setFormData({
          title: expenseData.title || '',
          description: expenseData.description || '',
          category: expenseData.category || 'OPERATIONAL',
          amount: expenseData.amount?.toString() || '',
          taxAmount: expenseData.taxAmount?.toString() || '0',
          expenseDate: expenseData.expenseDate ? new Date(expenseData.expenseDate).toISOString().split('T')[0] : '',
          dueDate: expenseData.dueDate ? new Date(expenseData.dueDate).toISOString().split('T')[0] : '',
          vendorId: expenseData.vendorId || '',
          vendorInvoiceNo: expenseData.vendorInvoiceNo || '',
          paymentMethod: expenseData.paymentMethod || '',
          budgetId: expenseData.budgetId || '',
          academicYear: expenseData.academicYear || '',
          term: expenseData.term || '',
          notes: expenseData.notes || '',
        });
      }
      setVendors(vendorsData.filter((v: any) => v.isActive) || []);
      setBudgets(budgetsData.filter((b: any) => b.status === 'ACTIVE') || []);
      setLoading(false);
    });
  }, [id]);

  const totalAmount = (Number(formData.amount) || 0) + (Number(formData.taxAmount) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount),
          taxAmount: Number(formData.taxAmount),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update expense');
      }

      toast.success('Expense updated successfully');
      navigate(`/expenses/${id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    const token = sessionStorage.getItem('auth_token');
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete expense');
      }

      toast.success('Expense deleted successfully');
      navigate('/expenses');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete expense');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  const categoryOptions = [
    { value: 'OPERATIONAL', label: 'Operational' },
    { value: 'ACADEMIC', label: 'Academic' },
    { value: 'STAFF_COSTS', label: 'Staff Costs' },
    { value: 'FOOD_CATERING', label: 'Food & Catering' },
    { value: 'TRANSPORTATION', label: 'Transportation' },
    { value: 'FACILITY', label: 'Facility' },
    { value: 'TECHNOLOGY', label: 'Technology' },
    { value: 'EVENT', label: 'Event' },
    { value: 'ADMINISTRATIVE', label: 'Administrative' },
    { value: 'OTHER', label: 'Other' },
  ];

  const paymentMethodOptions = [
    { value: 'CASH', label: 'Cash' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CHECK', label: 'Check' },
    { value: 'CREDIT_CARD', label: 'Credit Card' },
    { value: 'DEBIT_CARD', label: 'Debit Card' },
    { value: 'ONLINE_PAYMENT', label: 'Online Payment' },
    { value: 'WIRE_TRANSFER', label: 'Wire Transfer' },
    { value: 'OTHER', label: 'Other' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link to="/expenses" />} nativeButton={false}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Edit Expense</h1>
          <p className="text-sm text-slate-500">Update expense details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter expense title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter expense description"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Details */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxAmount">Tax Amount</Label>
                <Input
                  id="taxAmount"
                  type="number"
                  step="0.01"
                  value={formData.taxAmount}
                  onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Amount</Label>
                <div className="h-10 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-md font-semibold text-lg flex items-center">
                  {currency} {totalAmount.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expenseDate">Expense Date *</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendor & Payment */}
        <Card>
          <CardHeader>
            <CardTitle>Vendor & Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Select value={formData.vendorId} onValueChange={(value) => setFormData({ ...formData, vendorId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendorInvoiceNo">Vendor Invoice Number</Label>
                <Input
                  id="vendorInvoiceNo"
                  value={formData.vendorInvoiceNo}
                  onChange={(e) => setFormData({ ...formData, vendorInvoiceNo: e.target.value })}
                  placeholder="Enter invoice number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {paymentMethodOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget</Label>
                <Select value={formData.budgetId} onValueChange={(value) => setFormData({ ...formData, budgetId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {budgets.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name} ({b.fiscalYear})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="academicYear">Academic Year</Label>
                <Input
                  id="academicYear"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  placeholder="e.g., 2024-2025"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or comments"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button type="button" variant="outline" className="text-red-600 hover:text-red-700" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="outline" render={<Link to={`/expenses/${id}`} />} nativeButton={false}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              <Save className="mr-2 h-4 w-4" />
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
