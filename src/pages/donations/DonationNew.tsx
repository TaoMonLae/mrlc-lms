import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { ArrowLeft, Save } from 'lucide-react';
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

interface Donor {
  id: string;
  name: string;
  donorCode: string;
}

interface Campaign {
  id: string;
  name: string;
}

export default function DonationNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedDonorId = searchParams.get('donorId') || '';

  const [loading, setLoading] = useState(false);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [formData, setFormData] = useState({
    donorId: preselectedDonorId,
    amount: '',
    currency: 'MYR',
    donationType: 'ONE_TIME',
    purpose: '',
    designation: '',
    campaignId: '',
    paymentMethod: '',
    paymentReference: '',
    donationDate: new Date().toISOString().split('T')[0],
    isTaxDeductible: true,
    notes: '',
  });

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    Promise.all([
      fetch('/api/donors?isActive=true', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/campaigns?status=ACTIVE', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([donorData, campaignData]) => {
        setDonors(Array.isArray(donorData) ? donorData : []);
        setCampaigns(Array.isArray(campaignData) ? campaignData : []);
      })
      .catch(() => {
        toast.error('Failed to load donors or campaigns');
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.donorId) {
      toast.error('Please select a donor');
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error('Please enter a valid donation amount');
      return;
    }

    setLoading(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch('/api/donations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount),
          campaignId: formData.campaignId || undefined,
          paymentMethod: formData.paymentMethod || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record donation');
      }

      const donation = await response.json();
      toast.success('Donation recorded successfully');
      navigate(`/donors/${formData.donorId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to record donation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link to={formData.donorId ? `/donors/${formData.donorId}` : '/donations'} />}
          nativeButton={false}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Record Donation</h1>
          <p className="text-sm text-slate-500">Log a new donation from a donor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Donation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="donorId">Donor *</Label>
                <Select value={formData.donorId} onValueChange={(value) => setFormData({ ...formData, donorId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select donor" />
                  </SelectTrigger>
                  <SelectContent>
                    {donors.map((donor) => (
                      <SelectItem key={donor.id} value={donor.id}>
                        {donor.name} ({donor.donorCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="donationType">Donation Type</Label>
                <Select value={formData.donationType} onValueChange={(value) => setFormData({ ...formData, donationType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONE_TIME">One-time</SelectItem>
                    <SelectItem value="RECURRING_MONTHLY">Recurring - Monthly</SelectItem>
                    <SelectItem value="RECURRING_QUARTERLY">Recurring - Quarterly</SelectItem>
                    <SelectItem value="RECURRING_YEARLY">Recurring - Yearly</SelectItem>
                    <SelectItem value="IN_KIND">In-kind</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="donationDate">Donation Date *</Label>
                <Input
                  id="donationDate"
                  type="date"
                  value={formData.donationDate}
                  onChange={(e) => setFormData({ ...formData, donationDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaignId">Campaign</Label>
                <Select value={formData.campaignId} onValueChange={(value) => setFormData({ ...formData, campaignId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="No campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No campaign</SelectItem>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHECK">Check</SelectItem>
                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                    <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                    <SelectItem value="ONLINE_PAYMENT">Online Payment</SelectItem>
                    <SelectItem value="WIRE_TRANSFER">Wire Transfer</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentReference">Payment Reference</Label>
                <Input
                  id="paymentReference"
                  value={formData.paymentReference}
                  onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                  placeholder="Transaction / check number"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="isTaxDeductible">Tax Deductible</Label>
                <p className="text-xs text-slate-500">A tax receipt can be issued for this donation</p>
              </div>
              <Switch
                id="isTaxDeductible"
                checked={formData.isTaxDeductible}
                onCheckedChange={(checked) => setFormData({ ...formData, isTaxDeductible: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Input
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="e.g. Scholarship fund"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g. Unrestricted"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or internal comments"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            render={<Link to={formData.donorId ? `/donors/${formData.donorId}` : '/donations'} />}
            nativeButton={false}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Recording...' : 'Record Donation'}
          </Button>
        </div>
      </form>
    </div>
  );
}
