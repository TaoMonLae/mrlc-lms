import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Plus, 
  Search, 
  ChevronRight, 
  Clock, 
  Users, 
  CheckCircle2, 
  GraduationCap,
  Calendar,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../../lib/api";

interface TeacherExam {
  id: string; title: string; class: string; date: string; duration: string;
  type: string; status: string; submissions: number; total: number; avg?: string;
}

export default function TeacherExams() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [teacherExams, setTeacherExams] = useState<TeacherExam[]>([]);

  useEffect(() => {
    apiGet<TeacherExam[]>('/api/teacher/exams')
      .then((r) => setTeacherExams(r ?? []))
      .catch(() => {
        if (import.meta.env.DEV) {
          setTeacherExams([
            { id: "e1", title: "Social Studies Mid-Term", class: "GED Social Studies", date: "May 15, 2024", duration: "120m", type: "Digital", status: "UPCOMING", submissions: 0, total: 24 },
            { id: "e2", title: "English Essay Review", class: "Pre-GED English", date: "May 01, 2024", duration: "60m", type: "Handwritten", status: "NEEDS_GRADING", submissions: 18, total: 18 },
            { id: "e3", title: "Weekly Math Quiz #4", class: "GED Math Prep", date: "Apr 28, 2024", duration: "30m", type: "Digital", status: "GRADED", submissions: 12, total: 12, avg: "85%" },
            { id: "e4", title: "History Final Project", class: "History of SEA", date: "Jun 10, 2024", duration: "N/A", type: "Submission", status: "DRAFT", submissions: 0, total: 22 },
          ]);
        }
      });
  }, []);

  const filteredExams = teacherExams.filter(e =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.class.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white uppercase tracking-tighter">Assessments & Exams</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Create, manage, and grade exams for your assigned classes.</p>
        </div>
        <Button
          id="create-assessment-btn"
          disabled
          title="Coming soon"
          className="h-11 px-6 bg-primary text-primary-foreground font-bold text-[11px] uppercase tracking-widest shadow-lg opacity-50 cursor-not-allowed"
        >
          <Plus className="h-4 w-4 mr-2" /> Create New Assessment
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-slate-100/50 dark:bg-surface-indigo/50 p-1 border border-slate-200 dark:border-surface-raised h-11 mb-6">
          <TabsTrigger value="all" className="px-6 h-full font-bold text-[10px] uppercase tracking-widest">All Assessments</TabsTrigger>
          <TabsTrigger value="active" className="px-6 h-full font-bold text-[10px] uppercase tracking-widest text-emerald-600">Active / Grading</TabsTrigger>
          <TabsTrigger value="drafts" className="px-6 h-full font-bold text-[10px] uppercase tracking-widest">Drafts</TabsTrigger>
        </TabsList>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Filter exams by title or class..." 
            className="pl-10 h-11 bg-white dark:bg-canvas border-slate-200 dark:border-surface-raised font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <TabsContent value="all" className="space-y-4">
          {filteredExams.map((exam) => (
            <Card key={exam.id} className="group overflow-hidden border-slate-200 dark:border-surface-raised hover:border-aubergine-300 transition-all duration-200">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row lg:items-center">
                  <div className="p-5 lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-surface-raised">
                    <div className="flex items-center gap-3 mb-2">
                        <Badge className={`${
                            exam.status === 'GRADED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                            exam.status === 'NEEDS_GRADING' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                            exam.status === 'DRAFT' ? 'bg-slate-500/10 text-slate-500 border-slate-500/20' :
                            'bg-blue-500/10 text-blue-600 border-blue-500/20'
                        } font-bold text-[9px] uppercase tracking-tight py-0.5 px-2`}>
                            {exam.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{exam.type}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-aubergine-600 transition-colors uppercase tracking-tight">{exam.title}</h3>
                    <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">{exam.class}</p>
                  </div>

                  <div className="p-5 lg:w-1/4 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-surface-raised flex items-center justify-between lg:justify-center gap-8">
                    <div className="text-center">
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1 justify-center">
                            <Calendar className="h-3 w-3" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Date</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{exam.date}</p>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1 justify-center">
                            <Clock className="h-3 w-3" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Time</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{exam.duration}</p>
                    </div>
                  </div>

                  <div className="p-5 lg:w-1/4 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-surface-raised flex items-center justify-between lg:justify-center gap-8">
                     <div className="text-center">
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1 justify-center">
                            <Users className="h-3 w-3" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Submissions</span>
                        </div>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                            {exam.submissions} / {exam.total}
                        </p>
                    </div>
                    {exam.avg && (
                         <div className="text-center">
                            <div className="flex items-center gap-1.5 text-slate-400 mb-1 justify-center">
                                <GraduationCap className="h-3 w-3" />
                                <span className="text-[9px] font-bold uppercase tracking-widest">Average</span>
                            </div>
                            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{exam.avg}</p>
                        </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex gap-2">
                    {exam.status === 'NEEDS_GRADING' ? (
                        <Button
                          disabled
                          title="Coming soon"
                          className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-[10px] uppercase tracking-widest h-10 shadow-md opacity-50 cursor-not-allowed"
                        >
                            Grade Now
                        </Button>
                    ) : (
                        <Button
                          variant="outline"
                          disabled
                          title="Coming soon"
                          className="w-full border-slate-200 dark:border-surface-raised font-bold text-[10px] uppercase tracking-widest h-10 opacity-50 cursor-not-allowed"
                        >
                            View Results
                        </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled
                      className="h-10 w-10 text-slate-400 transition-colors opacity-50 cursor-not-allowed"
                      title="Coming soon"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredExams.length === 0 && (
             <div className="py-12 border-2 border-dashed border-slate-200 dark:border-surface-raised rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-surface-raised flex items-center justify-center text-slate-400">
                    <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">No exams found</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">Try adjusting your search or filters.</p>
                </div>
                <Button variant="outline" onClick={() => setSearchTerm("")} className="font-bold text-[10px] uppercase tracking-widest h-9">
                    Clear Search
                </Button>
             </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
