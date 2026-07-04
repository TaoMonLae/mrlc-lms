import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Percent, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '../../lib/permissions';
import { formatMoney } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';
import { toast } from 'sonner';

export default function FeeDiscountsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currency = systemSettings.currency || 'MYR';

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch('/api/fee-discounts', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setDiscounts(data || []);
      })
      .catch(() => {
        toast.error('Failed to load discounts');
      })
      .finally(() => setLoading(false));
  }, []);

  const getDiscountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PERCENTAGE: 'Percentage',
      FIXED_AMOUNT: 'Fixed Amount',
      SIBLING_DISCOUNT: 'Sibling Discount',
      SCHOLARSHIP: 'Scholarship',
      EARLY_PAYMENT: 'Early Payment',
    };
    return labels[type] || type;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Fee Discounts</h1>
          <p className="text-sm text-slate-500">Manage fee discounts and scholarships</p>
        </div>
        {hasPermission('manage_fee_structures') && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Discount
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">Loading...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {discounts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No discounts configured</div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Validity</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {discounts.map(discount => (
                    <tr key={discount.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 dark:text-white">{discount.name}</div>
                        {discount.description && (
                          <div className="text-sm text-slate-500">{discount.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{getDiscountTypeLabel(discount.discountType)}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        {discount.discountType === 'PERCENTAGE' ? (
                          <span>{discount.value}%</span>
                        ) : (
                          <span>{formatMoney(discount.value, currency)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(discount.validFrom).toLocaleDateString()} - {discount.validTo ? new Date(discount.validTo).toLocaleDateString() : 'Ongoing'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
