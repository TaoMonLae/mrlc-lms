import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Edit, Trash2, Building2, Mail, Phone, MapPin, DollarSign, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '../../lib/permissions';
import { formatMoney } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';
import { toast } from 'sonner';

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const currency = systemSettings.currency || 'MYR';

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch(`/api/vendors/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setVendor(data);
      })
      .catch(() => {
        toast.error('Failed to load vendor');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;

    const token = sessionStorage.getItem('auth_token');
    try {
      const response = await fetch(`/api/vendors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete vendor');
      }

      toast.success('Vendor deleted successfully');
      navigate('/vendors');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete vendor');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!vendor) {
    return <div className="text-center py-8 text-slate-500">Vendor not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" render={<Link to="/vendors" />} nativeButton={false}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{vendor.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {vendor.code && <p className="text-sm text-slate-500">{vendor.code}</p>}
              <Badge variant={vendor.isActive ? 'default' : 'secondary'}>
                {vendor.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {hasPermission('manage_vendors') && (
            <>
              <Button variant="outline" size="sm" render={<Link to={`/vendors/${id}/edit`} />} nativeButton={false}>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Vendor Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {vendor.description && (
              <p className="text-slate-600 dark:text-slate-300">{vendor.description}</p>
            )}
            <div className="space-y-3">
              {vendor.contactPerson && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Contact Person</p>
                    <p className="text-slate-900 dark:text-white">{vendor.contactPerson}</p>
                  </div>
                </div>
              )}
              {vendor.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:underline">{vendor.email}</a>
                  </div>
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Phone</p>
                    <p className="text-slate-900 dark:text-white">{vendor.phone}</p>
                  </div>
                </div>
              )}
              {vendor.website && (
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Website</p>
                    <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {vendor.website}
                    </a>
                  </div>
                </div>
              )}
              {vendor.category && (
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Category</p>
                    <Badge variant="outline">{vendor.category}</Badge>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        {(vendor.address || vendor.city || vendor.state) && (
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                <div className="text-slate-900 dark:text-white">
                  {vendor.address && <p>{vendor.address}</p>}
                  {vendor.city && <p>{vendor.city}</p>}
                  {vendor.state && <p>{vendor.state}</p>}
                  {vendor.postalCode && <p>{vendor.postalCode}</p>}
                  {vendor.country && <p>{vendor.country}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Information */}
        {(vendor.taxId || vendor.paymentTerms || vendor.bankName) && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vendor.taxId && (
                <div>
                  <p className="text-sm text-slate-500">Tax ID / GST Registration</p>
                  <p className="text-slate-900 dark:text-white">{vendor.taxId}</p>
                </div>
              )}
              {vendor.paymentTerms && (
                <div>
                  <p className="text-sm text-slate-500">Payment Terms</p>
                  <p className="text-slate-900 dark:text-white">{vendor.paymentTerms}</p>
                </div>
              )}
              {vendor.bankName && (
                <div>
                  <p className="text-sm text-slate-500">Bank Name</p>
                  <p className="text-slate-900 dark:text-white">{vendor.bankName}</p>
                </div>
              )}
              {vendor.bankAccount && (
                <div>
                  <p className="text-sm text-slate-500">Bank Account</p>
                  <p className="text-slate-900 dark:text-white font-mono">{vendor.bankAccount}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Performance Metrics */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Purchase History</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-slate-500">Total Purchases</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatMoney(vendor.totalPurchases || 0, currency)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500">Total Transactions</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {vendor.purchaseCount || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500">Last Purchase</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {vendor.lastPurchaseDate
                  ? new Date(vendor.lastPurchaseDate).toLocaleDateString()
                  : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses */}
      {vendor.expenses && vendor.expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vendor.expenses.map((expense: any) => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{expense.title}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(expense.expenseDate).toLocaleDateString()} • {expense.category}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {formatMoney(expense.amount, expense.currency || currency)}
                  </p>
                </div>
              ))}
            </div>
            {vendor.expenses.length === 10 && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm" render={<Link to={`/expenses?vendorId=${id}`} />} nativeButton={false}>View All Expenses</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {vendor.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-900 dark:text-white">{vendor.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
