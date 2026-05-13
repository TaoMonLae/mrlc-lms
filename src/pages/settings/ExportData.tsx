import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  FileText, 
  Users, 
  BookOpen, 
  Calendar, 
  FileCheck, 
  Wallet,
  AlertCircle,
  Database
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const exportModules = [
  { id: "students", title: "Students", icon: Users, description: "All student profiles and enrollment data" },
  { id: "teachers", title: "Teachers", icon: Users, description: "Teacher profiles and assignments" },
  { id: "classes", title: "Classes", icon: BookOpen, description: "Class lists and structure" },
  { id: "attendance", title: "Attendance", icon: Calendar, description: "Daily attendance logs" },
  { id: "exams", title: "Exam Results", icon: FileCheck, description: "Academic assessment and exam results" },
  { id: "fees", title: "Fee Payments", icon: Wallet, description: "Payment history and fee status" },
  { id: "library", title: "Library Resources", icon: BookOpen, description: "Inventory of library materials" },
  { id: "cases", title: "Case Summaries", icon: AlertCircle, description: "Student safeguarding/discipline cases (Restricted)" },
];

export default function ExportDataPage() {
  const [format, setFormat] = useState("csv");

  const handleExport = (moduleId: string) => {
    if (moduleId === "cases") {
      if (!confirm("Are you sure you want to export sensitive Case Summaries? This action will be logged.")) {
        return;
      }
    }
    toast.success(`Exporting ${moduleId} as ${format.toUpperCase()}...`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight dark:text-white uppercase italic">Data Export Center</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium italic">Instantly download system data in CSV or JSON format for reporting and backup.</p>
      </div>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="font-bold flex items-center gap-2">
            <Database className="h-5 w-5 text-orange-600" /> Export Options
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
          <Card key={module.id} className="border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
            <CardHeader className="p-5 pb-3">
                <div className="h-10 w-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 mb-2">
                    <module.icon className="h-5 w-5" />
                </div>
              <CardTitle className="text-sm font-bold uppercase tracking-tight">{module.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <CardDescription className="text-xs font-medium text-slate-500 mb-4 h-10">
                {module.description}
              </CardDescription>
              <Button 
                onClick={() => handleExport(module.id)}
                className="w-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-[10px] uppercase tracking-widest h-9"
              >
                <Download className="h-3.5 w-3.5 mr-2" /> Download {format.toUpperCase()}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
