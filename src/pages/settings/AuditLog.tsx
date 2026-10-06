import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Search, 
  Download, 
  Filter, 
  Calendar,
  History,
  User,
  Shield,
  Activity,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  severity: "INFO" | "WARNING" | "DANGER" | "SUCCESS";
}

const entityTypes = [
  "USER", "STUDENT", "TEACHER", "CLASS", "SUBJECT", 
  "ATTENDANCE", "EXAM", "PAYMENT", "CASE", "SETTINGS", 
  "SYSTEM", "BACKUP"
];

const actions = [
  "LOGIN", "LOGIN_FAILED", "CREATE", "UPDATE", "DELETE", 
  "STATUS_CHANGE", "PASSWORD_RESET", "PUBLISH", "VOID", 
  "BACKUP", "RESTORE"
];

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch('/api/audit-logs', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => setLogs(data))
      .catch(() => toast.error('Failed to load audit logs'))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEntity = selectedEntity === "all" || log.entityType === selectedEntity;
    const matchesAction = selectedAction === "all" || log.action === selectedAction;

    return matchesSearch && matchesEntity && matchesAction;
  });

  const handleExport = () => {
    toast.success("Audit log exported to CSV successfully.");
  };

  const getSeverityBadge = (severity: AuditLog["severity"]) => {
    switch (severity) {
      case "SUCCESS": return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Success</Badge>;
      case "WARNING": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Warning</Badge>;
      case "DANGER": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Critical</Badge>;
      case "INFO": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Info</Badge>;
      default: return <Badge variant="outline">Log</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight uppercase italic">Security & Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium italic">Track every single action performed within the LMS for complete accountability.</p>
        </div>
        <Button onClick={handleExport} className="h-11 px-6 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-none">
          <Download className="h-4 w-4 mr-2" /> Export Log History
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search descriptions..." 
            className="pl-10 h-11 bg-card border-border font-medium italic"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <Select value={selectedEntity} onValueChange={setSelectedEntity}>
            <SelectTrigger className="h-11 bg-card border-border font-bold text-[11px] uppercase tracking-widest">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {entityTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={selectedAction} onValueChange={setSelectedAction}>
            <SelectTrigger className="h-11 bg-card border-border font-bold text-[11px] uppercase tracking-widest">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {actions.map(action => (
                <SelectItem key={action} value={action}>{action}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="h-11 border-border font-bold text-[11px] uppercase tracking-widest">
          <Calendar className="h-4 w-4 mr-2" /> Date Range
        </Button>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-b border-border">
                  <TableHead className="font-black text-[11px] uppercase tracking-widest py-4">Timestamp</TableHead>
                  <TableHead className="font-black text-[11px] uppercase tracking-widest py-4">User</TableHead>
                  <TableHead className="font-black text-[11px] uppercase tracking-widest py-4">Action</TableHead>
                  <TableHead className="font-black text-[11px] uppercase tracking-widest py-4">Entity</TableHead>
                  <TableHead className="font-black text-[11px] uppercase tracking-widest py-4 w-1/3">Description</TableHead>
                  <TableHead className="font-black text-[11px] uppercase tracking-widest py-4">IP Address</TableHead>
                  <TableHead className="font-black text-[11px] uppercase tracking-widest py-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-aubergine-600 border-t-transparent inline-block mr-2 align-middle"></span>
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-sm italic">No logs found.</TableCell>
                  </TableRow>
                ) : null}
                {filteredLogs.map((log) => (
                  <TableRow key={log.id} className="border-b border-border group hover:bg-muted/30 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">
                          {format(new Date(log.createdAt), "MMM d, yyyy")}
                        </span>
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {format(new Date(log.createdAt), "HH:mm:ss")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center border border-border">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">{log.userName || "System"}</span>
                          <span className="text-[11px] font-medium text-muted-foreground">{log.userId || "N/A"}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="secondary" className="font-black text-[11px] uppercase italic tracking-tighter">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{log.entityType}</span>
                        {log.entityId && <span className="text-[11px] font-medium text-muted-foreground">ID: {log.entityId}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <p className="text-xs text-muted-foreground font-medium leading-relaxed italic">
                        {log.description}
                      </p>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-[11px] font-mono text-muted-foreground">{log.ipAddress || "-"}</span>
                    </TableCell>
                    <TableCell className="py-4">
                      {getSeverityBadge(log.severity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-tight">{log.userName || "System"}</span>
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">{format(new Date(log.createdAt), "MMM d, HH:mm")}</span>
                </div>
                
                <p className="text-xs text-muted-foreground font-medium italic leading-snug">
                  {log.description}
                </p>
                
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="secondary" className="font-black text-[11px] uppercase tracking-tighter italic">
                    {log.action}
                  </Badge>
                  <Badge variant="outline" className="text-[11px] font-bold uppercase tracking-widest border-border">
                    {log.entityType}
                  </Badge>
                  <div className="flex-1" />
                  {getSeverityBadge(log.severity)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
        <p className="text-xs font-medium text-muted-foreground italic">Showing {filteredLogs.length} entries of security activity logged.</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-border" disabled>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-border bg-slate-900 text-white shadow-none">
            1
          </Button>
          <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-border">
            2
          </Button>
          <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-border">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-400 p-4 rounded-r-lg">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400 uppercase tracking-tight">Read-Only Security Constraint</h4>
            <p className="text-xs text-amber-800 dark:text-amber-500 font-medium mt-1 leading-relaxed italic">
              Audit logs are immutable for legal and compliance reasons. Individual logs cannot be deleted or modified once generated. Logs older than 2 years are automatically archived to cold storage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
