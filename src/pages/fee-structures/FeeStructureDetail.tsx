import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Users, Calendar, DollarSign, Plus, Play, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '../../lib/permissions';
import { formatMoney } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';
import { toast } from 'sonner';

export default function FeeStructureDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [structure, setStructure] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const currency = systemSettings.currency || 'MYR';

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch(`/api/fee-structures/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setStructure(data);
      })
      .catch(() => {
        toast.error('Failed to load fee structure');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAssignFees = async () => {
    if (!confirm('This will assign fee items to all applicable students. Continue?')) return;

    setAssigning(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch(`/api/fee-structures/${id}/assign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign fees');
      }

      const data = await response.json();
      toast.success(data.message || 'Fees assigned successfully');

      // Reload structure data
      const updatedResponse = await fetch(`/api/fee-structures/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updatedData = await updatedResponse.json();
      setStructure(updatedData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign fees');
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this fee structure?')) return;

    const token = sessionStorage.getItem('auth_token');
    try {
      const response = await fetch(`/api/fee-structures/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete fee structure');
      }

      toast.success('Fee structure deleted successfully');
      navigate('/fee-structures');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete fee structure');
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
          {hasPermission('manage_fee_structures') && (
            <>
              {structure.status === 'ACTIVE' && (
                <Button variant="outline" size="sm" onClick={handleAssignFees} disabled={assigning}>
                  <Play className="h-4 w-4 mr-2" />
                  {assigning ? 'Assigning...' : 'Assign Fees'}
                </Button>
              )}
              {structure.status !== 'ACTIVE' && (
                <Button variant="outline" size="sm" render={<Link to={`/fee-structures/${id}/edit`} />} nativeButton={false}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
              )}
              {structure.status === 'DRAFT' && (
                <Button variant="outline" size="sm" className="text-red-600" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      </div>

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
                {hasPermission('manage_fee_structures') && structure.status !== 'ACTIVE' && (
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {structure.items?.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No fee items defined</div>
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
                      <div className="text-right">
                        <div className="font-semibold text-lg">
                          {formatMoney(item.amount, item.currency || currency)}
                        </div>
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
                  No assignments yet. Click "Assign Fees" to assign fees to students.
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
                {hasPermission('manage_fee_structures') && (
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Discount
                  </Button>
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
                {hasPermission('manage_fee_structures') && (
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Plan
                  </Button>
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
