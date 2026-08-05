import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Plus, Heart, Users, DollarSign, TrendingUp, Calendar, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePermissions } from '../../lib/permissions';
import { formatMoney } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';
import { toast } from 'sonner';

export default function DonationsDashboard() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [donations, setDonations] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currency = systemSettings.currency || 'MYR';

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    Promise.all([
      fetch('/api/donations', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/campaigns', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([donationsData, campaignsData]) => {
        setDonations(donationsData || []);
        setCampaigns(campaignsData || []);
      })
      .catch(() => {
        toast.error('Failed to load donation data');
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    totalDonations: donations.length,
    totalAmount: donations.reduce((sum, d) => sum + (d.status !== 'CANCELLED' && d.status !== 'REFUNDED' ? d.amount : 0), 0),
    processedAmount: donations.filter(d => d.status === 'PROCESSED').reduce((sum, d) => sum + d.amount, 0),
    activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSED': return 'bg-green-100 text-green-800';
      case 'RECEIVED': return 'bg-blue-100 text-blue-800';
      case 'PENDING': return 'bg-amber-100 text-amber-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'REFUNDED': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const handleDelete = async (donation: any) => {
    if (!confirm(`Delete donation from "${donation.donor?.name || 'this donor'}" (${formatMoney(donation.amount, currency)})? This cannot be undone.`)) return;

    const token = sessionStorage.getItem('auth_token');
    try {
      const response = await fetch(`/api/donations/${donation.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete donation');
      }

      setDonations((prev) => prev.filter((d) => d.id !== donation.id));
      toast.success('Donation deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete donation');
    }
  };

  const getCampaignStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800';
      case 'PAUSED': return 'bg-amber-100 text-amber-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Donations</h1>
          <p className="text-sm text-slate-500">Track donations and fundraising campaigns</p>
        </div>
        <div className="flex gap-2">
          {hasPermission('manage_campaigns') && (
            <Button variant="outline" render={<Link to="/donations/campaigns" />} nativeButton={false}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Campaigns
              </Button>
          )}
          {hasPermission('manage_donations') && (
            <Button render={<Link to="/donations/new" />} nativeButton={false}>
                <Plus className="h-4 w-4 mr-2" />
                New Donation
              </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Total Donations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDonations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(stats.totalAmount, currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatMoney(stats.processedAmount, currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Donations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Donations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">Loading...</div>
          ) : donations.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No donations recorded</div>
          ) : (
            <div className="space-y-3">
              {donations.slice(0, 10).map((donation: any) => (
                <div key={donation.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {donation.donor?.name || 'Unknown Donor'}
                      </div>
                      <Badge className={`${getStatusColor(donation.status)} text-xs`} variant="outline">
                        {donation.status}
                      </Badge>
                      {donation.donationType !== 'ONE_TIME' && (
                        <Badge variant="outline" className="text-xs">{donation.donationType.replace('_', ' ')}</Badge>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      {donation.purpose || 'General donation'} • {new Date(donation.donationDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg">{formatMoney(donation.amount, currency)}</div>
                    {donation.isTaxDeductible && (
                      <div className="text-xs text-green-600">Tax Deductible</div>
                    )}
                  </div>
                  {hasPermission('manage_donations') && (
                    <div className="flex items-center gap-1 ml-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => navigate(`/donations/${donation.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(donation)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Campaigns */}
      {campaigns.filter(c => c.status === 'ACTIVE').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {campaigns.filter(c => c.status === 'ACTIVE').map((campaign: any) => (
                <div key={campaign.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">{campaign.name}</div>
                      <div className="text-sm text-slate-500">{campaign.description}</div>
                    </div>
                    <Badge className={getCampaignStatusColor(campaign.status)} variant="outline">{campaign.status}</Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">Goal</span>
                      <span className="font-medium">{formatMoney(campaign.goalAmount, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">Raised</span>
                      <span className="font-medium text-green-600">{formatMoney(campaign.raisedAmount, currency)}</span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${Math.min(100, (campaign.raisedAmount / campaign.goalAmount) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {((campaign.raisedAmount / campaign.goalAmount) * 100).toFixed(1)}% • {campaign._count?.donations || 0} donations
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
