import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  Users,
  BookOpen,
  Calendar,
  FileCheck,
  Wallet,
  AlertCircle,
  Database,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const exportModules = [
  { id: "students", title: "Students", icon: Users, description: "All student profiles and enrollment data", sensitive: false },
  { id: "teachers", title: "Teachers", icon: Users, description: "Teacher profiles and assignments", sensitive: false },
  { id: "classes", title: "Classes", icon: BookOpen, description: "Class lists and structure", sensitive: false },
  { id: "attendance", title: "Attendance", icon: Calendar, description: "Daily attendance logs", sensitive: false },
  { id: "exams", title: "Exam Results", icon: FileCheck, description: "Academic assessment and exam results", sensitive: false },
  { id: "fees", title: "Fee Payments", icon: Wallet, description: "Payment history and fee status", sensitive: false },
  { id: "library", title: "Library Resources", icon: BookOpen, description: "Inventory of library materials", sensitive: false },
  { id: "cases", title: "Case Summaries", icon: AlertCircle, description: "Student safeguarding/discipline cases (Restricted)", sensitive: true },
];

export default function ExportDataPage() {
  const [format, setFormat] = useState("csv");
  const [pendingModuleId, setPendingModuleId] = useState<string | null>(null);

  const requestExport = (moduleId: string) => {
    const module = exportModules.find((m) => m.id === moduleId);
    if (module?.sensitive) {
      // Show a confirmation dialog instead of window.confirm()
      setPendingModuleId(moduleId);
    } else {
      runExport(moduleId);
    }
  };

  const runExport = async (moduleId: string) => {
    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("You must be logged in to export data.");
      return;
    }
    try {
      const res = await fetch(`/api/export/${moduleId}?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error("You do not have permission to export data.");
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to export data");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const stamp = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${moduleId}-${stamp}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported ${moduleId} as ${format.toUpperCase()}.`, {
        description: "This action has been logged in the Audit Log.",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to export data. Please try again.");
    }
  };

  const confirmSensitiveExport = () => {
    if (pendingModuleId) {
      runExport(pendingModuleId);
    }
    setPendingModuleId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight dark:text-white uppercase italic">Data Export Center</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium italic">Instantly download system data in CSV or JSON format for reporting and backup.</p>
      </div>

      <Card className="border-slate-200 dark:border-surface-raised">
        <CardHeader>
          <CardTitle className="font-bold flex items-center gap-2">
            <Database className="h-5 w-5 text-aubergine-600" /> Export Options
          </CardTitle>
          <CardDescription>Configure common settings for your export.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-64 space-y-2">
                <Label className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Export Format</Label>
                <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger className="font-bold uppercase tracking-widest text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                        <SelectItem value="json">JSON (Data Backup)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="w-full md:w-64 space-y-2">
                <Label className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Date Range (Optional)</Label>
                <div className="flex gap-2">
                  <Input type="date" className="text-xs" />
                  <Input type="date" className="text-xs" />
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exportModules.map((module) => (
          <Card
            key={module.id}
            className={`border-slate-200 dark:border-surface-raised hover:shadow-md transition-shadow ${
              module.sensitive ? "ring-1 ring-red-200 dark:ring-red-900/50" : ""
            }`}
          >
            <CardHeader className="p-5 pb-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-2 ${
                  module.sensitive
                    ? "bg-red-50 dark:bg-red-900/20 text-red-600"
                    : "bg-aubergine-50 dark:bg-aubergine-900/20 text-aubergine-600"
                }`}>
                    <module.icon className="h-5 w-5" />
                </div>
              <CardTitle className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                {module.title}
                {module.sensitive && (
                  <span className="text-[9px] font-bold uppercase tracking-widest bg-red-100 dark:bg-red-900/30 text-red-600 px-1.5 py-0.5 rounded">
                    Restricted
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <CardDescription className="text-xs font-medium text-slate-500 mb-4 h-10">
                {module.description}
              </CardDescription>
              <Button
                id={`export-btn-${module.id}`}
                onClick={() => requestExport(module.id)}
                className={`w-full font-bold text-[10px] uppercase tracking-widest h-9 ${
                  module.sensitive
                    ? "bg-red-700 hover:bg-red-800 text-white"
                    : "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                }`}
              >
                <Download className="h-3.5 w-3.5 mr-2" /> Download {format.toUpperCase()}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sensitive export confirmation dialog — replaces window.confirm() */}
      <Dialog open={pendingModuleId !== null} onOpenChange={(open) => { if (!open) setPendingModuleId(null); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              Export Restricted Data
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <span className="block">
                You are about to export <strong className="text-slate-900 dark:text-white">Case Summaries</strong>, which contains sensitive student safeguarding and protection records.
              </span>
              <span className="block">
                This action will be permanently recorded in the Audit Log.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-lg p-3 text-xs text-red-700 dark:text-red-400 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            Handle this export with strict confidentiality. Do not share or store on unprotected systems.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingModuleId(null)}>
              Cancel
            </Button>
            <Button
              id="confirm-sensitive-export-btn"
              variant="destructive"
              onClick={confirmSensitiveExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Confirm Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
