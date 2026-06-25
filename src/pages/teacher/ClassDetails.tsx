import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  UserCheck, 
  FileText, 
  ArrowLeft, 
  MessageSquare, 
  MoreHorizontal,
  Mail,
  Search,
  ChevronRight,
  Filter,
  Download
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiGet } from "../../lib/api";

interface ClassInfo {
  id: string; name: string; level: string; room: string; teacher: string;
  totalStudents: number; academicYear: string; status: string;
}
interface ClassStudent {
  id: string; name: string; studentId: string; attendance: string; lastExam: string; status: string;
}

export default function ClassDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [classInfo, setClassInfo] = useState<ClassInfo>({
    id: "", name: "", level: "", room: "",
    teacher: "", totalStudents: 0, academicYear: "", status: "",
  });
  const [students, setStudents] = useState<ClassStudent[]>([]);

  useEffect(() => {
    if (!id) return;
    apiGet<{ classInfo: ClassInfo; students: ClassStudent[] }>(`/api/teacher/classes/${id}`)
      .then((r) => {
        if (r) {
          setClassInfo(r.classInfo);
          setStudents(r.students);
        }
      })
      .catch(() => {});
  }, [id]);

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadRollCall = () => {
    const header = 'Name,Student ID,Status,Attendance,Last Exam\n';
    const rows = students
      .map(s => `"${s.name}",${s.studentId},${s.status},${s.attendance},${s.lastExam}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roll-call-${classInfo.name.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Roll call sheet downloaded!');
  };

  const handleStudentProfile = (student: typeof students[0]) => {
    toast.info(`Viewing profile for ${student.name}`, {
      description: 'Student profile pages are accessible via the Admin Students module.',
    });
  };

  const handleAddStudent = () => {
    navigate('/students/new');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-slate-500"
          onClick={() => navigate('/teacher/classes')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Classes
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-surface-raised">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{classInfo.name}</h1>
            <Badge className="bg-aubergine-600 text-white border-none font-bold text-[10px] uppercase tracking-widest px-2 py-0.5">
              {classInfo.level}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-500 dark:text-slate-300 font-bold text-[11px] uppercase tracking-wider">
            <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {classInfo.totalStudents} Students</div>
            <div className="flex items-center gap-1.5"><ChevronRight className="h-3.5 w-3.5" /> {classInfo.room}</div>
            <div className="flex items-center gap-1.5"><ChevronRight className="h-3.5 w-3.5" /> {classInfo.academicYear}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            id="group-message-btn"
            variant="outline"
            disabled
            title="Coming soon"
            className="h-10 px-4 font-bold text-[11px] uppercase tracking-widest border-slate-200 dark:border-surface-raised opacity-50 cursor-not-allowed"
          >
            <MessageSquare className="h-4 w-4 mr-2" /> Group Message
          </Button>
          <Button
            id="download-roll-call-btn"
            className="h-10 px-6 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-[11px] uppercase tracking-widest shadow-lg"
            onClick={handleDownloadRollCall}
          >
            <Download className="h-4 w-4 mr-2" /> Download Roll Call
          </Button>
        </div>
      </div>

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="bg-slate-100/50 dark:bg-surface-indigo/50 p-1 border border-slate-200 dark:border-surface-raised h-12 w-full max-w-2xl justify-start">
          <TabsTrigger value="students" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm px-6 h-full font-bold text-[11px] uppercase tracking-widest text-slate-500 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
            <Users className="h-4 w-4 mr-2" /> Students
          </TabsTrigger>
          <TabsTrigger value="attendance" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm px-6 h-full font-bold text-[11px] uppercase tracking-widest text-slate-500 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
            <UserCheck className="h-4 w-4 mr-2" /> Attendance Summary
          </TabsTrigger>
          <TabsTrigger value="exams" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm px-6 h-full font-bold text-[11px] uppercase tracking-widest text-slate-500 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
            <FileText className="h-4 w-4 mr-2" /> Exam History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search students..." 
                className="pl-10 h-11 bg-white dark:bg-canvas border-slate-200 dark:border-surface-raised font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                id="class-details-filter-btn"
                variant="outline"
                size="icon"
                disabled
                title="Coming soon"
                className="h-11 w-11 border-slate-200 dark:border-surface-raised opacity-50 cursor-not-allowed"
              >
                <Filter className="h-4 w-4 text-slate-500" />
              </Button>
              <Button
                id="class-details-add-student-btn"
                size="sm"
                className="h-11 px-5 font-bold text-[11px] uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleAddStudent}
              >
                Add Student
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="group border-slate-200 dark:border-surface-raised overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="p-5 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-white dark:border-surface-raised shadow-sm">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} />
                        <AvatarFallback>{student.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-aubergine-600 transition-colors">{student.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student.studentId}</p>
                      </div>
                    </div>
                    <Badge variant={student.status === 'ACTIVE' ? 'default' : 'secondary'} className={`font-bold text-[9px] uppercase tracking-tighter ${student.status === 'ACTIVE' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                      {student.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 border-t border-slate-100 dark:border-surface-raised">
                    <div className="p-4 border-r border-slate-100 dark:border-surface-raised text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Attendance</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200">{student.attendance}</p>
                    </div>
                    <div className="p-4 text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Exam</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200">{student.lastExam}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-surface-raised/40 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 font-bold text-[10px] uppercase tracking-widest h-8 border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo"
                      onClick={() => handleStudentProfile(student)}
                    >
                      Profile
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled
                      className="h-8 w-8 text-slate-400 opacity-50 cursor-not-allowed"
                      title="Coming soon"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="mt-8">
           <Card className="border-slate-200 dark:border-surface-raised">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Monthly Attendance Tracking</CardTitle>
              <CardDescription>Average monthly attendance rates for this class.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { month: "January", rate: 94, students: 24 },
                  { month: "February", rate: 91, students: 23 },
                  { month: "March", rate: 88, students: 24 },
                  { month: "April", rate: 95, students: 24 },
                ].map((m) => (
                  <div key={m.month} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{m.month}</span>
                      <span className="font-bold text-aubergine-600">{m.rate}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-surface-raised rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: `${m.rate}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-medium text-slate-500">Average of {m.students} students per session.</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exams" className="mt-8">
          <div className="space-y-4">
            {[
              { title: "Mid-Term Assessment", date: "Mar 15, 2024", avg: "78%", status: "GRADED", result: "Above Average" },
              { title: "Practice Quiz #3", date: "Apr 02, 2024", avg: "82%", status: "GRADED", result: "Consistent" },
              { title: "Weekly Review #4", date: "May 01, 2024", avg: "0%", status: "PENDING", result: "Needs Grading" },
            ].map((exam, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl hover:border-aubergine-300 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-aubergine-100 dark:bg-aubergine-900/30 flex items-center justify-center text-aubergine-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white uppercase text-xs">{exam.title}</h5>
                    <p className="text-[10px] font-medium text-slate-500">{exam.date}</p>
                  </div>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Average Score</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{exam.avg}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={exam.status === 'GRADED' ? 'secondary' : 'outline'} className={`font-bold text-[9px] uppercase tracking-tight ${exam.status === 'GRADED' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200' : ''}`}>
                      {exam.status}
                    </Badge>
                    <p className="text-[10px] font-medium text-slate-500 mt-1">{exam.result}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-aubergine-600"
                    title="View exam details"
                    onClick={() => navigate('/teacher/exams')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
