import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, TrendingUp, Calendar, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePermissions } from '../../lib/permissions';
import { formatMoney } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';
import { toast } from 'sonner';

export default function CampaignsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currency = systemSettings.currency || 'MYR';

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch('/api/campaigns', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setCampaigns(data || []);
      })
      .catch(() => {
        toast.error('Failed to load campaigns');
      })
      .finally(() => setLoading(false));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800';
      case 'PAUSED': return 'bg-amber-100 text-amber-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'ACTIVE').length,
    totalGoal: campaigns.reduce((sum, c) => sum + c.goalAmount, 0),
    totalRaised: campaigns.reduce((sum, c) => sum + c.raisedAmount, 0),
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Fundraising Campaigns</h1>
          <p className="text-sm text-slate-500">Manage donation campaigns and track progress</p>
        </div>
        {hasPermission('manage_campaigns') && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(stats.totalGoal, currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Raised</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatMoney(stats.totalRaised, currency)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">Loading...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No campaigns found</div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign: any) => (
                <div key={campaign.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{campaign.name}</h3>
                      {campaign.description && (
                        <p className="text-sm text-slate-500 mt-1">{campaign.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getStatusColor(campaign.status)} variant="outline">{campaign.status}</Badge>
                        {campaign.targetAudience && (
                          <Badge variant="outline" className="text-xs">{campaign.targetAudience}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{formatMoney(campaign.raisedAmount, currency)}</div>
                      <div className="text-sm text-slate-500">of {formatMoney(campaign.goalAmount, currency)}</div>
                    </div>
                  </div>
                  <Progress value={Math.min(100, (campaign.raisedAmount / campaign.goalAmount) * 100)} className="h-2 mb-2" />
                  <div className="flex justify-between items-center text-sm text-slate-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {campaign._count?.donations || 0} donations
                      </span>
                    </div>
                    <span>{((campaign.raisedAmount / campaign.goalAmount) * 100).toFixed(1)}% complete</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
