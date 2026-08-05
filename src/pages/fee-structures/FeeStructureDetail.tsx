import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Edit, Trash2, Users, Calendar, DollarSign, Plus, Play, Archive, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { usePermissions } from '../../lib/permissions';
import { formatMoney } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';
import { apiGet, apiSend } from '../../lib/api';
import { toast } from 'sonner';

type StudentOption = { id: string; name: string; code: string };

export default function FeeStructureDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [structure, setStructure] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const currency = systemSettings.currency || 'MYR';
  const canManage = hasPermission('manage_fee_structures');

  const reload = () => {
    return apiGet(`/api/fee-structures/${id}`).then((data) => setStructure(data));
  };

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => toast.error('Failed to load fee structure'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAssignFees = async () => {
    if (!confirm('This will assign fee items to all applicable students. Continue?')) return;
    setAssigning(true);
    try {
      const data = await apiSend<{ message?: string }>(`/api/fee-structures/${id}/assign`, 'POST');
      toast.success(data.message || 'Fees assigned successfully');
      await reload();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign fees');
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this fee structure?')) return;
    try {
      await apiSend(`/api/fee-structures/${id}`, 'DELETE');
      toast.success('Fee structure deleted successfully');
      navigate('/fee-structures');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete fee structure');
    }
  };

  const handleArchive = async () => {
    if (!confirm('Archive this fee structure? It will stop applying to new students, and you can edit or delete it again.')) return;
    setArchiving(true);
    try {
      await apiSend(`/api/fee-structures/${id}`, 'PUT', { status: 'ARCHIVED' });
      toast.success('Fee structure archived');
      await reload();
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive fee structure');
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!structure) {
    return <div className="text-center py-8 text-slate-500">Fee structure not found</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-200';
      case 'DRAFT': return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'ARCHIVED': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      ONE_TIME: 'One Time',
      MONTHLY: 'Monthly',
      TERMLY: 'Per Term',
      YEARLY: 'Yearly',
    };
    return labels[frequency] || frequency;
  };

  const totalAmount = structure.items?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" render={<Link to="/fee-structures" />} nativeButton={false}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{structure.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {structure.description && <p className="text-sm text-slate-500">{structure.description}</p>}
              <Badge className={getStatusColor(structure.status)} variant="outline">
                {structure.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              {structure.status === 'ACTIVE' && (
                <>
                  <Button variant="outline" size="sm" onClick={handleAssignFees} disabled={assigning || !structure.items?.length}>
                    <Play className="h-4 w-4 mr-2" />
                    {assigning ? 'Assigning...' : 'Assign Fees'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleArchive} disabled={archiving}>
                    <Archive className="h-4 w-4 mr-2" />
                    {archiving ? 'Archiving...' : 'Archive'}
                  </Button>
                </>
              )}
              {structure.status !== 'ACTIVE' && (
                <Button variant="outline" size="sm" render={<Link to={`/fee-structures/${id}/edit`} />} nativeButton={false}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
              )}
              {structure.status !== 'ACTIVE' && (
                <Button variant="outline" size="sm" className="text-red-600" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {structure.status === 'ACTIVE' && !structure.items?.length && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          This structure has no fee items yet, so "Assign Fees" won't create anything. Archive it, add at least one item, then reactivate it from the Edit page.
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Academic Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-400" />
              {structure.academicYear}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-slate-400" />
              {formatMoney(totalAmount, structure.currency || currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Fee Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{structure.items?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-400" />
              {structure.assignments?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Fee Items</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="discounts">Discounts</TabsTrigger>
          <TabsTrigger value="plans">Payment Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Fee Items</CardTitle>
                {canManage && structure.status !== 'ACTIVE' && (
                  <AddItemDialog structureId={id!} defaultCurrency={structure.currency || currency} onCreated={reload} />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {structure.items?.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No fee items defined
                  {structure.status === 'ACTIVE' && ' (archive this structure first to add items)'}
                </div>
              ) : (
                <div className="space-y-3">
                  {structure.items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="font-medium text-slate-900 dark:text-white">{item.name}</div>
                          {!item.isActive && (
                            <Badge variant="outline" className="text-xs">Inactive</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{getFrequencyLabel(item.frequency)}</Badge>
                        </div>
                        {item.description && (
                          <div className="text-sm text-slate-500 mt-1">{item.description}</div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          {item.applicableTo !== 'ALL' && (
                            <span>Applies to: {item.applicableTo}</span>
                          )}
                          {item.dueDate && (
                            <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-semibold text-lg">
                            {formatMoney(item.amount, item.currency || currency)}
                          </div>
                        </div>
                        {canManage && structure.status !== 'ACTIVE' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={async () => {
                              if (!confirm(`Remove "${item.name}"?`)) return;
                              try {
                                await apiSend(`/api/fee-items/${item.id}`, 'DELETE');
                                toast.success('Fee item removed');
                                reload();
                              } catch (e: any) {
                                toast.error(e.message || 'Failed to remove item');
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>Student Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {structure.assignments?.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No assignments yet. Add at least one fee item, activate this structure, then click "Assign Fees" above.
                </div>
              ) : (
                <div className="space-y-3">
                  {structure.assignments.map((assignment: any) => (
                    <div key={assignment.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {assignment.student?.preferredName || `${assignment.student?.user?.name || 'Student'}`}
                        </div>
                        <div className="text-sm text-slate-500">
                          {assignment.feeItem?.name} • Due: {new Date(assignment.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatMoney(assignment.outstandingAmount, currency)}
                        </div>
                        <Badge className={
                          assignment.status === 'PAID' ? 'bg-green-100 text-green-800 text-xs mt-1' : 'bg-amber-100 text-amber-800 text-xs mt-1'
                        } variant="outline">
                          {assignment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discounts">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Available Discounts</CardTitle>
                {canManage && (
                  <AddDiscountDialog structureId={id!} onCreated={reload} />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {structure.discounts?.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No discounts configured</div>
              ) : (
                <div className="space-y-3">
                  {structure.discounts.map((discount: any) => (
                    <div key={discount.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-white">{discount.name}</div>
                        {discount.description && (
                          <div className="text-sm text-slate-500 mt-1">{discount.description}</div>
                        )}
                        <div className="text-sm text-slate-500 mt-1">
                          Valid: {new Date(discount.validFrom).toLocaleDateString()} - {discount.validTo ? new Date(discount.validTo).toLocaleDateString() : 'Ongoing'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">
                          {discount.discountType === 'PERCENTAGE' ? `${discount.value}%` : formatMoney(discount.value, currency)}
                        </div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {discount.discountType.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Payment Plans</CardTitle>
                {canManage && (
                  <CreatePlanDialog structureId={id!} defaultCurrency={structure.currency || currency} onCreated={reload} />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {structure.paymentPlans?.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No payment plans configured</div>
              ) : (
                <div className="space-y-3">
                  {structure.paymentPlans.map((plan: any) => (
                    <div key={plan.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 dark:text-white">{plan.name}</div>
                          <div className="text-sm text-slate-500 mt-1">
                            {plan.student?.preferredName || 'Student'} • {plan.numberOfInstallments} installments
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatMoney(plan.totalAmount, plan.currency || currency)}
                          </div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {plan.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AddItemDialog({ structureId, defaultCurrency, onCreated }: { structureId: string; defaultCurrency: string; onCreated: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', amount: '', frequency: 'ONE_TIME', applicableTo: 'ALL', dueDate: '',
  });

  const submit = async () => {
    if (!form.name || !form.amount || Number(form.amount) <= 0) {
      toast.error('Name and a positive amount are required');
      return;
    }
    setSubmitting(true);
    try {
      await apiSend(`/api/fee-structures/${structureId}/items`, 'POST', {
        name: form.name,
        description: form.description || null,
        amount: Number(form.amount),
        currency: defaultCurrency,
        frequency: form.frequency,
        applicableTo: form.applicableTo,
        dueDate: form.dueDate || null,
      });
      toast.success('Fee item added');
      setOpen(false);
      setForm({ name: '', description: '', amount: '', frequency: 'ONE_TIME', applicableTo: 'ALL', dueDate: '' });
      await onCreated();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add fee item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Fee Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Tuition Fee" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount ({defaultCurrency}) *</Label>
              <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONE_TIME">One Time</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="TERMLY">Per Term</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Applies To</Label>
              <Select value={form.applicableTo} onValueChange={(v) => setForm({ ...form, applicableTo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Students</SelectItem>
                  <SelectItem value="BOARDING_STUDENTS">Boarding Students</SelectItem>
                  <SelectItem value="DAY_STUDENTS">Day Students</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddDiscountDialog({ structureId, onCreated }: { structureId: string; onCreated: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', discountType: 'PERCENTAGE', value: '', validFrom: new Date().toISOString().split('T')[0], validTo: '',
  });

  const submit = async () => {
    if (!form.name || !form.value || Number(form.value) <= 0) {
      toast.error('Name and a positive value are required');
      return;
    }
    setSubmitting(true);
    try {
      await apiSend('/api/fee-discounts', 'POST', {
        name: form.name,
        discountType: form.discountType,
        value: Number(form.value),
        applyToAllStructures: false,
        feeStructureIds: [structureId],
        validFrom: form.validFrom,
        validTo: form.validTo || null,
      });
      toast.success('Discount added');
      setOpen(false);
      setForm({ name: '', discountType: 'PERCENTAGE', value: '', validFrom: new Date().toISOString().split('T')[0], validTo: '' });
      await onCreated();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add discount');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Discount
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Discount</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Sibling Discount" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                  <SelectItem value="SIBLING_DISCOUNT">Sibling Discount</SelectItem>
                  <SelectItem value="SCHOLARSHIP">Scholarship</SelectItem>
                  <SelectItem value="EARLY_PAYMENT">Early Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value {form.discountType === 'PERCENTAGE' ? '(%)' : ''} *</Label>
              <Input type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valid From</Label>
              <Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Valid To</Label>
              <Input type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Discount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreatePlanDialog({ structureId, defaultCurrency, onCreated }: { structureId: string; defaultCurrency: string; onCreated: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [form, setForm] = useState({
    name: '', studentId: '', totalAmount: '', numberOfInstallments: '3', firstInstallmentDue: '',
  });

  useEffect(() => {
    if (!open || students.length) return;
    apiGet('/api/students')
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        setStudents(data.map((s: any) => ({
          id: s.id,
          name: `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim() || s.studentCode || s.id,
          code: s.studentCode || '',
        })));
      })
      .catch(() => toast.error('Failed to load students'));
  }, [open, students.length]);

  const submit = async () => {
    if (!form.name || !form.studentId || !form.totalAmount || Number(form.totalAmount) <= 0 || !form.numberOfInstallments || !form.firstInstallmentDue) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await apiSend('/api/payment-plans', 'POST', {
        name: form.name,
        feeStructureId: structureId,
        studentId: form.studentId,
        totalAmount: Number(form.totalAmount),
        currency: defaultCurrency,
        numberOfInstallments: Number(form.numberOfInstallments),
        firstInstallmentDue: form.firstInstallmentDue,
      });
      toast.success('Payment plan created');
      setOpen(false);
      setForm({ name: '', studentId: '', totalAmount: '', numberOfInstallments: '3', firstInstallmentDue: '' });
      await onCreated();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create payment plan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Create Plan
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Payment Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Plan Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., 2026 Installment Plan" />
          </div>
          <div className="space-y-2">
            <Label>Student *</Label>
            <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
              <SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Total Amount ({defaultCurrency}) *</Label>
              <Input type="number" min="0" step="0.01" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label># Installments *</Label>
              <Input type="number" min="2" step="1" value={form.numberOfInstallments} onChange={(e) => setForm({ ...form, numberOfInstallments: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>First Installment Due *</Label>
            <Input type="date" value={form.firstInstallmentDue} onChange={(e) => setForm({ ...form, firstInstallmentDue: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
