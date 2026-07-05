import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePermissions } from "@/src/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Phone, MapPin, Building2, User, Edit, Calendar, TrendingUp, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Donation {
  id: string;
  donationNumber: string;
  amount: number;
  currency: string;
  donationDate: string;
  status: string;
  donationType: string;
  purpose?: string;
  campaign?: {
    name: string;
  };
}

interface DonorData {
  id: string;
  donorCode: string;
  name: string;
  email?: string;
  phone?: string;
  organization?: string;
  donorType: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;
  preferredContact?: string;
  doNotContact?: boolean;
  notes?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  donations: Donation[];
  statistics: {
    totalDonated: number;
    donationCount: number;
    lastDonationDate: string | null;
    averageDonation: number;
  };
}

export default function DonorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [donor, setDonor] = useState<DonorData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    if (!hasPermission("view_donations") && !hasPermission("manage_donations")) {
      setError("You don't have permission to view donor profiles");
      setLoading(false);
      return;
    }

    fetchDonor();
  }, [id, hasPermission]);

  const fetchDonor = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/donors/${id}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch donor");
      }

      const data = await response.json();
      setDonor(data);
    } catch (err) {
      console.error("Error fetching donor:", err);
      setError("Failed to load donor profile");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/donors/${id}/edit`);
  };

  const handleCreateDonation = () => {
    navigate(`/donations/new?donorId=${id}`);
  };

  const handleDelete = async () => {
    if (!donor) return;
    if (!confirm(`Deactivate donor "${donor.name}"? Their donation history is kept, but they'll be marked inactive.`)) return;

    try {
      const response = await fetch(`/api/donors/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to deactivate donor");
      }

      toast.success("Donor deactivated");
      navigate("/donors");
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate donor");
    }
  };

  const handleReactivate = async () => {
    if (!donor) return;
    try {
      const response = await fetch(`/api/donors/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('auth_token')}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: true }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to reactivate donor");
      }

      setDonor((prev) => (prev ? { ...prev, isActive: true } : prev));
      toast.success("Donor reactivated");
    } catch (err: any) {
      toast.error(err.message || "Failed to reactivate donor");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PROCESSED":
        return "bg-green-100 text-green-800";
      case "RECEIVED":
        return "bg-blue-100 text-blue-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!donor) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center">Donor not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/donors")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Donors
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{donor.name}</h1>
            <p className="text-gray-500">{donor.donorCode}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasPermission("manage_donations") && (
            <>
              <Button onClick={handleCreateDonation} variant="outline">
                <TrendingUp className="w-4 h-4 mr-2" />
                New Donation
              </Button>
              <Button onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Donor
              </Button>
              {donor.isActive ? (
                <Button onClick={handleDelete} variant="outline" className="text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Deactivate
                </Button>
              ) : (
                <Button onClick={handleReactivate} variant="outline" className="text-green-600 hover:text-green-700">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reactivate
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Donated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              RM{donor.statistics.totalDonated.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Donation Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {donor.statistics.donationCount}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Total donations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Donation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              RM{donor.statistics.averageDonation.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Per donation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Donation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold">
              {donor.statistics.lastDonationDate
                ? new Date(donor.statistics.lastDonationDate).toLocaleDateString()
                : "Never"}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Most recent activity
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="donations">Donations ({donor.donations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{donor.email || "Not provided"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{donor.phone || "Not provided"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-medium">
                      {donor.address && donor.city && donor.state
                        ? `${donor.address}, ${donor.city}, ${donor.state}`
                        : donor.address || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Preferred Contact</p>
                    <p className="font-medium">{donor.preferredContact || "Not specified"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <Badge variant="outline" className="mt-1">
                    {donor.donorType}
                  </Badge>
                </div>

                {donor.organization && (
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Organization</p>
                      <p className="font-medium">{donor.organization}</p>
                    </div>
                  </div>
                )}

                {donor.category && (
                  <div>
                    <p className="text-sm text-gray-500">Category</p>
                    <p className="font-medium">{donor.category}</p>
                  </div>
                )}

                {donor.taxId && (
                  <div>
                    <p className="text-sm text-gray-500">Tax ID</p>
                    <p className="font-medium">{donor.taxId}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-sm">
                    Donor since {new Date(donor.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {donor.tags && donor.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {donor.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {donor.notes && (
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="text-sm mt-1">{donor.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="donations" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donation</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donor.donations.map((donation) => (
                    <TableRow key={donation.id}>
                      <TableCell>
                        <div className="font-medium">{donation.donationNumber}</div>
                      </TableCell>
                      <TableCell>
                        {new Date(donation.donationDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">
                          RM{donation.amount.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{donation.donationType}</Badge>
                      </TableCell>
                      <TableCell>
                        {donation.purpose || "-"}
                      </TableCell>
                      <TableCell>
                        {donation.campaign ? donation.campaign.name : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(donation.status)}>
                          {donation.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {donor.donations.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No donations recorded yet</p>
                {hasPermission("manage_donations") && (
                  <Button onClick={handleCreateDonation} className="mt-4">
                    Record First Donation
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
