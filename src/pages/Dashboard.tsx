import { useEffect, useState } from "react";
import { FileChartColumn, UserPlus } from "lucide-react";
import { Link, Navigate } from "react-router";
import { toast } from "sonner";
import SchoolOperationsDashboard, {
  type SchoolDashboardAnnouncement,
  type SchoolDashboardCase,
  type SchoolDashboardScheduleItem,
  type SchoolDashboardStats,
} from "@/components/blocks/dashboard-11";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/src/lib/permissions";

interface DashboardData {
  stats: SchoolDashboardStats;
  announcements: SchoolDashboardAnnouncement[];
  schedule: SchoolDashboardScheduleItem[];
  recentCases: SchoolDashboardCase[];
}

export default function DashboardPage() {
  const { isStudent, hasPermission, isAdmin } = usePermissions();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isStudent) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const token = sessionStorage.getItem("auth_token");
        const response = await fetch("/api/dashboard", { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error("Failed to load dashboard");
        setData(await response.json());
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isStudent]);

  if (isStudent) return <Navigate to="/student/dashboard" replace />;

  const actions = (
    <>
      {hasPermission("view_reports") && (
        <Button variant="outline" render={<Link to="/reports" />} nativeButton={false}>
          <FileChartColumn className="size-4" aria-hidden="true" /> Reports
        </Button>
      )}
      {isAdmin && (
        <Button render={<Link to="/students/new" />} nativeButton={false}>
          <UserPlus className="size-4" aria-hidden="true" /> New registration
        </Button>
      )}
    </>
  );

  return (
    <SchoolOperationsDashboard
      actions={actions}
      announcements={data?.announcements ?? []}
      loading={loading}
      recentCases={data?.recentCases ?? []}
      schedule={data?.schedule ?? []}
      stats={data?.stats}
    />
  );
}
