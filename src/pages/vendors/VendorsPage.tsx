import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Building2, Mail, Phone, MapPin, Edit, Trash2, DollarSign } from 'lucide-react';
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
import { toast } from 'sonner';

export default function VendorsPage() {
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);

  const currency = systemSettings.currency || 'MYR';

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch('/api/vendors', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setVendors(data || []);
      })
      .catch(() => {
        setVendors([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (v.code && v.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (v.email && v.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'ALL' || v.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (id: string) => {
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

      setVendors(vendors.filter(v => v.id !== id));
      toast.success('Vendor deleted successfully');
      setDeleteDialog(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete vendor');
    }
  };

  const categoryOptions = Array.from(new Set(vendors.map((v) => v.category).filter(Boolean)));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Vendors</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Manage suppliers and service providers.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {hasPermission('manage_expenses') && (
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto" render={<Link to="/vendors/new" />} nativeButton={false}>
                <Plus className="mr-2 h-4 w-4" /> Add Vendor
              </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Active Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {vendors.filter(v => v.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMoney(vendors.reduce((sum, v) => sum + (v.totalPurchases || 0), 0), currency)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {categoryOptions.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vendors Grid */}
      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading...</div>
      ) : filteredVendors.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          {searchTerm || categoryFilter !== 'ALL'
            ? 'No vendors found matching your filters.'
            : 'No vendors yet. Add your first vendor to get started.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.map(vendor => (
            <Card key={vendor.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{vendor.name}</CardTitle>
                    {vendor.code && (
                      <p className="text-xs text-slate-500 mt-1">{vendor.code}</p>
                    )}
                  </div>
                  <Badge variant={vendor.isActive ? 'default' : 'secondary'}>
                    {vendor.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {vendor.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                    {vendor.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  {vendor.contactPerson && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Building2 className="h-4 w-4 text-slate-400" />
                  <span>{vendor.contactPerson}</span>
                </div>
              )}
              {vendor.email && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="truncate">{vendor.email}</span>
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{vendor.phone}</span>
                </div>
              )}
              {vendor.city && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{vendor.city}{vendor.state && `, ${vendor.state}`}</span>
                </div>
              )}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Total Purchases</span>
                    <span className="font-semibold">
                      {formatMoney(vendor.totalPurchases || 0, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Expense Count</span>
                    <span className="font-semibold">{vendor.purchaseCount || 0}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <Button variant="outline" size="sm" className="flex-1" render={<Link to={`/vendors/${vendor.id}`} />} nativeButton={false}>
                      <DollarSign className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  {hasPermission('manage_vendors') && (
                    <>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" render={<Link to={`/vendors/${vendor.id}/edit`} />} nativeButton={false}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteDialog(vendor.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
