import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Calendar,
  Users,
  TrendingUp,
  Info,
  Download,
  ChevronRight,
  ChevronDown,
  BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../../lib/api";
import { toast } from "sonner";

const reportTemplates = [
  {
    id: "r1",
    title: "Class Attendance Monthly",
    description: "Detailed attendance breakdown per student for the current month.",
    icon: Calendar,
    type: "Attendance",
    permission: "view_assigned_reports",
    route: "/attendance/reports",
  },
  {
    id: "r2",
    title: "Exam Performance Analysis",
    description: "Statistical summary of recent exam scores with class average comparison.",
    icon: TrendingUp,
    type: "Academic",
    permission: "view_assigned_reports",
    route: "/reports/exams",
  },
  {
    id: "r3",
    title: "Student Progress Report",
    description: "Comprehensive progress tracking for individual students in your classes.",
    icon: FileText,
    type: "Comprehensive",
    permission: "view_assigned_reports",
    route: "/reports/students",
  },
];

type GeneratedReport = {
  id: string;
  reportType: string;
  reportName: string;
  status: string;
  fileUrl?: string;
  fileSize?: number;
  createdAt: string;
  generatedByName: string;
};

export default function TeacherReports() {
  const [showHistory, setShowHistory] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const navigate = useNavigate();

  // Fetch generated reports on component mount
  useEffect(() => {
    apiGet<GeneratedReport[]>('/api/reports/generations')
      .then((data) => {
        setGeneratedReports(data || []);
      })
      .catch(() => {
        setGeneratedReports([]);
      });
  }, []);

  const handleRequestAccess = () => {
    window.location.href = "mailto:admin@mrlc.edu?subject=Report Access Request&body=I would like to request access to restricted reports. Please review my profile.";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white uppercase tracking-tighter">Academic Reporting</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">Generate insights and reports for your assigned modules and students.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTemplates.map((template) => (
          <Card key={template.id} className="group border-slate-200 dark:border-surface-raised hover:border-aubergine-200 hover:shadow-lg transition-all duration-300">
            <CardHeader className="p-6">
              <div className="h-12 w-12 rounded-xl bg-aubergine-50 dark:bg-aubergine-900/20 flex items-center justify-center text-aubergine-600 mb-4 group-hover:scale-110 transition-transform">
                <template.icon className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="w-fit mb-2 font-bold text-[9px] uppercase tracking-widest border-slate-200 dark:border-surface-raised">
                {template.type}
              </Badge>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-aubergine-600 transition-colors uppercase tracking-tight">
                {template.title}
              </CardTitle>
              <CardDescription className="text-xs font-medium leading-relaxed mt-2 text-slate-500 dark:text-slate-300">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <Button
                id={`generate-report-${template.id}`}
                onClick={() => navigate(template.route)}
                className="w-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-[10px] uppercase tracking-widest h-10 shadow-md hover:bg-slate-800"
              >
                Configure & Generate
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-surface-raised pb-4">
            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-widest text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-aubergine-600" /> Recently Generated
            </h3>
            <Button
              variant="ghost"
              className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-aubergine-600 flex items-center gap-1"
              onClick={() => setShowHistory(!showHistory)}
            >
                {showHistory ? "Hide" : "View History"}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </Button>
        </div>

        {showHistory && (
          <div className="grid grid-cols-1 gap-4">
            {generatedReports.map((report) => (
                <div key={report.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-50 dark:bg-surface-raised flex items-center justify-center text-slate-400 border border-slate-100 dark:border-surface-raised">
                            <BarChart3 className="h-5 w-5" />
                        </div>
                        <div>
                            <h5 className="font-bold text-slate-800 dark:text-white uppercase text-xs">{report.reportName}</h5>
                            <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>{new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</span>
                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                <span>{report.reportType}</span>
                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                <span>by {report.generatedByName}</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 sm:mt-0 flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!report.fileUrl}
                          className="font-bold text-[10px] uppercase tracking-widest h-9 bg-white dark:bg-transparent border-slate-200 dark:border-surface-raised"
                          onClick={() => {
                            if (report.fileUrl) {
                              window.open(report.fileUrl, '_blank');
                            } else {
                              toast.info('Report file not available');
                            }
                          }}
                        >
                            <Download className="h-3.5 w-3.5 mr-2" /> Download
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-400 hover:text-aubergine-600"
                          title="View report details"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ))}
            {generatedReports.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                    No reports generated yet. Use the options above to create your first report.
                </div>
            )}
          </div>
        )}
      </div>

      <Card className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 overflow-hidden relative">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-aubergine-600/20 to-transparent pointer-events-none" />
        <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="space-y-4 max-w-lg">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 dark:bg-surface-indigo/10 rounded-full text-aubergine-400 font-bold text-[10px] uppercase tracking-widest">
                    <Info className="h-3 w-3" /> Security Policy Reminder
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight">Need Access to Sensitive Data?</h3>
                <p className="text-sm opacity-70 font-medium leading-relaxed">
                    Financial reports, detailed scholarship data, and sensitive safeguarding cases are restricted. 
                    If you require temporary access for a specific audit or case review, please contact the Principal.
                </p>
            </div>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground border-none font-bold text-[11px] uppercase tracking-widest px-8 h-12 shadow-xl shrink-0"
              onClick={handleRequestAccess}
            >
                Request Access Profile
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
