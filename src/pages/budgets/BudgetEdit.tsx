import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function BudgetEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    fiscalYear: new Date().getFullYear(),
    startDate: '',
    endDate: '',
    allocatedAmount: '',
    currency: 'MYR',
    category: '',
    status: 'ACTIVE',
    alertThreshold: '0.8',
    strictLimit: false,
    notes: '',
    tags: '',
  });

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch(`/api/budgets/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data) {
          setFormData({
            name: data.name || '',
            code: data.code || '',
            description: data.description || '',
            fiscalYear: data.fiscalYear || new Date().getFullYear(),
            startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '',
            endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
            allocatedAmount: data.allocatedAmount?.toString() || '',
            currency: data.currency || 'MYR',
            category: data.category || '',
            status: data.status === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE',
            alertThreshold: data.alertThreshold?.toString() || '0.8',
            strictLimit: data.strictLimit || false,
            notes: data.notes || '',
            tags: data.tags ? data.tags.join(', ') : '',
          });
        }
        setLoading(false);
      });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.allocatedAmount) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (Number(formData.allocatedAmount) <= 0) { toast.error('Allocated amount must be greater than zero'); return; }
    if (formData.endDate < formData.startDate) { toast.error('End date must be on or after start date'); return; }

    setSubmitting(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch(`/api/budgets/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          allocatedAmount: Number(formData.allocatedAmount),
          fiscalYear: Number(formData.fiscalYear),
          alertThreshold: Number(formData.alertThreshold),
          tags: formData.tags ? formData.tags.split(',').map((t: string) => t.trim()) : [],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update budget');
      }

      toast.success('Budget updated successfully');
      navigate(`/budgets/${id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update budget');
    } finally {
      setSubmitting(false);
    }
  };

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

  const yearOptions = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() + 2];
  const statusOptions = ['ACTIVE', 'ARCHIVED'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link to="/budgets" />} nativeButton={false}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Edit Budget</h1>
          <p className="text-sm text-slate-500">Update budget allocation</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">Loading...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Budget Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Operating Expenses 2024"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fiscalYear">Fiscal Year *</Label>
                  <Select value={formData.fiscalYear.toString()} onValueChange={(value) => setFormData({ ...formData, fiscalYear: Number(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">Exhausted and exceeded states are calculated from approved expense totals.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Budget Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Budget code (optional)"
                  />
                </div>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Budget description and purpose"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Budget Period */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Period</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    min={formData.startDate || undefined}
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Allocation */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Allocation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="allocatedAmount">Allocated Amount *</Label>
                  <Input
                    id="allocatedAmount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.allocatedAmount}
                    onChange={(e) => setFormData({ ...formData, allocatedAmount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MYR">MYR - Malaysian Ringgit</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                      <SelectItem value="THB">THB - Thai Baht</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {categoryOptions.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
                  <Input
                    id="alertThreshold"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.alertThreshold}
                    onChange={(e) => setFormData({ ...formData, alertThreshold: e.target.value })}
                    placeholder="0.8"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="strictLimit"
                  checked={formData.strictLimit}
                  onCheckedChange={(checked) => setFormData({ ...formData, strictLimit: checked })}
                />
                <Label htmlFor="strictLimit" className="cursor-pointer">
                  Strict Limit - Block expenses when exceeded
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Comma-separated tags"
                />
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
              <Button type="button" variant="outline" render={<Link to={`/budgets/${id}`} />} nativeButton={false}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                <Save className="mr-2 h-4 w-4" />
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
