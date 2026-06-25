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
  MoreHorizontal,
  Search,
  ChevronRight,
  Download,
  Filter,
  Mail,
  MessageSquare
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { apiGet } from "../../lib/api";

interface ClassInfo {
  id: string; name: string; level: string; room: string; teacher: string;
  totalStudents: number; academicYear: string;
}
interface ClassStudent {
  id: string; name: string; studentId: string; attendance: string; lastExam: string;
  profilePhotoUrl?: string | null;
}

interface AttendanceRow {
  studentId: string; name: string; code: string;
  total: number; present: number; absent: number; late: number; excused: number; rate: number;
}

interface AttendanceReportData {
  rows: AttendanceRow[]; classAverage: number; perfectCount: number; atRiskCount: number;
}

interface ExamData {
  id: string; title: string; date: string; avg?: string; status: string; submissions: number; total: number;
}

export default function ClassDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [classInfo, setClassInfo] = useState<ClassInfo>({
    id: "", name: "", level: "", room: "",
    teacher: "", totalStudents: 0, academicYear: "",
  });
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceReportData | null>(null);
  const [examsData, setExamsData] = useState<ExamData[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!id) return;
    setIsLoadingAttendance(true);
    apiGet<AttendanceReportData>(`/api/reports/attendance?classId=${id}`)
      .then((data) => {
        setAttendanceData(data);
      })
      .catch(() => {
        setAttendanceData(null);
      })
      .finally(() => {
        setIsLoadingAttendance(false);
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setIsLoadingExams(true);
    apiGet<any[]>(`/api/teacher/exams`)
      .then((allExams) => {
        // Filter exams to show only those for this specific class
        const classExams = allExams.filter(exam => exam.classId === id);
        const formattedExams = classExams.map(exam => ({
          id: exam.id,
          title: exam.title,
          date: new Date(exam.examDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          avg: exam.averageScore ? `${exam.averageScore}%` : 'N/A',
          status: exam.status,
          submissions: exam.submissionsCount || 0,
          total: exam.totalStudents || 0,
        }));
        setExamsData(formattedExams);
      })
      .catch(() => {
        setExamsData([]);
      })
      .finally(() => {
        setIsLoadingExams(false);
      });
  }, [id]);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.studentId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAttendance = attendanceFilter === "all" ||
                              (attendanceFilter === "high" && parseInt(s.attendance) >= 80) ||
                              (attendanceFilter === "medium" && parseInt(s.attendance) >= 60 && parseInt(s.attendance) < 80) ||
                              (attendanceFilter === "low" && parseInt(s.attendance) < 60);

    return matchesSearch && matchesAttendance;
  });

  const handleDownloadRollCall = () => {
    const header = 'Name,Student ID,Status,Attendance,Last Exam\n';
    const rows = students
      .map(s => `"${s.name}",${s.studentId},${s.attendance},${s.lastExam}`)
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
    navigate(`/students/${student.id}`);
  };

  const handleAddStudent = () => {
    navigate('/students/new');
  };

  const handleGroupMessage = () => {
    setShowMessageModal(true);
  };

  const handleStudentMessage = (studentId: string) => {
    setSelectedStudentId(studentId);
    setShowMessageModal(true);
  };

  const handleSendMessage = async (messageData: { subject: string; body: string; recipientIds: string[] }) => {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(messageData)
      });

      if (response.ok) {
        toast.success('Message sent successfully!');
        setShowMessageModal(false);
        setSelectedStudentId(null);
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      toast.error('Error sending message');
    }
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
            className="h-10 px-4 font-bold text-[11px] uppercase tracking-widest border-slate-200 dark:border-surface-raised"
            onClick={handleGroupMessage}
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
                className="h-11 w-11 border-slate-200 dark:border-surface-raised"
                onClick={() => setShowFilters(!showFilters)}
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

          {showFilters && (
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-surface-raised/40 rounded-lg border border-slate-200 dark:border-surface-raised">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Attendance:</label>
                <Select value={attendanceFilter} onValueChange={setAttendanceFilter}>
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="high">High (≥80%)</SelectItem>
                    <SelectItem value="medium">Medium (60-79%)</SelectItem>
                    <SelectItem value="low">Low (&lt;60%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-slate-400">
                Showing {filteredStudents.length} of {students.length} students
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="group border-slate-200 dark:border-surface-raised overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="p-5 flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-white dark:border-surface-raised shadow-sm">
                      <AvatarImage
                        src={student.profilePhotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`}
                      />
                      <AvatarFallback>{student.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-aubergine-600 transition-colors">{student.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student.studentId}</p>
                    </div>
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
                      className="h-8 w-8 text-slate-400 hover:text-aubergine-600"
                      title="Send message"
                      onClick={() => handleStudentMessage(student.id)}
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
              {isLoadingAttendance ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
                </div>
              ) : !attendanceData || attendanceData.rows.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No attendance records available for this class.
                </div>
              ) : (
                <div className="space-y-6">
                  {attendanceData.rows.map((student) => (
                    <div key={student.studentId} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{student.name}</span>
                        <span className="font-bold text-aubergine-600">{student.rate}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-surface-raised rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${student.rate}%` }}
                        />
                      </div>
                      <p className="text-[10px] font-medium text-slate-500">
                        {student.present} present / {student.total} total days
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exams" className="mt-8">
          {isLoadingExams ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
            </div>
          ) : examsData.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No exams available for this class.
            </div>
          ) : (
            <div className="space-y-4">
              {examsData.map((exam) => (
                <div key={exam.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl hover:border-aubergine-300 transition-colors">
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
                    <div className="text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Submissions</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{exam.submissions}/{exam.total}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={exam.status === 'GRADED' ? 'secondary' : 'outline'} className={`font-bold text-[9px] uppercase tracking-tight ${exam.status === 'GRADED' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200' : ''}`}>
                        {exam.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-aubergine-600"
                      title="View exam details"
                      onClick={() => navigate(`/exams/${exam.id}/results`)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-surface-indigo rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {selectedStudentId ? 'Send Message to Student' : 'Send Group Message'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block">Subject</label>
                <Input
                  placeholder="Message subject"
                  className="w-full"
                  id="message-subject"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block">Message</label>
                <textarea
                  placeholder="Type your message here..."
                  className="w-full min-h-[120px] p-3 border border-slate-200 dark:border-surface-raised rounded-lg bg-white dark:bg-surface-indigo focus:ring-2 focus:ring-aubergine-500 focus:outline-none resize-none"
                  id="message-body"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMessageModal(false);
                    setSelectedStudentId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-aubergine-600 hover:bg-aubergine-700 text-white"
                  onClick={() => {
                    const subject = (document.getElementById('message-subject') as HTMLInputElement)?.value || '';
                    const body = (document.getElementById('message-body') as HTMLTextAreaElement)?.value || '';

                    if (!subject || !body) {
                      toast.error('Please provide both subject and message');
                      return;
                    }

                    const recipientIds = selectedStudentId
                      ? [selectedStudentId]
                      : students.map(s => {
                          // For now, we'll use a simple approach - in reality you'd need to map student IDs to user IDs
                          return s.id; // This should be the userId in reality
                        });

                    handleSendMessage({ subject, body, recipientIds });
                  }}
                >
                  Send Message
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
