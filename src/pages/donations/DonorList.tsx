import { useEffect, useState } from "react";
import { usePermissions } from "@/src/lib/permissions";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Mail, Phone, Building2, User, TrendingUp, Pencil, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Donor {
  id: string;
  donorCode: string;
  name: string;
  email?: string;
  phone?: string;
  organization?: string;
  donorType: string;
  category?: string;
  city?: string;
  state?: string;
  isActive: boolean;
  _count: {
    donations: number;
  };
  createdAt: string;
}

export default function DonorList() {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [filteredDonors, setFilteredDonors] = useState<Donor[]>([]);
  const [search, setSearch] = useState("");
  const [donorTypeFilter, setDonorTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPermission("view_donations") && !hasPermission("manage_donations")) {
      setError("You don't have permission to view donors");
      setLoading(false);
      return;
    }

    fetchDonors();
  }, [hasPermission]);

  useEffect(() => {
    filterDonors();
  }, [donors, search, donorTypeFilter, statusFilter]);

  const fetchDonors = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/donors", {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch donors");
      }

      const data = await response.json();
      setDonors(data);
      setFilteredDonors(data);
    } catch (err) {
      console.error("Error fetching donors:", err);
      setError("Failed to load donors");
    } finally {
      setLoading(false);
    }
  };

  const filterDonors = () => {
    let filtered = donors;

    if (search) {
      filtered = filtered.filter(donor =>
        donor.name.toLowerCase().includes(search.toLowerCase()) ||
        donor.donorCode.toLowerCase().includes(search.toLowerCase()) ||
        donor.email?.toLowerCase().includes(search.toLowerCase()) ||
        donor.organization?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (donorTypeFilter !== "all") {
      filtered = filtered.filter(donor => donor.donorType === donorTypeFilter);
    }

    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter(donor => donor.isActive);
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter(donor => !donor.isActive);
      }
    }

    setFilteredDonors(filtered);
  };

  const handleCreateDonor = () => {
    navigate("/donors/new");
  };

  const handleViewDonor = (id: string) => {
    navigate(`/donors/${id}`);
  };

  const handleDeleteDonor = async (donor: Donor) => {
    if (!confirm(`Deactivate donor "${donor.name}"? Their donation history is kept, but they'll be marked inactive.`)) return;

    try {
      const response = await fetch(`/api/donors/${donor.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to deactivate donor");
      }

      setDonors((prev) => prev.map((d) => (d.id === donor.id ? { ...d, isActive: false } : d)));
      toast.success("Donor deactivated");
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate donor");
    }
  };

  const handleReactivateDonor = async (donor: Donor) => {
    try {
      const response = await fetch(`/api/donors/${donor.id}`, {
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

      setDonors((prev) => prev.map((d) => (d.id === donor.id ? { ...d, isActive: true } : d)));
      toast.success("Donor reactivated");
    } catch (err: any) {
      toast.error(err.message || "Failed to reactivate donor");
    }
  };

  const getDonorTypeIcon = (type: string) => {
    switch (type) {
      case "ORGANIZATION":
        return <Building2 className="w-4 h-4" />;
      case "ALUMNUS":
        return <User className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
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

  const activeDonors = donors.filter(d => d.isActive).length;
  const totalDonations = donors.reduce((sum, d) => sum + d._count.donations, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Donors</h1>
          <p className="text-gray-500">Manage donor database and relationships</p>
        </div>
        {hasPermission("manage_donations") && (
          <Button onClick={handleCreateDonor}>
            <Plus className="w-4 h-4 mr-2" />
            Add Donor
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Donors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{donors.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {activeDonors} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDonations}</div>
            <p className="text-xs text-gray-500 mt-1">
              Across all donors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {donors.filter(d => d.donorType === "ORGANIZATION").length}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Corporate donors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Individuals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {donors.filter(d => d.donorType === "INDIVIDUAL").length}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Personal donors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search donors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={donorTypeFilter} onValueChange={setDonorTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Donor Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="ORGANIZATION">Organization</SelectItem>
                <SelectItem value="ALUMNUS">Alumnus</SelectItem>
                <SelectItem value="PARENT">Parent</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center text-sm text-gray-500">
              {filteredDonors.length} of {donors.length} donors
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Donors Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Donations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDonors.map((donor) => (
                <TableRow key={donor.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getDonorTypeIcon(donor.donorType)}
                      <div>
                        <div className="font-semibold">{donor.name}</div>
                        <div className="text-xs text-gray-500">{donor.donorCode}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{donor.donorType}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {donor.email && (
                        <div className="flex items-center text-xs">
                          <Mail className="w-3 h-3 mr-1" />
                          {donor.email}
                        </div>
                      )}
                      {donor.phone && (
                        <div className="flex items-center text-xs">
                          <Phone className="w-3 h-3 mr-1" />
                          {donor.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {donor.city && donor.state ? `${donor.city}, ${donor.state}` : "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      <span className="font-semibold">{donor._count.donations}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={donor.isActive ? "default" : "secondary"}>
                      {donor.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDonor(donor.id)}
                      >
                        View
                      </Button>
                      {hasPermission("manage_donations") && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => navigate(`/donors/${donor.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {donor.isActive ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteDonor(donor)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                              onClick={() => handleReactivateDonor(donor)}
                              title="Reactivate donor"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredDonors.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No donors found matching your criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
